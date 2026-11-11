# PLAN — lang-egglog

CodeMirror 6 language package (`codemirror-lang-egglog`) with a Lezer grammar for egglog. The s-expression grammar is hand-written; the keyword tables are generated from egglog's parser source. Written 2026-11-11. Status: nothing started.

## Rules for the agent

- Work through the phases in order. Tick a box only when its check passes.
- `[verify]` = from memory or unchecked. Confirm against the named source first; correct this file if it is wrong.
- `[ask]` = decision for Johannes. Stop and ask; do not pick silently.
- Environment: NixOS, fish, direnv. Use only tools from the flake devshell; no global installs; `pnpm`, not `npm`/`npx`.
- Do not publish to npm, push tags, or open upstream issues/PRs without asking.
- Generated files are committed. Every hand-written part is listed in the package README.
- README and NOTICE claim no conformance beyond what the tests show.

## Conventions shared by the five lang-* repos

- Layout as in lang-tptp: `spec/` (inputs + `SOURCE` with URL, version, sha256, date), `gen/` (Node ESM scripts), `fixtures/`, `packages/codemirror-lang-egglog/`.
- Exports: `egglog()` → `LanguageSupport`, `egglogLanguage` → `LRLanguage`.
- CamelCase node names; shared names where the concept exists: `LineComment`, `String`, `Number`. Keep paren, comment and string node names identical to lang-smtlib.
- Root scripts: `pnpm generate`, `pnpm build`, `pnpm test`. `pnpm generate` is idempotent (`git diff --exit-code` afterwards, checked in CI).

## Facts

egglog has no grammar file; the parser is hand-written Rust. Read from `src/ast/parse.rs`, egglog 3.0.0 (docs.rs, 2026-11-11):

Lexing (`SexpParser`, `sexp`):

- Brackets: `(` and `)` only.
- Comment: `;` to end of line.
- String: `"…"` with escapes `\n`, `\t`, `\\`, `\"`; any other escape is an error.
- Every other token runs until whitespace, `;`, `(` or `)`.
- Token classification, in this order: `true`/`false` → bool; parses as `i64` → int; `NaN`, `inf`, `-inf` → float; parses as finite `f64` → float; otherwise atom.
- `()` is the unit literal. `_` is a wildcard. Option keys are atoms starting with `:`.

Head keywords (`parse_command`, `parse_action`, `parse_schedule`, `parse_fact`):

- Commands: `sort`, `datatype`, `datatype*`, `function`, `constructor`, `relation`, `ruleset`, `unstable-combined-ruleset`, `rule`, `rewrite`, `birewrite`, `run`, `run-schedule`, `extract`, `check`, `prove`, `prove-exists`, `push`, `pop`, `print-stats`, `print-function`, `print-size`, `input`, `output`, `include`, `fail`.
- Actions: `let`, `set`, `delete`, `subsume`, `union`, `panic`.
- Schedules: `saturate`, `seq`, `repeat`, `run`.
- Facts: `=`.
- Options: `:merge`, `:no-merge`, `:unextractable`, `:cost`, `:ruleset`, `:name`, `:naive`, `:unsafe-seminaive`, `:no-decomp`, `:subsume`, `:when`, `:until`, `:file`, `:mode`.
- Internal options: `:internal-uf`, `:internal-proof-func`, `:internal-proof-names`, `:internal-container-rebuild`, `:internal-hidden`, `:internal-let`, `:internal-term-constructor`, `:internal-include-subsumed`.
- A top-level form with any other head is an action, and failing that an expression. The parser also accepts user-registered command, action and expression macros, which cannot be known statically.

Unchecked:

- `[ask]` Which egglog version must the package match? Pin to the one egglog_elixir bundles. docs.rs "latest" showed 2.0.0 in a search snippet and 3.0.0 on the page itself the same day, so the language is moving.
- `[verify]` Exact strings accepted by Rust's `i64` and `f64` `FromStr` (leading `+`, exponents, `.5`, `5.`); mirror them in the number tokens.
- `[verify]` Built-in sorts and primitives (`i64`, `f64`, `String`, `bool`, `Unit`, containers, arithmetic) live outside `parse.rs`; find them in the egglog sort implementations.
- `[verify]` egglog licence (for NOTICE) and whether nixpkgs has an `egglog` package; otherwise build the pinned version with cargo in the devshell.
- Third-party reference only: hatoo/tree-sitter-egglog (WIP).

