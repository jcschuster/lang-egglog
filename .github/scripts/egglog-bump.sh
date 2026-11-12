#!/usr/bin/env bash
# Moves the egglog pin to the newest stable egglog on crates.io, if it differs: in the
# package's package.json and flake.nix (tag v<version>), then `nix flake lock` and
# `pnpm generate`. Writes generate's report of added and removed keywords to the file
# given, and `version`, `old` and `generated` (ok or failed) to $GITHUB_OUTPUT; `version`
# stays empty when the pin is current. Runs in the devshell:
#
#     .github/scripts/egglog-bump.sh "$RUNNER_TEMP/keywords.txt"
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

report=$1
output=${GITHUB_OUTPUT:-/dev/null}
package=packages/codemirror-lang-egglog/package.json
old=$(jq -r .egglog.version "$package")

# crates.io refuses requests without a User-Agent.
new=$(curl -fsS -A "lang-egglog (https://github.com/jcschuster/lang-egglog)" \
  https://crates.io/api/v1/crates/egglog | jq -r .crate.max_stable_version)

if [ "$new" = "$old" ]; then
  echo "egglog $new, the newest on crates.io, is pinned"
  echo "version=" >> "$output"
  exit 0
fi
if ! git ls-remote --exit-code --tags https://github.com/egraphs-good/egglog "refs/tags/v$new" >/dev/null; then
  echo "::error::egglog $new is on crates.io, but GitHub has no tag v$new" >&2
  exit 1
fi

jq --arg version "$new" '.egglog.version = $version' "$package" > "$package.new"
mv "$package.new" "$package"
sed -i "s|github:egraphs-good/egglog/v$old\"|github:egraphs-good/egglog/v$new\"|; s|version = \"$old\";|version = \"$new\";|" flake.nix
nix flake lock

if pnpm generate > "$report" 2>&1; then generated=ok; else generated=failed; fi
{
  echo "version=$new"
  echo "old=$old"
  echo "generated=$generated"
} >> "$output"
