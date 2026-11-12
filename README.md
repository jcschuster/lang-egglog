# lang-egglog

Editor language support for [egglog](https://github.com/egraphs-good/egglog):
[`codemirror-lang-egglog`](packages/codemirror-lang-egglog), a CodeMirror 6 language. Its
keyword tables are generated from egglog's parser source; see the package's README for the
egglog release, what is generated and what is hand-written. Changes are in
[CHANGELOG.md](CHANGELOG.md).

## Working on it

The devshell (`nix develop`, or direnv) has every tool, including `egglog` at the pinned
release. Then:

```sh
pnpm install
pnpm generate                  # gen/keywords.mjs (downloads parse.rs), then gen/grammar.mjs
.github/scripts/test-all.sh    # every check CI runs
```

`gen/keywords.mjs` writes `spec/keywords.json` and `spec/SOURCE`; `gen/grammar.mjs` writes
the keyword rules into the grammar and `src/keywords.ts`. All of it is committed, and
`pnpm generate` leaves a clean tree. `pnpm corpus` downloads egglog's `tests/` to
`corpus/` and parses every file that `egglog` accepts. `fixtures/` holds egglog programs
that the tests parse and highlight.

The egglog release is named twice: in `packages/codemirror-lang-egglog/package.json`
under `egglog.version`, and as the `egglog` input of `flake.nix` (tag `v<version>`).

## Releasing

A release is a merged pull request labelled `release`: `release.yml` then publishes the
package to npm and creates the GitHub release `vX.Y.Z`, using the version's CHANGELOG
section as release notes. To make one, run `.github/scripts/version.sh X.Y.Z`, add a
`## [X.Y.Z] - date` section to `CHANGELOG.md`, open a pull request and label it `release`.

`egglog.yml` checks every Sunday whether crates.io has a newer stable egglog, and if so opens
a pull request that moves the pin, regenerates, and lists the
keywords added and removed. The repository secret `EGGLOG_PR_TOKEN`, a fine-grained token
with contents and pull-request write access, lets its pull requests run CI.

## Licence

MIT; see [LICENSE](LICENSE). The keyword tables are derived from egglog (MIT, egraphs-good);
see [NOTICE](NOTICE).
