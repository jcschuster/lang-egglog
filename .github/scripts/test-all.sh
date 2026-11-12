#!/usr/bin/env bash
# Runs every check in the repository, keeps going past a failure, and ends with one
# `PASS name` or `FAIL name` line per check. Exits non-zero if any failed. Expects the
# devshell (`nix develop`):
#
#     .github/scripts/test-all.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

results=()
failed=0

check() {
  local name=$1
  shift
  echo "== $name"
  if "$@"; then
    results+=("PASS $name")
  else
    results+=("FAIL $name")
    failed=1
  fi
}

check "LICENSE and NOTICE copies match" bash -c \
  'cmp LICENSE packages/codemirror-lang-egglog/LICENSE && cmp NOTICE packages/codemirror-lang-egglog/NOTICE'
check "pnpm install" pnpm install --frozen-lockfile
check "generated files are current" bash -c \
  'before=$(mktemp -d) && cp -r spec packages/codemirror-lang-egglog/src "$before" && pnpm generate &&
   diff -r "$before/spec" spec && diff -r "$before/src" packages/codemirror-lang-egglog/src'
check "pnpm build" pnpm build
check "pnpm test" pnpm test
check "corpus" pnpm corpus

echo
printf '%s\n' "${results[@]}"
exit "$failed"
