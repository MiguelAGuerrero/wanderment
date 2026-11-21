#!/usr/bin/env bash
# Starts (or resumes) a /polish batch: .polish/current/ holds the batch's shared files, so the
# orchestrator, scouts, builders and auditor exchange files instead of paraphrases, and a fresh
# session can resume after compaction.
#
#   scripts/polish/start-batch.sh P-01 P-02
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
dir=.polish/current
if [ -d "$dir" ]; then
  echo "A batch is in progress — resume from $dir/batch.md:"
  sed -n '1,40p' "$dir/batch.md"
  exit 3
fi
[ $# -gt 0 ] || { echo "usage: $0 P-01 [P-02 …]" >&2; exit 64; }
mkdir -p "$dir"
base=$(git rev-parse HEAD)
cat >"$dir/batch.md" <<MD
# Batch — $(date +%Y-%m-%d)

Base commit: $base   (export POLISH_BASE=$base for the scripts)
Items: $*

## Phase status
- [ ] 0 orient · [ ] 1 inbox · [ ] 2 choose · [ ] 3 scout · [ ] 4 contract/owner · [ ] 5 build
- [ ] 6 audit + verify findings · [ ] 7 land · [ ] 8 report

## Decisions (append; builders read this)

## Failed approaches (append; so nobody repeats them)

## Audit tally
reported: · reproduced: · fixed: · deferred:
MD
for id in "$@"; do
  mkdir -p "$dir/$id"
  cat >"$dir/$id/contract.md" <<MD
# $id — contract (agreed before building; the auditor grades against this)

Item (verbatim from the roadmap):

Approach:

Done when (each line becomes a test or a recorded check):
-

Must handle (edge, empty, error, a11y states):
-

Non-goals (don't touch):
-

Expected values come from: (the roadmap item / DESIGN.md / owner's answer — never from running the code)
MD
  : >"$dir/$id/scout.md"
done
: >"$dir/decisions.md"
echo "✓ batch started in $dir (base ${base:0:12}) — export POLISH_BASE=$base"
