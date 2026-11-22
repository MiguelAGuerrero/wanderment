#!/usr/bin/env bash
# The definition of done, quietly: full logs go to .polish/logs/, a short summary to stdout.
# A full run that passes writes .polish/verified = the tree hash it verified; scripts/polish/land.sh
# and the git guard hook only let that exact tree be pushed.
#
#   scripts/polish/verify.sh                     # full: integrity, unit, types, lint, roadmap, build, e2e
#   scripts/polish/verify.sh --quick             # everything except build + e2e (no stamp)
#   scripts/polish/verify.sh --repeat-changed=5  # full, plus changed/new e2e specs ×5 with retries off
#
# Docs-only fast path: if everything that differs from the last fully verified tree is
# documentation (docs/, .claude/skills/, .claude/agents/, *.md — never settings, scripts or code),
# only test-integrity and the roadmap lint run, and the tree is stamped. CI still runs everything.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/polish/lib.sh

mode=full
repeat=0
for arg in "$@"; do
  case $arg in
    --quick) mode=quick ;;
    --repeat-changed) repeat=5 ;;
    --repeat-changed=*) repeat=${arg#*=} ;;
    *) die "unknown option $arg" ;;
  esac
done

logs=.polish/logs
mkdir -p "$logs"
rm -f .polish/verified
before=$(tree_hash)
failed=0

# Paths that may change without code checks: documentation only.
docs_only_since() {
  local base=$1 f
  git cat-file -e "$base^{tree}" 2>/dev/null || return 1
  local changed
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
if [ "$mode" = full ] && [ -f .polish/verified-full ] && docs_only_since "$(cat .polish/verified-full)"; then
  mode=docs
fi

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

step test-integrity scripts/polish/check-tests.sh
if [ "$mode" = docs ]; then
  echo "· docs-only change since the last full verify: code checks skipped (CI runs everything)"
else
  step guard node scripts/polish/test-guard.mjs
  step unit npx vitest run --reporter=dot
  step typecheck npx tsc --noEmit
  step lint npx eslint .
fi
step roadmap node scripts/polish/roadmap-lint.mjs

if [ "$mode" = full ] && [ $failed = 0 ]; then
  step build npm run build:web
  # Its own port: never reuse (or race) a server a scout or auditor started on the default one.
  export E2E_PORT=${E2E_PORT:-4199}
  [ $failed = 0 ] && step e2e env E2E_PREBUILT=1 npx playwright test --reporter=dot
  if [ $failed = 0 ] && [ "$repeat" -gt 0 ]; then
    specs=$(changed_specs | tr '\n' ' ')
    if [ -n "$specs" ]; then
      # Retries off: a test that only passes on a rerun is flaky, and that's a finding.
      # shellcheck disable=SC2086
      step "e2e-repeat-x$repeat" env E2E_PREBUILT=1 npx playwright test $specs --repeat-each="$repeat" --retries=0 --reporter=dot
    else
      echo "· e2e-repeat: no changed specs"
    fi
  fi
fi

if [ $failed = 1 ]; then
  echo "RESULT: FAIL"
  exit 1
fi
if [ "$mode" = full ] || [ "$mode" = docs ]; then
  after=$(tree_hash)
  [ "$before" = "$after" ] || die "the tree changed while verifying — run again"
  echo "$after" >.polish/verified
  if [ "$mode" = full ]; then
    echo "$after" >.polish/verified-full
    echo "RESULT: PASS — verified tree ${after:0:12}"
  else
    echo "RESULT: PASS (docs only) — verified tree ${after:0:12}"
  fi
else
  echo "RESULT: PASS (quick — no stamp; run the full verify before landing)"
fi
