#!/usr/bin/env bash
# Prints the working tree's hash. The orchestrator records it before read-only subagents
# (scouts, auditor) run and compares after: any difference means one of them wrote files.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
source scripts/polish/lib.sh
tree_hash
