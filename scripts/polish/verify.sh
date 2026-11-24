#!/usr/bin/env bash
# The definition of done, quietly: full logs go to .polish/logs/, a short summary to stdout.
# A passing run writes .polish/verified = the tree hash it verified; scripts/polish/land.sh and the
# git guard hook only let that exact tree be pushed. CI then runs the whole e2e suite on main.
#
#   scripts/polish/verify.sh          # default (fast): unit, types, lint, build, changed + smoke e2e,
#                                     # then the changed specs again at CI speed (E2E_SLOW=4, no retries)
#   scripts/polish/verify.sh --full   # everything: the whole e2e suite (stored data, storage, sync)
#   scripts/polish/verify.sh --full --repeat-changed=5   # + changed specs ×5, retries off (flake hunt)
#   scripts/polish/verify.sh --quick  # no build, no e2e, no stamp
#
# Docs-only changes since the last stamp (docs/, .claude/skills|agents/, *.md) skip the code checks.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/polish/lib.sh

mode=fast
repeat=0
for arg in "$@"; do
  case $arg in
    --quick) mode=quick ;;
    --full) mode=full ;;
    --repeat-changed) repeat=5 ;;
    --repeat-changed=*) repeat=${arg#*=} ;;
    *) die "unknown option $arg" ;;
  esac
done
[ "$repeat" -gt 0 ] && [ "$mode" = fast ] && mode=full

# A few specs that cover the core loop (log, persist, Home), always run in fast mode.
SMOKE="e2e/capture.spec.ts e2e/storage.spec.ts e2e/home-graph.spec.ts"

logs=.polish/logs
mkdir -p "$logs"
last=$(cat .polish/verified 2>/dev/null || true)
rm -f .polish/verified
before=$(tree_hash)
failed=0

docs_only_since() {
  local base=$1 f changed
  [ -n "$base" ] && git cat-file -e "$base^{tree}" 2>/dev/null || return 1
  changed=$(git diff --name-only "$base" "$before") || return 1
  [ -n "$changed" ] || return 1
  while read -r f; do
    case $f in
      .claude/settings*|scripts/*|src/*|e2e/*|*.ts|*.tsx|*.js|*.mjs|*.json|*.yml|*.yaml) return 1 ;;
      docs/*|.claude/skills/*|.claude/agents/*|*.md) ;;
      *) return 1 ;;
    esac
  done <<<"$changed"
}
if [ "$mode" != quick ] && docs_only_since "$last"; then mode=docs; fi

step() {
  local name=$1
  shift
  local t0=$SECONDS
  if "$@" >"$logs/$name.log" 2>&1; then
    echo "✓ $name ($((SECONDS - t0))s)"
  else
    echo "✗ $name ($((SECONDS - t0))s) — full log: $logs/$name.log"
    tail -n 20 "$logs/$name.log" | sed 's/^/    /'
    failed=1
  fi
}

if [ "$mode" = docs ]; then
  echo "· docs-only change since the last verify: code checks skipped"
else
  step checks bash -c 'node scripts/polish/test-guard.mjs && npx vitest run --reporter=dot && npx tsc --noEmit && npx eslint .'
fi
step roadmap node scripts/polish/roadmap-lint.mjs

if { [ "$mode" = fast ] || [ "$mode" = full ]; } && [ $failed = 0 ]; then
  step build npm run build:web
  # Its own port: never reuse (or race) a server another agent started on the default one.
  export E2E_PORT=${E2E_PORT:-4199}
  if [ $failed = 0 ]; then
    if [ "$mode" = full ]; then
      step e2e env E2E_PREBUILT=1 npx playwright test --reporter=dot
    else
      specs=$({ changed_specs; tr ' ' '\n' <<<"$SMOKE"; } | sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done | tr '\n' ' ')
      # shellcheck disable=SC2086
      step e2e-changed env E2E_PREBUILT=1 npx playwright test $specs --reporter=dot
    fi
  fi
  # CI-speed pass (owner, 2026-11-24: "proper CI pre-gates"): the changed specs again with the page's
  # CPU throttled to a CI runner's speed or slower (e2e/fixtures.ts, E2E_SLOW), two workers and no
  # retries — timing races that pass on a fast machine fail here, before the push, instead of turning
  # the deploy red. E2E_CI_SLOW=0 skips it (not for landings).
  if [ $failed = 0 ] && [ "${E2E_CI_SLOW:-4}" != 0 ]; then
    specs=$(changed_specs | tr '\n' ' ')
    # shellcheck disable=SC2086
    [ -n "$specs" ] && step e2e-ci-like env E2E_PREBUILT=1 E2E_SLOW="${E2E_CI_SLOW:-4}" npx playwright test $specs --workers=2 --retries=0 --reporter=dot
  fi
  if [ $failed = 0 ] && [ "$repeat" -gt 0 ]; then
    specs=$(changed_specs | tr '\n' ' ')
    # shellcheck disable=SC2086
    [ -n "$specs" ] && step "e2e-repeat-x$repeat" env E2E_PREBUILT=1 npx playwright test $specs --repeat-each="$repeat" --retries=0 --reporter=dot
  fi
fi

if [ $failed = 1 ]; then
  echo "RESULT: FAIL"
  exit 1
fi
if [ "$mode" = quick ]; then
  echo "RESULT: PASS (quick — no stamp)"
  exit 0
fi
after=$(tree_hash)
[ "$before" = "$after" ] || die "the tree changed while verifying — run again"
echo "$after" >.polish/verified
echo "RESULT: PASS ($mode) — verified tree ${after:0:12}"