## Phase 0 — Bootstrap

- [ ] Read the template copy under `packages/` (from lang-tptp) and the root files; note its build, test and generate commands.
- [ ] Rename everything: `git grep -il tptp` must end empty apart from deliberate credit lines.
- [ ] Remove TPTP-specific parts: mix-based `gen/`, nightly `tptp.yml`, `tools/differential`.
- [ ] `flake.nix` devshell: `nodejs`, `pnpm`, an `egglog` binary at the pinned version. Commit `flake.lock`.
- [ ] `pnpm install && pnpm build && pnpm test` pass on a stub grammar.

## Phase 1 — Keyword tables (`gen/keywords.mjs` → `spec/keywords.json`)

- [ ] Script downloads `src/ast/parse.rs` for the pinned version (do not commit the Rust file) and records URL, version and sha256 in `spec/SOURCE`.
- [ ] Extract string literals of the match arms per function into `commands`, `actions`, `schedules`, `facts`, and the `":…"` option literals into `options` / `internalOptions`.
- [ ] Self-check in the script: at 3.0.0 the result equals the lists under Facts; fail loudly on an empty or shrunken category.
- [ ] Optional: `builtins` category from the sort implementations (see `[verify]` above).

## Phase 2 — Grammar (`src/egglog.grammar`)

- [ ] S-expression core, hand-written: `List`, `Unit`, `String`, `LineComment`, `Bool`, `Integer`, `Float`, `Option` (`:`-atoms), `Wildcard`, `Atom`.
- [ ] Head position: first atom of a list is `Head`. Specialise it from `spec/keywords.json` into `CommandKeyword`, `ActionKeyword`, `ScheduleKeyword`; unknown heads stay `Callee`. `run` is both command and schedule.
- [ ] The keyword `@specialize` block is generated into the grammar by `pnpm generate`; the rest of the file is hand-written and marked as such.
- [ ] Keywords must not be specialised outside head position (test `(let rule 1)`).
- [ ] Optional level 2: named nodes per top-level command (`Rule`, `Rewrite`, `Datatype`, …) for folding and outline. Must not introduce error nodes for user-defined commands.

## Phase 3 — CodeMirror package

- [ ] `styleTags` for all nodes; distinct tags for command, action and schedule keywords, options, callee.
- [ ] `languageData`: `commentTokens: {line: ";"}`, `closeBrackets: ["(", '"']`.
- [ ] Lisp-style indentation (`indentNodeProp`) and list folding (`foldNodeProp`).
- [ ] Completion source from `spec/keywords.json` (commands at top level, options after `:`).
- [ ] `[ask]` npm name `codemirror-lang-egglog` (check `pnpm view codemirror-lang-egglog`).
- [ ] Package README: pinned egglog version, what is generated, list of hand-written files.

## Phase 4 — Tests

- [ ] `test/*.txt` in Lezer `fileTests` format: each lexing fact, each keyword category, number edge cases, unknown heads.
- [ ] Corpus: egglog's own `tests/*.egg` at the pinned version, downloaded by a script, not committed.
- [ ] Script: every corpus file the `egglog` binary parses must parse in Lezer without error nodes. `[verify]` a parse-only or cheap invocation of the binary.
- [ ] Highlight coverage test: every named node has a tag or is listed as intentionally untagged.

## Phase 5 — CI and release

- [ ] `.github/scripts/test-all.sh` runs generate (with diff check), build, tests, corpus check; CI runs it inside `nix develop`.
- [ ] Scheduled workflow: detect a new egglog release, rerun `pnpm generate`, open a PR listing added and removed keywords (model: lang-tptp's `tptp.yml`).
- [ ] Carry over `version.sh`, `release.yml` and `CHANGELOG.md` from lang-tptp; adapt names.
- [ ] `NOTICE`: keyword lists derived from egglog's parser source, with its licence.

## Done when

- [ ] All boxes above ticked or explicitly waived by Johannes.
- [ ] `nix develop -c .github/scripts/test-all.sh` passes from a clean clone.

## After this plan (Johannes)

Configure npm trusted publishing, first release, add the package to the Loge cell bundle.
