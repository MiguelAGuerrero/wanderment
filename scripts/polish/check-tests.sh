#!/usr/bin/env bash
# Flags ways tests can be weakened since the batch base (POLISH_BASE or the merge-base with
# origin/main). Prints a report for the orchestrator and auditor; every flagged line needs a
# justification. Fails outright on focused tests (.only) or a removed forbidOnly.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/polish/lib.sh
base=$(base_ref)
paths=('src/**/*.test.ts' 'e2e/**' 'playwright.config.ts' 'vitest.config.ts')

changed=$(git diff --name-status "$base" -- "${paths[@]}")
new=$(git ls-files --others --exclude-standard -- "${paths[@]}")
added=$( { git diff -U0 "$base" -- "${paths[@]}" | grep '^+[^+]'; for f in $new; do sed 's/^/+/' "$f"; done; } || true)
removed=$(git diff -U0 "$base" -- "${paths[@]}" | grep '^-[^-]' || true)

risky='\.(only|skip|fixme|fail)\(|test\.(slow|setTimeout)|retries|waitForTimeout|timeout *:|setTimeout\('
flags=$(echo "$added" | grep -E "$risky" || true)
removed_tests=$(echo "$removed" | grep -cE "^-\s*(it|test)(\.\w+)?\(" || true)
modified_existing=$(echo "$changed" | awk '$1 ~ /^(M|D|R)/ {print "  " $0}')

echo "Test integrity since ${base:0:12}"
if [ -n "$modified_existing" ]; then
  echo "Existing test files changed or deleted (each needs a reason in the batch notes):"
  echo "$modified_existing"
fi
[ "${removed_tests:-0}" -gt 0 ] && echo "Removed test cases: $removed_tests (each needs a reason)"
if [ -n "$flags" ]; then
  echo "Added lines that can weaken tests (each needs a reason):"
  echo "$flags" | sed 's/^/  /'
fi
[ -z "$modified_existing$flags" ] && [ "${removed_tests:-0}" = 0 ] && echo "Nothing flagged."

if echo "$added" | grep -qE '\.only\('; then
  echo "✗ focused test (.only) added"
  exit 1
fi
if echo "$removed" | grep -q 'forbidOnly'; then
  echo "✗ forbidOnly removed from the Playwright config"
  exit 1
fi
exit 0
