#!/usr/bin/env bash
# Lands a verified batch on main: commits anything uncommitted (with the given message file),
# checks that HEAD is exactly the tree verify.sh passed, pushes, and archives the batch folder.
#
#   scripts/polish/land.sh [commit-message-file]
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/polish/lib.sh

[ "$(git branch --show-current)" = main ] || die "not on main"
msg=${1:-}
if [ -n "$(git status --porcelain)" ]; then
  [ -n "$msg" ] && [ -f "$msg" ] || die "uncommitted changes and no commit message file given"
  git add -A
  git commit -q -F "$msg"
fi

stamp=$(cat .polish/verified 2>/dev/null || true)
[ "$stamp" = "$(git rev-parse 'HEAD^{tree}')" ] || die "HEAD is not the tree verify.sh passed — run scripts/polish/verify.sh first"

git fetch -q origin main
git merge-base --is-ancestor origin/main HEAD || die "origin/main has commits this branch lacks — merge them, verify again, then land"

for wait in 0 2 4 8 16; do
  sleep "$wait"
  if git push -q origin main; then
    echo "✓ pushed $(git rev-parse --short HEAD) to main — the Deploy web workflow now runs the full suite before publishing"
    if [ -d .polish/current ]; then
      dest=".polish/archive/$(date +%Y-%m-%d-%H%M)"
      mkdir -p .polish/archive
      mv .polish/current "$dest"
      echo "· batch notes archived to $dest"
    fi
    exit 0
  fi
  echo "· push failed, retrying"
done
die "push failed after retries"
