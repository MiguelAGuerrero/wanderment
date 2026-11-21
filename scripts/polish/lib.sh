# Shared helpers for the /polish scripts. Source from the repo root.

die() { echo "✗ $*" >&2; exit 1; }

# Hash of the working tree as it would be committed (tracked + untracked, minus ignored files),
# without touching the real index. Equals `git rev-parse HEAD^{tree}` when the tree is clean.
tree_hash() {
  local idx
  idx="$(git rev-parse --git-dir)/polish-index.tmp"
  cp "$(git rev-parse --git-dir)/index" "$idx" 2>/dev/null || rm -f "$idx"
  GIT_INDEX_FILE="$idx" git add -A >/dev/null 2>&1
  GIT_INDEX_FILE="$idx" git write-tree
  rm -f "$idx"
}

# What a batch is compared against: POLISH_BASE, else where this branch left origin/main.
base_ref() {
  if [ -n "${POLISH_BASE:-}" ] && git cat-file -e "${POLISH_BASE}^{commit}" 2>/dev/null; then
    echo "$POLISH_BASE"
  else
    git merge-base origin/main HEAD 2>/dev/null || git rev-parse HEAD
  fi
}

# e2e spec files added or changed since the base (that still exist).
changed_specs() {
  local base
  base="$(base_ref)"
  { git diff --name-only "$base" -- 'e2e/*.spec.ts'; git ls-files --others --exclude-standard -- 'e2e/*.spec.ts'; } |
    sort -u | while read -r f; do [ -f "$f" ] && echo "$f"; done
}
