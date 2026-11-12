# Changelog

All notable changes to `codemirror-lang-egglog` are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html) over what the package exposes:
node names and the exported JavaScript API.

The egglog release the keyword tables were read from is recorded in `package.json` under
`egglog.version`; it moves when egglog does, not when the package does.

## [Unreleased]

## [0.1.0] - 2026-11-12

### Added

- `codemirror-lang-egglog`: a CodeMirror 6 language (Lezer parser) for egglog with
  highlighting, list folding, Lisp-style indentation and keyword completion, its keyword
  tables read from egglog 3.0.0.
