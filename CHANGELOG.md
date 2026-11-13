# Changelog

## 0.1.3

- Re-synced to cep `7c65dbf`; no sample file or lexer rule changed, so colours are the same as 0.1.2. cep's changes since 0.1.2 are to its error messages and documents, which this extension does not show.

## 0.1.2

- Re-synced to cep `ebb8496`; no sample file or lexer rule changed, so colours are the same as 0.1.1.
- New tests make sure a keyword glued to a name is not coloured as a keyword: `languagecep/0.1` is not a version pragma, and `streamS` is not the `stream` keyword. cep now reads keywords as whole words.

## 0.1.1

- Re-synced to cep `75f541e`, which fixed four issues this extension's review found in cep. `risk/2.5` now divides in cep too, which is how the extension already coloured it.
- Backticked names follow cep's rule: a letter or `_` first. A digit-first, empty or all-space backticked name (`` `1abc` ``) is no longer shown as a name.
- A new sample file, cep's malformed-backticked-name example, joins the snapshot tests (20 samples).

## 0.1.0

- The grammar is now built test-first: 7 unit files with every keyword asserted in its class, the escape, name, punctuation and call cases, and the design review's counter-examples; a keyword check that ties the grammar to cep's keyword table (115 words, 17 reserved, 11 classes). Colours are unchanged from 0.0.1.
- Tooling: cep's lexer, keyword table and 19 sample files are vendored at cep 1fa3a5b and checked byte for byte; snapshots of all 19 samples; checks on the .vsix contents, the fixtures and a clean tree; CI runs the full gate on every change, and a weekly job watches cep for drift.

## 0.0.1

- First preview release: syntax highlighting for CEP rule files (`.cep`, `language cep/0.1`), from the design-reviewed reference grammar. Keywords by class, the four lexical errors (wrong-case keyword, reserved word, unclosed one-line string, bad escape) in the error colour, comments, strings, numbers and durations, declarations, annotations and calls.
- Editor basics: Ctrl+/ toggles `--` comments, Shift+Alt+A toggles `/* */`, brackets and quotes auto-close.
- Known limitations are listed in docs/PLAN.md §5.3.
