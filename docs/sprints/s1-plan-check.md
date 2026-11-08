# S1 — plan check (v2, 2026-11-08; the owner's answers will be recorded in the sprint record)

*Step 0 of the full loop (cep's [sprint model §6](https://github.com/VORSAR/cep/blob/main/docs/sprints/00-sprint-model.md#6-the-full-loop), chosen by the owner as D6). Drafted read-only against cep `main` @ `1fa3a5b` and this repo @ `1c6143d`. Code claims cite `file:line` on those commits; tool claims cite the installed package's file. "Probed" means a scratch run in the session showed it; "inferred" marks a reading not proven by a run. v1 (`9a6eabd`) was reviewed blind by the architect and QA ([architecture](../reviews/s1-plan-check-architecture.md), [QA](../reviews/s1-plan-check-qa.md)); v2 places all 38 findings (§10). Nothing here is an owner decision until the owner answers §11.*

```
Sprint S1 — v1 syntax highlighting (vorsar.cep 0.1.0) · routine: full · SP ≈ 8 as sized · cap 2 weeks
Entry (G0)   ☐ card complete and approved ☐ dependencies merged, main green (none; main has no CI yet)
             ☐ fits the cap, lanes ≤ 8 days ☐ test material exists, or making it is an item
             ☑ reviewed by the architect (§10) ☑ reviewed by QA (§10) ☐ answered by the owner (§11)
```

SP as sized (all inferred): lane A 3, lane B 5. The coordinator's work (the scaffold, snapshots, docs, packaging) is inside the loop's overhead.

## The sprint card

| | |
|---|---|
| **Goal** | Opening a `.cep` file in VS Code gives every CEPS token class its own scope, so the theme colours it. The four lexical errors carry the error scope, the editor basics work, and it all comes from a `.vsix` that CI builds and checks. |
| **Target** | cep `main` @ `1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`. A cep change after it is a later sprint, not S1 scope. |
| **Routine · size** | Full loop (owner, D6, ≠ R) · ≈ 8 SP against the 2-week cap |
| **Depends on** | Nothing. |
| **In scope** | 1. The scaffold: `package.json` with its full `scripts` block (§2 S2), the lockfile, `.nvmrc`, `.npmrc`, `.gitignore`, `.gitattributes`, `launch.json`, `check-toolchain` and its test, and README and CHANGELOG stubs. · 2. The vendored keyword table and the 19 fixtures, pinned to the target. · 3. The unit tests, the keyword check, the grammar tests and the tooling tests, written first and run red (§7). · 4. The grammar and the language configuration (PLAN §5.2–§5.3 v2). · 5. The 19 snapshots, generated and reviewed before T3. · 6. The `.vsix` and its exact-content check. · 7. The upstream check and CI, which runs the same `gate` as T3. · 8. The lockfile re-resolved on or after 2026-11-13 (§0 finding 4), before T3. · 9. README and CHANGELOG. |
| **Not in scope** | Snippets (D1: backlog). Error squiggles, hover, go-to-definition, formatting: the language server, which is cep engine work (PLAN §9). Store publishing (D3: later). The tag and GitHub Release: the owner, after the merge. Fixing cep's `risk/2.5` lexing (§0 finding 10): cep's repo. |
| **Entry criteria** | The standard ones, plus: D1–D6 answered (done, 2026-11-08); §11 answered. |
| **Exit criteria** | The done-done block, plus these acceptance lines: |
| | 1. Every token class has its scope (PLAN §5.3 v2), including every counter-example in §6. — **proof:** `npm run test:unit` exit 0. It ran red twice first: against the placeholder grammar, and against one named mutant grammar that drops `\b` from the number, unit and text rules and uses PLAN v1's string end. That second run makes the absent-scope assertions go red. Each run's failing-assertion count is recorded per file. A scope lint (every scope named in the unit files is one the grammar emits) exits 0, after running red first. |
| | 2. The grammar's keywords are exactly cep's table. — **proof:** `npm run test:keywords` exit 0, printing `115 keywords, 17 reserved, 11 categories`. `npm run test:checker`: every test passes and asserts the script's own `check-keywords:` message, not just its exit status. Red first against a stub script that always exits 0. |
| | 3. The 19 fixtures tokenize as reviewed. — **proof:** `npm run test:fixtures` exit 0, after running red first with one snapshot deleted. It requires exactly 10 + 2 + 7 fixtures, a git-tracked `.cep.snap` for each, and no orphans. Then `npm run test:snap` exit 0, after one recorded red run from a one-scope grammar change. `git status --porcelain` is empty after `npm run gate`. The record lists every PLAN §6.2 check (v2) and its result. |
| | 4. The fixtures and the table are cep's bytes. — **proof:** for each of the 20 files (10 + 2 + 7 fixtures plus `keywords.go`), `git hash-object` equals the blob at the target in cep. Red first by flipping one byte. `test/upstream/SOURCE` is exactly the S3 line. `git ls-files --eol test/fixtures/torture/comments.cep` shows `i/mixed` and `attr/-text`. After a second sync run, `git status --porcelain test/` is empty. |
| | 5. The `.vsix` holds exactly the 8 files of S4. — **proof:** `npm run test:vsix` exit 0 on the real package. Its tests give exit 1, naming the problem, on an empty package and on one with an extra file. The local T3 `vsce package` output has no `WARNING` line. |
| | 6. The `.vsix` installs. — **proof:** `code --extensions-dir <scratch> --install-extension cep-0.1.0.vsix` exit 0, then `code --extensions-dir <scratch> --list-extensions --show-versions` prints `vorsar.cep@0.1.0`. |
| | 7. A keyword change in cep is caught. — **proof:** `check-upstream.mjs` exit 0 against cep `main` today. Its tests give exit 1, naming the cause, for a changed copy (a `data:` URL), a refused connection, and a 404. |
| | 8. CI runs the same checks as T3. — **proof:** a tooling test requires `ci.yml`'s test job to run `npm ci` and then `npm run gate`; it is red first against PLAN §5.6's file. Both CI jobs are green on the draft PR, and each step's log has been read. |
| | 9. The language configuration loads. — **proof:** a grammar test parses `language-configuration.json`, compiles `wordPattern` as a JS `RegExp`, and checks the comment tokens and bracket pairs; red first before the file exists. |
| **Owner's check** | *By running:* F5, then open all 19 fixtures in Dark Modern and Light Modern. Run "Inspect Editor Tokens and Scopes" on a sample of tokens. Expect what each default theme maps the scopes to (§0 finding 16, as settled by P6). *By hand:* Ctrl+/, Shift+Alt+A, and auto-closing of `( [ { ' " \``. Install the `.vsix` in a normal window; the status bar should say "CEP". *By reading:* README, CHANGELOG, and the snapshot review in the record. |

## 0. What the code says that the plan does not (read first)

1. **The plan's build steps assume the light process; the owner chose the full loop (D6, ≠ R).** PLAN §7 is one agent working step by step. → §1 maps it onto the loop; §11 Q1.
2. **`@vscode/vsce` 4.0.0 brings in a closed-source Microsoft component.** It depends on `@vscode/vsce-sign` 2.1.0, a JS wrapper, plus 9 platform packages that hold a native binary. All are licensed under the *Microsoft Software License Terms*: use only with Visual Studio products, no sharing or redistribution. The wrapper has a `postinstall` script that copies, or failing that downloads, the binary. Read from the npm tarball, probed. None of it is in the `.vsix`, but CLAUDE.md rule 5 asks for Apache-2-compatible dependencies. → §11 Q2.
3. **The two dev dependencies are 160 packages, and only the two direct ones are sure to be two weeks old.** A scratch install (`--ignore-scripts --before=2026-10-25`) gave 160 packages: MIT 120, ISC 15, Microsoft licence 10, Artistic-2.0 5, BSD-2 3, BSD-3 3, BlueOak-1.0 2, Apache-2.0 1, 0BSD 1. Probed. vsce asks for its dependencies with caret ranges, so a plain `npm install` resolves each one to its newest match, which can be days old. → §11 Q3.
4. **`npm audit` reports 2 high and 2 moderate advisories in that tree.**
   - **High:** `@azure/msal-node` 6.0.1, via `@azure/identity` 4.14.0 (GHSA-xcx6-jx8p-x3h5, the auth-code login flow). The fix is `@azure/identity` 4.14.1, released 2026-10-29; it is two weeks old from 2026-11-12.
   - **Moderate:** `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249). vsce 4.0.0 and 4.1.0 both require `^10.2.6`, so no fix exists within vsce 4.x.

   A lockfile keeps whatever it pins until someone re-resolves it, so the high advisory clears only when the lockfile is re-resolved after 2026-11-12 (corrected after review: A10). Neither code path runs here, since there is no `vsce publish` and no Azure login, and the only globs are our own (inferred). → card scope item 8, §11 Q3.
5. **`vsce package` can build an empty `.vsix` and exit 0, and the plan's check would pass it.** npm 11.20.0 masks a UUID-shaped path segment as `***` in `npm list --parseable` output. vsce then globs that path, which does not exist (`out/package.js:1317-1328`). It packages only its manifest, warns "LICENSE not found", and exits 0. That happened in the session scratchpad, whose path contains a UUID (probed; reproduced by both reviewers). The repo path and CI's path have none. PLAN §7 step 7 checks only that some paths are absent, which an empty package also passes. `vsce package --no-dependencies` skips `npm list` and packaged all 8 files (probed). The extension has no runtime dependencies, so this flag is a fix, not an option. → S2, S4, card line 5.
6. **A clean package prints one note that is not a warning.** "The file extension/LICENSE.txt is large (11.09 KB)" (probed). It is file-tree output, not `log.warn` (`out/util.js:355-356`). In GitHub Actions, vsce prints warnings as `::warning::` (`out/util.js:206-212`), so "no `WARNING` line" is a local read at T3. → card line 5.
7. **The native binary arrives as an optional package, so `ignore-scripts` alone does not keep it off disk** (corrected after review: A9). `@vscode/vsce-sign-darwin-arm64/bin/vsce-sign` is on disk after an install with scripts off (14.7 MB). `vsce package` never runs it: vsce only calls it from its sign and verify paths (`out/package.js:1535-1555`). Packaging works with the platform packages removed (probed by the architect). `omit=optional` in `.npmrc` keeps every platform binary off disk, both vsce-sign's and the keyring's. That `npm ci` honours it is documented npm behaviour, to be proven at T3. The Microsoft-licensed JS wrapper is a regular dependency that vsce loads at start (`out/package.js:81`), so it stays under every vsce option. → §11 Q2.
8. **The E-STR-001 end rule (PLAN §5.3, `strings`) lets an unterminated string run onto the next line in three cases.** The cases are a line ending in `\'`, a line ending in `\`, and a line ending right after the opening quote. In each, every quote after it flips between string and code. The rules were probed with vscode-textmate and vscode-oniguruma. cep's lexer rejects all three (`lexer.go:28`; probed with its rules on participle v2.1.4). A fix was also probed. Add a rule `'$`, scoped string plus `invalid.illegal.newline.cep`, before the single-quoted rule, and change the end to `(')|((?:\\.?|[^\\'\n])$)`. QA found that a string ending in spaces puts the mark on an invisible space. A variant also probed handles that: the rule `'\s*$` and the end `(')|((?:\\.?|[^\\'\s])\s*$)`. → §5 P1, §6.
9. **`2min` is a duration to cep but gets no colour from the plan.** cep lexes it `Number("2") Ident("min")` (probed). That the parser accepts it is inferred, since whitespace between tokens is optional. The plan's `\b`-bounded number and unit rules leave both parts uncoloured (probed by QA). → §5 P2.
10. **cep lexes `risk/2.5` (no spaces) as one version-pragma token.** `Pragma` (`lexer.go:25`) is tried before `Ident` (`lexer.go:31`). Probed: `Pragma("risk/2.5")`, while `risk / 2.5` and `Risk/2.5` lex as arithmetic. That is cep's to fix. The highlighter shows it as arithmetic. → §11 Q7.
11. **`expect given table X [ … ]` gets the table-declaration scope.** The `declarations` rule matches `table X` anywhere. Examples 01 and 07 use `given table SensitiveResources` and `given table RegisteredApps` (probed by QA). This is not in PLAN §5.3's known limitations. → §5 P3.
12. **The CRLF snapshot check in PLAN §6.2 cannot fail.** vscode-tmgrammar-test splits lines on `\r\n|\n` (`dist/unit/parsing.js:86`, `dist/snapshot/index.js:13`), and VS Code normalizes line endings. The only CRLF proof that can fail is card line 4's eol check. → PLAN §6.2 v2 marks that item "not a test".
13. **PLAN §7 step 6 needs a person at a VS Code window.** The coordinator cannot see the GUI. The install can be proven without one (card line 6); colours, Ctrl+/ and auto-closing cannot. → the owner's check, §11 Q9.
14. **This repo has no gate tiers, and the plan puts CI last.** cep's T0–T4 are `make` targets and git hooks. Ground rule 13 wants the gate before the first feature. Nothing reads `.nvmrc` locally, so a different Node can run `npm test` unnoticed. A Node hook wired with `core.hooksPath` would need neither a shell script nor a dependency. → §1, §11 Q5.
15. **Verified as the plan says:**
    - cep `main` = `1fa3a5bb…`.
    - `keywords.go`: 115 unique words in `keywordList`, 17 in `reservedFuture` (`:10-29`); both blocks end at a line that is exactly `}`.
    - PLAN §5.3's table: every word in exactly one of 11 categories; `keywords-reserved` = `reservedFuture`; the wrong-case paste list = `keywordList` in order.
    - Every caret in §6.1's verbatim `literals.test.cep` lands on the token it names. With the real runner it exits 0 on PLAN v1 and on the fixed grammar, and fails 31 assertions on the placeholder (probed by QA).
    - Packages: vsce 4.0.0 is MIT, from 2026-09-14, needs `node >= 22`; vscode-tmgrammar-test 0.1.3 is MIT, from 2024-02-05.
    - Both tools read `contributes.grammars` from `package.json` and exit −1 when a glob finds nothing.
    - Unit test files (`dist/unit/parsing.js`): `<` plus *n* dashes covers columns 0 to *n*; the header line is not tokenized.
    - VORSAR/cep is public, and the raw URL returns 200.
    - The action SHAs equal cep's `gate.yml` pins, and setup-node `v7.1.0` = `949feb24…`.
    - `comments.cep` has 5 CRLF line endings and no final newline.
16. **Found by review, now in the plan:**
    - `vscode-tmgrammar-snap` writes any missing `.snap` and exits 0 (`dist/snapshot.js:107-110`; A2, Q1).
    - Absent-scope assertions pass on the placeholder and are compared by exact string (`dist/unit/index.js:34-36`; Q2).
    - A test that only asserts "exit 1" passes before its script exists (Q3).
    - PLAN §5.4's `.vscodeignore` is a denylist, so a lane worktree inside the repo folder would be packed (A5, Q19).
    - In Dark Modern, six declaration, type, modifier, window and constant scopes share `#569cd6`. The 25 word operators (`and`, `has_ci`, …) get `#d4d4d4` against a `#CCCCCC` foreground, and black in Light Modern, so they look like plain names (probed over VS Code 1.145.2's theme files; A11).

## 1. Routine, shape, waves

**Full loop** (owner, D6). This is not a language change, since the grammar only colours what cep defines, so the language-design skill does not apply (the coordinator's reading).

| Loop step | In S1 |
|---|---|
| 0 Plan check → G0 | This document, reviewed blind; then §11 to the owner |
| Scaffold | The coordinator's first commit after G0: S2, S3, S4, `check-toolchain` and its test, the placeholder grammar, the README and CHANGELOG stubs. These are stubs and the gate, not designed parts. |
| 1–3 Design → G1 | PLAN §5–§6 v1 is the design. The panel runs in two waves (Q6): first the breaker and QA on testability, then the architect with the-fool. PLAN §5–§6 become v2, placing every finding and P1–P8, and every lane A script gets a spec with its test seams (A8). The owner decides what is left. |
| 4 Lanes | W1: lane A and lane B at once (≤ 2 agents), each in its own worktree under `.claude/worktrees/` |
| 5 Combine | Cherry-picks onto `s1/integration`; the coordinator generates the 19 snapshots and reviews them against PLAN §6.2 v2 |
| G2 | T3 = `npm ci && npm run gate`, exit 0 |
| 6 Slow checks | The headless install (card line 6); the `npm audit` result recorded |
| 7–8 → G3 | Review and break-it: the architect on the combined diff; QA and the-fool try to break the grammar with hostile `.cep` input. Then one fix round. |
| 9 T4 | CI on a draft PR the owner opens; when it opens is Q5 |
| 10–12 → G4, G5 | The card's owner's check; the owner merges; the record and retro |

**The gate** (Q5):
- **T0/T1:** no git hooks.
- **T2:** a lane's own script, `npm run test:lane-a` or `npm run test:lane-b`. Neither lane has the other's files, so `npm test` cannot pass in a lane (A1, probed).
- **T3:** `npm ci && npm run gate` on the combined branch, where `gate` = `npm test`, then package, then `test:vsix`, then a clean-tree check.
- **T4:** CI's test job runs exactly `npm ci` and `npm run gate` (A4).

## 2. Seams

**S1 — the grammar's shape (lane B owns the grammar and its checker).** The contract is the top-level list and the canonical `\\b(?:w1|…)\\b` and `(?i)\\b(?:…)\\b` match forms of PLAN §5.3 v2 (A18). The checker stays in lane B: its first test runs on the real grammar, so it cannot pass in a lane without the grammar. The architect's combined-diff review reads the checker against PLAN §5.5.2 independently. (A13's move rejected for that reason; its commit cadence adopted in §9.)

**S2 — `package.json` (the coordinator → both lanes; no lane edits it).** The full `scripts` block lands in the first commit, verbatim:

```json
"scripts": {
  "test": "npm run test:toolchain && npm run test:unit && npm run test:keywords && npm run test:checker && npm run test:grammar && npm run test:tools && npm run test:fixtures && npm run test:snap",
  "test:toolchain": "node scripts/check-toolchain.mjs",
  "test:unit": "vscode-tmgrammar-test \"test/unit/**/*.test.cep\"",
  "test:keywords": "node scripts/check-keywords.mjs",
  "test:checker": "node --test test/checker.test.mjs",
  "test:grammar": "node --test test/grammar.test.mjs",
  "test:tools": "node --test test/tools.test.mjs test/toolchain.test.mjs",
  "test:fixtures": "node scripts/check-fixtures.mjs",
  "test:snap": "vscode-tmgrammar-snap \"test/fixtures/**/*.cep\"",
  "test:snap:update": "vscode-tmgrammar-snap --updateSnapshot \"test/fixtures/**/*.cep\"",
  "test:vsix": "node scripts/check-vsix.mjs cep-0.1.0.vsix",
  "test:clean": "node scripts/check-clean.mjs",
  "test:lane-a": "npm run test:toolchain && npm run test:tools",
  "test:lane-b": "npm run test:toolchain && npm run test:unit && npm run test:keywords && npm run test:checker && npm run test:grammar",
  "package": "vsce package --no-dependencies",
  "gate": "npm test && npm run package && npm run test:vsix && npm run test:clean"
}
```

`package.json` also gets `"files": ["syntaxes/cep.tmLanguage.json", "language-configuration.json", "LICENSE", "CHANGELOG.md"]` in place of `.vscodeignore` (S4). vsce refuses to combine the two.

**S3 — the vendored table and fixtures (the coordinator, then lane A).** The first commit writes `test/upstream/keywords.go` with `git -C <cep> cat-file blob 1fa3a5bb…:internal/parser/keywords.go`, and `test/upstream/SOURCE` as exactly this line, ending in one LF: `VORSAR/cep 1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49 2026-11-08`. From lane A's sync on, lane A owns `test/upstream/*`. Its sync runs with the cep clone's absolute path and `--ref 1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`, never the default `main`: cep's fixtures changed in five commits from 11-04 to 11-08 (A6). Card line 4 proves the bytes.

**S4 — the `.vsix` file set (the coordinator's `files` list → lane A's `check-vsix`).** Exactly these 8 entries: `extension.vsixmanifest`, `[Content_Types].xml`, `extension/package.json`, `extension/readme.md`, `extension/changelog.md`, `extension/LICENSE.txt`, `extension/language-configuration.json`, `extension/syntaxes/cep.tmLanguage.json`. vsce lowercases the README and CHANGELOG names and renames LICENSE (probed).

## 3. Where each rule lives

| Rule | File | Built from |
|---|---|---|
| Token classes and their scopes | `syntaxes/cep.tmLanguage.json` | `lexer.go:21-35`, `keywords.go`, SPEC §2 |
| Comment toggles, brackets, auto-closing, word pattern | `language-configuration.json` | PLAN §5.2 |
| The grammar's keywords equal cep's table | `scripts/check-keywords.mjs` | PLAN §5.5.2 |
| Tests name only scopes the grammar emits; the configuration loads | `test/grammar.test.mjs` | Q2, Q17 |
| Fixtures and table are cep's bytes | `scripts/sync-upstream.mjs` | PLAN §5.5.1 (+ `--out`, A8) |
| Each fixture has a tracked snapshot, and the count is right | `scripts/check-fixtures.mjs` | A2, Q1 |
| cep `main` has not moved on | `scripts/check-upstream.mjs` | PLAN §5.5.3 (+ `--url`) |
| The `.vsix` holds exactly S4 | `scripts/check-vsix.mjs <file>` | S4 |
| Node is the pinned version | `scripts/check-toolchain.mjs` | finding 14 |
| A run leaves no generated or changed file | `scripts/check-clean.mjs` | Q1 |
| CI runs the gate | `test/tools.test.mjs` | Q5 |

## 4. Ownership — one owner per file

| Who | Owns |
|---|---|
| **Coordinator** | `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `.gitignore` (with `.claude/worktrees/`), `.gitattributes`, `.vscode/launch.json`, `scripts/check-toolchain.mjs`, `test/toolchain.test.mjs`, the placeholder grammar, `test/upstream/*` until lane A's sync, every `*.cep.snap`, README, CHANGELOG, `CLAUDE.md`, `docs/**` |
| **Lane A — tooling** | `scripts/sync-upstream.mjs`, `scripts/check-upstream.mjs`, `scripts/check-vsix.mjs`, `scripts/check-fixtures.mjs`, `scripts/check-clean.mjs`, `test/tools.test.mjs`, `test/fixtures/**/*.cep` and `test/upstream/*` (by running sync), `.github/workflows/ci.yml` |
| **Lane B — grammar** | `test/unit/*.test.cep`, `scripts/check-keywords.mjs`, `test/checker.test.mjs`, `test/grammar.test.mjs`, `syntaxes/cep.tmLanguage.json` (after the placeholder), `language-configuration.json` |

## 5. Design notes and the panel (before code)

The design note is PLAN §5–§6. Under Q6's recommendation, the panel works in two waves. First, a breaker re-derives which text gets which scope, along with the test expectations, from cep's sources (`lexer.go`, `keywords.go`, SPEC §2, the fixtures). It is given the scope vocabulary but not PLAN §5.3's rules, their order or the tests (A14); the coordinator diffs the result against PLAN §5.3. Alongside the breaker, QA reviews testability. Second, the architect reviews structure with the-fool. Design v2 also specs every lane A script in PLAN §5.5's style, with its seams: `sync-upstream --out`, `check-upstream --url`, `check-vsix <file>`, `check-fixtures`, `check-clean` (A8). The panel answers:

- **P1 — E-STR-001.** Adopt the probed variant that marks the last visible character (§0 finding 8, Q11) for both quote styles?
- **P2 — `2min`.** Colour it as cep lexes it, or keep it as a known limitation? A `duration` rule before `number` would keep `keywords-unit` canonical. If adopted, the checker must also check that the rule's unit list equals `keywords-unit` (Q16).
- **P3 — `given table X`.** Add a rule that scopes `X` as a reference, or list it as a known limitation?
- **P4 — Unicode.** Answered by QA's probe. Folded or non-ASCII spellings such as `ſelect`, `Key` (Kelvin sign) and `ﬁrst` get the error or no scope, and cep rejects every one at the lexer; no input cep accepts gets a wrong scope. Closed: no change.
- **P5 — triple quotes and auto-closing.** With `'` auto-closing, what does typing `'''` produce? Accept it, or add `'''` as its own pair?
- **P6 — the word operators** (§0 finding 16). Scope `and or not in is` and the 20 text operators as `keyword.operator.wordlike.cep`, which the default themes colour as keywords (`dark_vs.json` maps `keyword.operator.wordlike` to `#569cd6`)? Or keep them operator-coloured and record what each theme shows?
- **P7 — a declaration split over two lines.** With `stream` on one line and `Foo (a string)` on the next, `Foo` gets the function scope (probed; valid cep). Accept that as a known limitation, or add a rule for a name before `(` at the start of a line?
- **P8 — two divergences from cep** (Q12). `''''` opens a raw string that swallows the rest of the file, while cep sees two empty strings. `language` followed by `cep/0.1` on the next line gets no version scope. Pin each behaviour as a known limitation, or fix it?

## 6. Counter-examples (listed before coding; each becomes an assertion)

Each item is an input, then the expected outcome.

Write each negative case positively wherever the token has a scope (Q2). Anything with a backslash-u escape must have its bytes checked after writing (Q9).

**Strings.**
1. `x 'it\'` at the end of a line → `\'` gets `invalid.illegal.newline.cep`; the next line `y 'z'` has a normal string.
2. `x 'abc\` at the end of a line → `\` gets the error; the next line is clean.
3. `x '` at the end of a line → `'` gets the error; the next line is clean.
4. Items 1–3 with `"`.
5. `x 'abc␠␠` and `x '␠␠` → the mark covers a visible character; the next line is clean (P1).
6. `''` → an empty string, with begin and end punctuation.
7. `''''''` → one empty triple-single string.
8. `'''a''''` → `'''a'''` is raw; the last `'` gets `string.quoted.single.cep invalid.illegal.newline.cep`, matching cep's lexer error at 1:8 (Q8).
9. `'\u12'` and `'\u'` → `\u` gets `invalid.illegal.escape.cep`.
10. `'\u00e9'` and `'\u00E9'` → one `constant.character.escape.cep` each.
11. `'\U00e9'` → `\U` gets the invalid-escape scope (Q9).
12. `'a\\' 'b'` → the escape, the end quote, then a second string.
13. `'\''`, `"it\'s"` and `'say \"hi\"'` → each escape is valid.
14. `'it''s'` → two closed strings.

**Numbers and durations.**
15. `2min` → per P2.
16. `1e3` and `2.5e-3` are numbers; `1.` is a number, then an accessor.
17. `ts_min` and `x1` → `ts_min` has no unit scope and `x1` no number scope; recorded red on the mutant.

**Comments.**
18. `a--b` → `--b` is a comment.
19. `a<--b` → a comparison, then a comment.
20. `->` is never a comment.
21. `/* a */ */` → the second `*/` is `*` and `/`.
22. `/* /* x */ y` → the comment ends at the first `*/`.
23. `/**/ y` and `/*/ y */ z` → `y` and `z` are not comment.
24. `/* open`, then `stream T (a string);` on the next line → line 2 is all `comment.block.cep`.
25. `x -- don't`, then `y 'z'` on the next line → `don't` is comment, and line 2 has a normal string.
26. `'/*'` is a string.

**Keywords and names.**
27. `INTO`, `iNtO` and `GROUP` are wrong-case; `GROUP` is not reserved, as cep's E-KW-002 (`parse.go:161-162`).
28. `SELECTED Select_ _FROM FROM1 fromx` and `session_id ordered` → no error scope; recorded red on the mutant.
29. `minimum(` is a function.
30. `sort (` is a window keyword.
31. `` `from` `` is a quoted name.
32. `${min}` is a param ref.
33. `language CEP/0.1` → `/` is arithmetic, and `0.1` is a number.
34. `risk/2.5` → arithmetic and a number (Q7).
35. `stream Foo(a string)` → `Foo` is a stream name.
36. `stream`, then `Foo (a string)` on the next line → per P7 (Q7).
37. `given table T [` → per P3.
38. `stream SeleCT (` → a stream name (the accepted limitation).
39. `''''` and the split `language` pragma → per P8.

**Tooling.** Each test asserts the script's own message (it starts with the script's name and names the input), not only its exit status. Each script also has an exit-0 case (Q3).
40. `sync-upstream`: a missing ref → 1. A fixture no longer upstream → 1, naming the file. A second run → `git status --porcelain test/` is empty. All of these use a throwaway git repo as the cep clone and an output root, never `../cep` or the real tree (Q6).
41. `check-keywords`:
    - add `month` to `keywords-unit` → 1, naming `month` (rule d);
    - a keyword file with no `keywordList` block → 1;
    - unparsable grammar JSON → 1.
42. `check-upstream`: a changed copy (a `data:` URL) → 1; a refused connection → 1; a 404 → 1, naming the status (Q18).
43. `check-vsix`: an empty package → 1; an extra file → 1; a missing file → 1; the S4 set → 0.
44. `check-fixtures`: a missing `.snap` → 1; an orphan `.snap` → 1; 18 fixtures → 1.
45. `check-clean`: an untracked or changed file → 1.
46. `check-toolchain`: a Node other than `.nvmrc` → 1 (via an `.nvmrc` path argument).
47. `ci.yml` without `npm run gate` → 1 (red first against PLAN §5.6's file).

## 7. Test plan per lane

| Lane | Acceptance → proof |
|---|---|
| A | Card 4 → the sync run plus the 20-file hash comparison · card 5 → `check-vsix` tests (43), then `test:vsix` at T3 · card 3 → `check-fixtures` tests (44) · card 7 → `check-upstream` tests (42) · card 8 → the `ci.yml` test (47), then T4 |
| B | Card 1 → `test:unit`, red twice (placeholder and mutant), then green, plus the scope lint · card 2 → `test:keywords` and `test:checker`, red first against an always-exit-0 stub · card 9 → `test:grammar` |
| Coordinator | Card 3 → the snapshots generated, reviewed and committed; one red `test:snap` run recorded · card 6 → the headless install · `check-toolchain` red first, before its file exists |

*At "done":* each lane runs its own T2 script and reads the exit code itself. It reports the red-first exit codes, and the failing-assertion count per file.

## 8. Risks and order

1. **The loop's overhead is large next to the change.** *Mitigation:* the panel is scoped (Q6), and each lane fits one usage window.
2. **Reviewing 19 snapshots by hand is long and easy to skim.** *Mitigation:* `check-fixtures` makes a missing snapshot red. The coordinator reviews against PLAN §6.2 v2, which adds e-str-001's lines 7–8 (Q10). QA samples the snapshots independently at break-it.
3. **The packager's supply chain** (findings 2–4, 7). *Mitigation:* Q2 and Q3.
4. **The breaker's grammar may differ from PLAN §5.3 in many places.** *Mitigation:* it gets the scope vocabulary, so the differences are about classes, not names; design v2 places each difference, with a test.
5. **cep moves.** *Mitigation:* S1 targets `1fa3a5b` (S3); whether drift can block the merge is Q8.

**Order:** G0 → scaffold → panel (two waves), design review, owner decisions → G1 → W1 (lanes A and B) → combine, snapshots generated and reviewed → T3 → headless install → review and break-it → one fix round → T4 → the owner's check → merge → close-out.

## 9. Lane briefs (skeletons)

**Common to all:**
- Work in your own worktree under `.claude/worktrees/`, on your own branch, with Node 26.13.0. Give the cep clone as an absolute path.
- Write only your owned files (§4). Never edit `package.json`, and never stub another lane's file to get green.
- Never run `test:snap:update`, and never commit a `*.snap`.
- After writing any file that contains a backslash-u escape, check its bytes with `grep`.
- Commit at the red tests, at each green part, and at the end.
- Never push or merge. No AI attribution anywhere. Never call anything an owner decision unless the owner made it.
- "Done" is your T2 script exiting 0, read yourself. Report to the session scratchpad as `s1/lane-<x>-report.md`. Your final message gives the commits, the red-first exit codes with failing counts, and the open items.

**Lane A — tooling** (general-purpose). *Goal:* the upstream, fixture, package and clean-tree checks, and CI. *Read:* PLAN §5.4–§5.6 v2, this plan check's §0 (findings 5, 6, 12) and §2 S3–S4, and §6 items 40 and 42–47. *Order:* the tests first, run red; then `sync-upstream`, and run it at the target; then `check-fixtures`, `check-vsix`, `check-clean`, `check-upstream` and `ci.yml`. *Not in this lane:* `package.json`, the grammar, snapshots.

**Lane B — grammar** (general-purpose). *Goal:* the grammar and the language configuration, with the tests written first. *Read:* PLAN §5.2, §5.3 and §6 v2; `lexer.go`; `keywords.go`; SPEC §2; this plan check's §6 items 1–39 and 41. *Order:* the unit files, `check-keywords` and its tests, and `test/grammar.test.mjs`, all run red against the placeholder and the mutant, with the exit codes and counts recorded; commit; then the grammar and the configuration. *Not in this lane:* snapshots, fixtures, `package.json`.

## 10. Reviews of this plan check

The architect and QA each read v1 blind. Every finding was checked against the code or the tools before its disposition. "Fixed" means placed in this v2; "to Q/P" means it is now a question for the owner or the panel.

| # | Reviewer | Severity | Finding | Disposition |
|---|---|---|---|---|
| A1 | architect | blocker | T2 = `npm test` cannot pass in a lane worktree. Each lane lacks the other's files, and the runners exit −1 on an empty glob (`unit.js:74-76`, `snapshot.js:76-79`). | fixed: per-lane T2 scripts (§1, S2); `check-toolchain` in the scaffold |
| A2 | architect | blocker | A missing `.snap` is written and passes (`snapshot.js:107-110`, verified). A lane, T3 or CI would create unreviewed snapshots. | fixed: `check-fixtures` red first; snapshots before T3; brief rules (§9); card line 3 |
| A3 | architect | should-fix | The scripts block is not written out; `test/tools.test.mjs` runs nowhere. | fixed: S2 verbatim |
| A4 | architect | should-fix | T3 and CI are defined twice and can drift; PLAN §5.6 runs no `test:vsix`. | fixed: `npm run gate`; CI runs it; tested (§6 item 47) |
| A5 | architect | should-fix | The `.vsix` set has no seam; the `.vscodeignore` denylist packs stray folders (probed). | fixed: S4, `files` allowlist, stubs in the scaffold, worktrees ignored |
| A6 | architect | should-fix | Two writers of `test/upstream/*`; `SOURCE` bytes not fixed; sync unpinned while cep's fixtures move (five commits from 11-04 to 11-08, verified). | fixed: S3 |
| A7 | architect | should-fix | The `upstream` job on PRs and `main` lets a cep change block G5. | to Q8 |
| A8 | architect | should-fix | `check-vsix` and `check-toolchain` have no spec; lane A's scripts lack test seams; the order line skips G1. | fixed: design v2 specs them (§5); order (§8) |
| A9 | architect | should-fix | `ignore-scripts` does not keep the binary off disk (verified: 14.7 MB on disk); `omit=optional` does; the JS wrapper stays. | fixed: finding 7 corrected; Q2 rewritten |
| A10 | architect | should-fix | The high advisory does not clear itself; the lockfile pins 4.14.0. | fixed: finding 4, scope item 8, Q3 |
| A11 | architect | should-fix | "Its own colour" is false in both default themes; the word operators look like names (verified with VS Code 1.145.2's themes). | fixed: goal reworded, finding 16; to P6 |
| A12 | architect | should-fix | "Decided unless the owner objects" labels defaults as decisions. | to Q9 |
| A13 | architect | later | Move `check-keywords` to lane A to balance the lanes. | rejected: its first test needs the real grammar, so lane A could not reach T2 (S1). Commit cadence adopted (§9). |
| A14 | architect | later | Give the breaker the scope vocabulary. | fixed (§5) |
| A15 | architect | later | `CLAUDE.md` is not in the ownership table. | fixed (§4) |
| A16 | architect | later | Three panel reviewers against the two-agent limit. | fixed: two waves (§5) |
| A17 | architect | later | A Node hook is possible without a shell script or a dependency; npm's version also matters. | to Q5 (hook); design v2 decides whether `check-toolchain` checks npm too |
| A18 | architect | later | S1 fixed "24 entries" before P2 and P3. | fixed: "PLAN §5.3 v2" (S1) |
| A19 | architect | later | Q4 bundled the `--no-dependencies` fix with a choice. | fixed: finding 5 calls it a fix; Q4 asks only about the check |
| Q1 | QA | blocker | Card line 3's proof passes with a missing snapshot; nothing counts the 19. | fixed: as A2, plus the count and a clean `git status` |
| Q2 | QA | should-fix | Absent-scope assertions are green on the placeholder; a misspelled excluded scope is green on any grammar (`unit/index.js:34-36`). | fixed: positive forms, the mutant red run, the scope lint, counts per file (card line 1) |
| Q3 | QA | should-fix | "Exit 1" tests pass before their script exists; rule (d) and the empty-table rule are untested. | fixed: message assertions, exit-0 cases, §6 item 41, a stub red run |
| Q4 | QA | should-fix | Card line 4 never compares bytes with cep. | fixed: the 20-file hash comparison, red first |
| Q5 | QA | should-fix | "Both CI jobs green" cannot show a missing check. | fixed: `gate`, §6 item 47, logs read (card line 8) |
| Q6 | QA | should-fix | `npm test` does not run the tools tests; they need a world of their own. | fixed: S2, §6 item 40, design seams |
| Q7 | QA | should-fix | Counter-example 24 was wrong: a two-line declaration gives `Foo` the function scope (verified). | fixed: §6 item 36; to P7 |
| Q8 | QA | should-fix | Counter-example 7 was wrong under the P1 fix (verified). | fixed: §6 item 8 |
| Q9 | QA | should-fix | Counter-example 8 had lost its backslash-u escape in writing (verified: the file held `'é'`). | fixed: §6 items 10–11; byte check in the briefs |
| Q10 | QA | should-fix | PLAN §6.2's e-str-001 check passes on the broken v1 grammar. | fixed: PLAN §6.2 v2 adds lines 7–8 (§8 risk 2) |
| Q11 | QA | should-fix | A string ending in spaces puts the error mark on an invisible space (verified). | fixed: finding 8, §6 item 5; to P1 |
| Q12 | QA | later | Missing breaker cases; two divergences from cep. | fixed: §6; to P8 |
| Q13 | QA | later | PLAN §6.2's CRLF item cannot fail. | fixed: marked "not a test" (finding 12) |
| Q14 | QA | later | `--list-extensions` needs the same `--extensions-dir`. | fixed (card line 6) |
| Q15 | QA | later | In Actions, warnings print as `::warning::`. | fixed: a local read at T3 (finding 6) |
| Q16 | QA | later | A P2 duration rule would sit outside the keyword check. | to P2 |
| Q17 | QA | later | `language-configuration.json` has no test. | fixed: card line 9 |
| Q18 | QA | later | The URL seam needs `data:` (not `file:`); no 404 test. | fixed: §6 item 42 |
| Q19 | QA | later | Worktrees inside the repo would be packaged. | fixed: as A5 |

## 11. Questions for the owner (recommendation first)

- **Q1 Where do the sprint's documents live?** → **Here, in cep's naming:**
  - the card and the plan check: `docs/sprints/s1-plan-check.md`;
  - the reviews: `docs/reviews/`;
  - the record: `docs/sprints/s1-record.md`.

  PLAN.md stays the design and the one status line. The alternative mirrors cep's full set (`sprint-plan.md`, `decisions.md`, `history.md`), which is more files for a one-sprint repo.
- **Q2 The packager carries closed-source Microsoft code (findings 2, 7).** → **(a) Keep vsce 4.0.0, with an `.npmrc` that sets `ignore-scripts=true` and `omit=optional`, and grant rule 5 an explicit exception for this one build-only tool.**
  - With that `.npmrc`, no install script runs and the native binary is never on disk. The Microsoft-licensed JS wrapper still sits in `node_modules`. `vsce package` never calls it, and it never enters the repo or the `.vsix`.
  - (b) Write our own packager in Node, about 150 lines with `node:zlib`. No third-party packager, but we own a zip writer and the manifest format.
  - (c) No packaging in CI; the owner runs `npx @vscode/vsce package` on release day.
- **Q3 Package ages and the advisories (findings 3, 4).** → **Resolve the lockfile with `npm install --before=<install day − 14 days>` on or after 2026-11-13, before T3.**
  - Every one of the 160 packages is then at least two weeks old, and the high advisory's fix is in.
  - The moderate `minimatch` advisory stays, because vsce 4.x has no fix. It goes to known issues; this repo's globs are its own.
  - The `npm audit` result goes in the record, and the refresh command goes into CLAUDE.md.
  - The alternative is a plain `npm install`: newest versions, but some would be days old.
- **Q4 The `.vsix` check (finding 5, S4).** → **`scripts/check-vsix.mjs` asserts the exact 8 files, and a `files` allowlist replaces `.vscodeignore`.** The alternative is the plan's check for absent paths, which an empty package passes.
- **Q5 The gate (finding 14).** → **T2 is per lane, T3 is `npm ci && npm run gate`, and CI runs exactly that; `check-toolchain` fails unless Node equals `.nvmrc`; no git hooks. You open the draft PR right after combine, so CI runs before break-it rather than only at step 9.** Other options:
  - add a Node pre-push hook (T1) through `core.hooksPath`; agents never push, so it would guard only your pushes;
  - open the draft PR at step 9, as written.
- **Q6 The design panel.** → **Two waves: a breaker (an independent grammar from cep's sources) with QA on testability, then the architect with the-fool; no state-of-the-art challenger.** The one alternative to TextMate is semantic tokens, which need the language server that D1 left out of v1. Other options: the full three-reviewer panel with a challenger, or the architect and QA only.
- **Q7 cep lexes `risk/2.5` as a version pragma (finding 10).** → **Forward it to cep's known issues, for you to schedule there.** The highlighter shows arithmetic, which is what the author meant, and this repo never edits cep.
- **Q8 Can a cep change block this repo's merge? (A7)** → **(a) Run the `upstream` job only on its weekly schedule and by hand, not on PRs or pushes.** Drift then shows as a red scheduled run that starts a re-sync sprint; it does not stop this repo's merges, whose own code has not changed. Other options:
  - (b) keep it on PRs and `main`, so a cep keyword change blocks merging until a re-sync sprint lands;
  - (c) keep (b) for after S1, but during S1 treat a cep change as a new sprint, not S1 scope.
- **Q9 Three defaults, which need your yes (A12).** → **Yes to all three:**
  - The lanes are run by fresh general-purpose agents in worktrees under `.claude/worktrees/`, since the roster has no JavaScript or TextMate specialist.
  - PLAN §7 step 6's visual check moves into your owner's check.
  - S1 is one PR from `s1/integration`.

  The alternative is two PRs: tooling first, then the grammar.
