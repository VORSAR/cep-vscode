# S1 — plan check (draft, 2026-11-08; the owner's answers will be recorded in the sprint record)

*Step 0 of the full loop (cep's [sprint model §6](https://github.com/VORSAR/cep/blob/main/docs/sprints/00-sprint-model.md#6-the-full-loop), chosen by the owner as D6). Drafted read-only against cep `main` @ `1fa3a5b` and this repo @ `1c6143d`. Code claims cite `file:line` on those commits; tool claims cite the installed package's file. "Probed" means a scratch run in the session showed it; "inferred" marks a reading not proven by a run. Nothing here is an owner decision until the owner answers §11.*

```
Sprint S1 — v1 syntax highlighting (vorsar.cep 0.1.0) · routine: full · SP ≈ 8 as sized · cap 2 weeks
Entry (G0)   ☐ card complete and approved ☐ dependencies merged, main green (none; main has no CI yet)
             ☐ fits the cap, lanes ≤ 8 days ☐ test material exists, or making it is an item
             ☐ reviewed by the architect (§10) ☐ reviewed by QA (§10) ☐ answered by the owner (§11)
```

SP as sized (all inferred): lane A 3, lane B 5. The coordinator's work (the scaffold, snapshots, docs, packaging) is inside the loop's overhead.

## The sprint card

| | |
|---|---|
| **Goal** | Opening a `.cep` file in VS Code shows every CEPS token class in its own colour, the four lexical errors in the error colour, and the editor basics work, from a `.vsix` that is built and checked by CI. |
| **Routine · size** | Full loop (owner, D6, ≠ R) · ≈ 8 SP against the 2-week cap |
| **Depends on** | Nothing. cep `main` @ `1fa3a5b` is the language source. |
| **In scope** | 1. The scaffold: `package.json`, the lockfile, `.nvmrc`, ignore and attribute files, `launch.json` (PLAN §5.1, §5.4). · 2. The vendored keyword table and the 19 fixtures (§5.5.1). · 3. The unit tests, the keyword check and its tests, written first and run red (§6.1, §5.5.2, §6.3). · 4. The grammar and the language configuration (§5.2, §5.3), v2 after the design review. · 5. The 19 snapshots, reviewed (§6.2). · 6. The `.vsix` and its content check (§7 step 7; §0 finding 5). · 7. The upstream check and CI (§5.5.3, §5.6). · 8. README and CHANGELOG. |
| **Not in scope** | Snippets (D1: backlog). Error squiggles, hover, go-to-definition, formatting: the language server, cep engine work (PLAN §9). Store publishing (D3: later). The tag and GitHub Release: the owner, after the merge (PLAN §7 step 9). Fixing cep's `risk/2.5` lexing (§0 finding 10): cep's repo. |
| **Entry criteria** | The standard ones, plus: D1–D6 answered (done, 2026-11-08); §11 answered. |
| **Exit criteria** | The done-done block, plus these acceptance lines: |
| | 1. Every token class has its scope (PLAN §5.3 v2), including every counter-example in §6. — **proof:** `npm run test:unit` exit 0, after the same files ran red against the placeholder grammar (exit codes recorded). |
| | 2. The grammar's keywords are exactly cep's table. — **proof:** `npm run test:keywords` exit 0, printing `115 keywords, 17 reserved, 11 categories`; `npm run test:checker` 9 of 9 pass, each mutation red. |
| | 3. The 19 fixtures tokenize as reviewed. — **proof:** `npm run test:snap` exit 0; the record lists each §6.2 check and its result. |
| | 4. The fixtures are cep `main`'s bytes. — **proof:** `test/upstream/SOURCE` names `1fa3a5b…`; `git ls-files --eol test/fixtures/torture/comments.cep` shows `i/mixed` and `attr/-text`; a second sync run changes nothing. |
| | 5. The `.vsix` holds exactly the extension's files. — **proof:** the content check exits 0 on the real package and 1 on an empty one (§0 finding 5); `vsce package` prints no `WARNING` line. |
| | 6. The `.vsix` installs. — **proof:** `code --extensions-dir <scratch> --install-extension cep-0.1.0.vsix` exit 0, and `--list-extensions` prints `vorsar.cep`. |
| | 7. A keyword change in cep is caught. — **proof:** `check-upstream.mjs` exit 0 against cep `main` today, exit 1 against a changed copy. |
| | 8. CI runs the same checks. — **proof:** both CI jobs green on the draft PR (T4). |
| **Owner's check** | *By running:* F5, then open all 19 fixtures in Dark Modern and Light Modern; "Inspect Editor Tokens and Scopes" on a sample of tokens. *By hand:* Ctrl+/, Shift+Alt+A, auto-closing of `( [ { ' " \``; install the `.vsix` in a normal window; the status bar says "CEP". *By reading:* README, CHANGELOG, the snapshot review in the record. |

## 0. What the code says that the plan does not (read first)

1. **The plan's build steps assume the light process; the owner chose the full loop (D6, ≠ R).** PLAN §7 is one agent working step by step. → §1 maps it onto the loop; §11 Q1.
2. **`@vscode/vsce` 4.0.0 brings in a closed-source Microsoft component.** It depends on `@vscode/vsce-sign` 2.1.0 (and 9 platform packages), licensed "SEE LICENSE IN LICENSE.txt". That file is the *Microsoft Software License Terms*: use only with Visual Studio products, no sharing or redistribution. The package has a `postinstall` script that copies, or failing that downloads, a native binary (`src/postinstall.js`). Read from the npm tarball, probed. It is never in the `.vsix`, but CLAUDE.md rule 5 asks for Apache-2-compatible dependencies. → §11 Q2.
3. **The two dev dependencies are 160 packages, and only the two direct ones are sure to be two weeks old.** A scratch install (`--ignore-scripts --before=2026-10-25`) gave 160 packages: MIT 120, ISC 15, Microsoft licence 10, Artistic-2.0 5, BSD-2 3, BSD-3 3, BlueOak-1.0 2, Apache-2.0 1, 0BSD 1. Probed. `vsce` asks for its dependencies with caret ranges (`npm view @vscode/vsce@4.0.0 dependencies`), so a plain `npm install` resolves each one to its newest match, which can be days old. → §11 Q3.
4. **`npm audit` reports 2 high and 2 moderate advisories in that tree.** High: `@azure/msal-node` 6.0.1 via `@azure/identity` 4.14.0 (GHSA-xcx6-jx8p-x3h5, the auth-code login flow). The fix is `@azure/identity` 4.14.1, released 2026-10-29, so it turns two weeks old on 2026-11-12. Moderate: `minimatch` 10.2.6 (GHSA-g3hv-75wg-m249); vsce 4.0.0 and 4.1.0 both require `^10.2.6`, so no fix exists within vsce 4.x. Probed. Neither code path runs here: there is no `vsce publish` or Azure login, and the only globs are our own `.vscodeignore` (inferred from what those paths do). → §11 Q3.
5. **`vsce package` can build an empty `.vsix` and exit 0, and the plan's check would pass it.** npm 11.20.0 masks a UUID-shaped path segment as `***` in `npm list --parseable` output. vsce globs that path, which does not exist (`out/package.js:1317-1328`), packages only its manifest, warns "LICENSE not found", and exits 0. This was probed in the session scratchpad, whose path contains a UUID. The repo path and CI's `/home/runner/work/…` have none, so the real build is unaffected today. PLAN §7 step 7 only checks that `test/`, `scripts/` and `docs/` are absent, which an empty package also satisfies. `vsce package --no-dependencies` skips `npm list` and packaged all 8 files (probed); the extension has no runtime dependencies. → §6 (31, 32), card line 5, §11 Q4.
6. **A clean package prints one note that is not a warning.** "The file extension/LICENSE.txt is large (11.09 KB)" (probed). "No warnings" in PLAN §7 step 7 should read "no `WARNING` line". → card line 5.
7. **Packaging works without the vsce-sign binary.** With install scripts off, `node_modules/@vscode/vsce-sign/bin` is absent and `vsce package` still exits 0 with all files (probed). So `ignore-scripts=true` in `.npmrc` is viable: no install script from the 160 packages would ever run. vsce leaves `.npmrc` out of the package by default (`out/package.js:1262`). → §11 Q2.
8. **The E-STR-001 end rule (PLAN §5.3, `strings`) lets an unterminated string run onto the next line in three cases.** The cases are a line ending in `\'`, a line ending in `\`, and a line ending right after the opening quote. In each, every quote after it on the following lines flips between string and code. The rules were probed with vscode-textmate and vscode-oniguruma from the scratch install. cep's lexer rejects all three (`lexer.go:28`; a scratch copy of the rules on participle v2.1.4 gives a lexer error for `'abc\'⏎x'`). A fix was also probed. Add a rule `'$`, scoped string plus `invalid.illegal.newline.cep`, before the single-quoted rule, and change the end to `(')|((?:\\.?|[^\\'\n])$)`. All three cases are then marked on their own line and the next line is clean. The double-quoted rule needs the same fix. → §5 P1, §6 (1–4).
9. **`2min` is a duration to cep but gets no colour from the plan.** cep lexes it `Number("2") Ident("min")` (probed with the scratch lexer; that the parser accepts it is inferred, since whitespace between tokens is optional). The plan's `\b[0-9]+…\b` number rule and `\b(?:ms|…)\b` unit rule both need a word boundary between `2` and `m`, and there is none (inferred from `\b`). → §5 P2, §6 (9).
10. **cep lexes `risk/2.5` (no spaces) as one version-pragma token.** `Pragma` (`lexer.go:25`) is tried before `Ident` (`lexer.go:31`). Probed: `Pragma("risk/2.5")`, while `risk / 2.5` and `Risk/2.5` lex as arithmetic. That is cep's to fix, not this repo's. The highlighter will show it as arithmetic. → §11 Q7.
11. **`expect given table X [ … ]` gets the table-declaration scope.** The `declarations` rule matches `table X` anywhere. Examples 01 and 07 use `given table SensitiveResources` and `given table RegisteredApps`. This is not in PLAN §5.3's known limitations. → §5 P3, §6 (25).
12. **The CRLF snapshot check in PLAN §6.2 cannot fail.** vscode-tmgrammar-test splits lines on `\r\n|\n` (`dist/unit/parsing.js:86`, `dist/snapshot/index.js:13`), and VS Code normalizes line endings, so a CRLF line tokenizes exactly like an LF line. The only CRLF proof that can fail is the `git ls-files --eol` check (PLAN §7 step 2). → card line 4.
13. **PLAN §7 step 6 needs a person at a VS Code window.** The coordinator cannot see the GUI. Install can be proven headless (card line 6), but colours, Ctrl+/ and auto-closing cannot. → the owner's check.
14. **This repo has no gate tiers, and the plan puts CI last.** cep's T0–T4 are `make` targets and git hooks. Here, CLAUDE.md rule 6 rules out shell-script hooks, and a hook manager would be a new dependency. Ground rule 13 wants the gate before the first feature, but PLAN §7 adds CI at step 8. Nothing reads `.nvmrc` locally, so a different Node can run `npm test` unnoticed. → §1, §11 Q5.
15. **Verified as the plan says:**
    - cep `main` = `1fa3a5bb…` (2026-11-08).
    - `keywordList` has 115 unique words; `reservedFuture` has 17 (`keywords.go:10-29`). Both blocks end at a line that is exactly `}`.
    - PLAN §5.3's table puts every word in exactly one of 11 categories, and `keywords-reserved` equals `reservedFuture`. The wrong-case paste list equals `keywordList` in order (scratch script).
    - Every caret in §6.1's verbatim `literals.test.cep` lands on the token it names (scratch script).
    - Packages:
      - vsce 4.0.0: MIT, 2026-09-14, `node >= 22`. 4.1.0 is from 2026-10-28.
      - vscode-tmgrammar-test 0.1.3: MIT, 2024-02-05.
    - Both test tools read `contributes.grammars` from `package.json` by default (`dist/common/index.js:93-108`) and expand their own globs.
    - Test-file parsing (`dist/unit/parsing.js`):
      - `<` plus *n* dashes covers columns 0 to *n* (`:47-48`).
      - The `SYNTAX TEST` header line is not tokenized (`:89`).
      - A `--` line counts as an assertion only when `^` or `<-` follows (`:92`).
    - VORSAR/cep is public, and the raw `keywords.go` URL returns 200 without a token.
    - CI actions: the checkout and upload SHAs equal cep's `gate.yml` pins, and `actions/setup-node` tag `v7.1.0` is commit `949feb24…`.
    - `torture/comments.cep` has 5 CRLF line endings and no final newline.
    - `vsce package` accepts `"private": true` (probed).

## 1. Routine, shape, waves

**Full loop** (owner, D6). This is not a language change: the grammar only colours what cep defines. So the language-design skill does not apply; the coordinator's reading.

| Loop step | In S1 |
|---|---|
| 0 Plan check → G0 | This document, reviewed blind by the architect and QA, then §11 to the owner |
| 1–3 Design → G1 | The design is PLAN §5–§6 (v1). The panel (Q6) and the design review place each finding; PLAN §5–§6 become v2; the owner decides what is left |
| 4 Lanes | The coordinator lands the scaffold first, then W1 runs lane A and lane B at once (≤ 2 agents) |
| 5 Combine → G2 | Cherry-picks onto `s1/integration`, then T3 |
| 6 Slow checks | The 19 snapshots generated and reviewed; the `.vsix` built, checked and installed headless |
| 7–8 Review, break-it, one fix round → G3 | The architect on the combined diff; QA and the-fool try to break the grammar with hostile `.cep` input |
| 9 T4 | CI on a draft PR the owner opens (cep's rule for a sprint that adds a CI job) |
| 10–12 Owner's check, merge, close-out → G4, G5 | The card's owner's check; the owner merges; the record and retro |

**The gate here** (Q5): T0/T1 none · T2 = `npm test` exit 0 in the lane's worktree · T3 = `npm ci && npm test && npm run package && npm run test:vsix` on the combined branch · T4 = CI.

## 2. Seams

**S1 — the grammar's shape (lane B owns `syntaxes/cep.tmLanguage.json` → lane A reads nothing of it; `check-keywords.mjs` is in lane B).** The contract is PLAN §5.3: the 24-entry top-level list in that order, and the canonical `\\b(?:w1|…)\\b` and `(?i)\\b(?:…)\\b` match forms. The checker lives in the same lane as the grammar so the two cannot disagree across lanes.

**S2 — `package.json` (the coordinator → both lanes).** Every `scripts` entry, including `test:vsix` (Q4) and the toolchain step (Q5), lands in the coordinator's first commit, so no lane edits it. A script that names a file a lane has not written yet fails until the lane lands it.

**S3 — the vendored table (the coordinator → lane B; lane A re-produces it).** The first commit writes `test/upstream/keywords.go` with `git -C ../cep cat-file blob main:internal/parser/keywords.go`, plus `SOURCE`. Lane A's `sync-upstream.mjs` must then reproduce it byte for byte (a check that can fail).

## 3. Where each rule lives

| Rule | File | Built from |
|---|---|---|
| Token classes and their scopes | `syntaxes/cep.tmLanguage.json` | `lexer.go:21-35`, `keywords.go`, SPEC §2 |
| Comment toggles, brackets, auto-closing, word pattern | `language-configuration.json` | PLAN §5.2 |
| The grammar's keywords equal cep's table | `scripts/check-keywords.mjs` | PLAN §5.5.2 |
| Fixtures and table are cep's bytes | `scripts/sync-upstream.mjs` | PLAN §5.5.1 |
| cep `main` has not moved on | `scripts/check-upstream.mjs` | PLAN §5.5.3 |
| The `.vsix` holds exactly the extension | `scripts/check-vsix.mjs` (Q4) | §0 finding 5 |
| Node is the pinned version | `scripts/check-toolchain.mjs` (Q5) | §0 finding 14 |

## 4. Ownership — one owner per file

| Who | Owns |
|---|---|
| **Coordinator** (first commit, then combine) | `package.json`, `package-lock.json`, `.nvmrc`, `.npmrc`, `.gitignore`, `.gitattributes`, `.vscodeignore`, `.vscode/launch.json`, the placeholder grammar, `test/upstream/*` (first copy), every `*.cep.snap`, README, CHANGELOG, `docs/**` |
| **Lane A — tooling** | `scripts/sync-upstream.mjs`, `scripts/check-upstream.mjs`, `scripts/check-vsix.mjs`, `scripts/check-toolchain.mjs`, `test/tools.test.mjs`, `test/fixtures/**/*.cep` (by running sync), `.github/workflows/ci.yml` |
| **Lane B — grammar** | `test/unit/*.test.cep`, `scripts/check-keywords.mjs`, `test/checker.test.mjs`, `syntaxes/cep.tmLanguage.json` (after the placeholder), `language-configuration.json` |

## 5. Design notes and the panel (before code)

The design note is PLAN §5–§6. Under Q6's recommendation, a breaker re-derives the grammar's scope table and its test expectations from cep's sources (`lexer.go`, `keywords.go`, SPEC §2, the fixtures) without reading PLAN §5.3; the coordinator then diffs the two. The architect with the-fool reviews structure, and QA reviews testability. The panel answers:

- **P1 — E-STR-001.** Adopt the probed fix (§0 finding 8) for both quote styles? On a line ending in `\'`, should the error mark cover the escape (as probed) or only the quote?
- **P2 — `2min`.** Colour it as cep lexes it (a number, then a unit), or keep it as a known limitation? One way to colour it without breaking `check-keywords`' canonical unit rule is a `duration` rule before `number` that captures the count and the unit.
- **P3 — `given table X`.** Use a rule for `given table NAME` that scopes `NAME` as a reference, or list it as a known limitation?
- **P4 — Unicode.** Oniguruma's `\b` counts non-ASCII letters as word characters, and `(?i)` uses Unicode case folding (for example U+017F `ſ` folds to `s`), while cep's identifiers are ASCII only (`lexer.go:31`). Does any input then get a keyword or wrong-case scope that cep would reject at the lexer? (Inferred, not probed.)
- **P5 — triple quotes and auto-closing.** With `'` auto-closing, what does typing `'''` produce? Accept that, or add `'''` as its own pair?

## 6. Counter-examples (listed before coding; each becomes a unit assertion)

**Strings.**
1. `x 'it\'`, end of line → `\'` gets `invalid.illegal.newline.cep`; the next line `y 'z'` has a normal string.
2. `x 'abc\`, end of line → `\` gets the error; the next line is clean.
3. `x '`, end of line → `'` gets the error; the next line is clean.
4. Items 1–3 with `"`.
5. `''` → an empty string, with begin and end punctuation.
6. `''''''` → one empty triple-single string.
7. `'''a''''` → `'''a'''` is raw, and the last `'` opens a single-quoted string. cep's `RawString` is lazy (`lexer.go:27`).
8. `'\u12'` → `\u` gets `invalid.illegal.escape.cep`; `'é'` is one valid escape.

**Numbers and durations.**
9. `2min` → per P2.
10. `1e3` and `2.5e-3` are numbers; `1.` is a number and then an accessor.
11. `ts_min`, `x1` and `_min` have no unit or number scope.

**Comments.**
12. `a--b` → `--b` is a comment, as in cep (`lexer.go:22`).
13. `->` is never a comment.
14. `/* a */ */` → the second `*/` is `*` and `/`.
15. `/* /* x */ y` → the comment ends at the first `*/`.
16. `'/*'` is a string, not a comment.

**Keywords and names.**
17. `INTO` and `iNtO` are wrong-case.
18. `minimum(` is a function, not a unit.
19. `sort (` with a space is a window keyword.
20. `` `from` `` is a quoted name.
21. `${min}` is a param ref, not a unit.
22. `language CEP/0.1` has no version scope.
23. `risk/2.5` is arithmetic (Q7).
24. `stream` and its name on two lines → the name is plain (a known limitation).
25. `given table T [` → per P3.
26. `stream SeleCT (` → the stream-name scope (the accepted limitation in PLAN §5.3).

**Tooling.**
27. `sync-upstream` with a missing ref → exit 1.
28. A fixture that is no longer upstream → exit 1, with the file named.
29. A second sync run → no file changed.
30. `check-upstream` on a fetch failure → exit 1 (the design adds a test seam for the URL).
31. `check-vsix` on an empty package → exit 1.
32. `check-vsix` on a package carrying `test/` → exit 1.
33. `check-toolchain` with a Node other than `.nvmrc` → exit 1.

## 7. Test plan per lane

| Lane | Acceptance → proof |
|---|---|
| A | Card 4 → the sync run, the `SOURCE` line, the eol check, the second-run no-op · card 5 → `test/tools.test.mjs` (counter-examples 27–33) plus `npm run test:vsix` on the real package at T3 · card 7 → `check-upstream.mjs` exit 0 against cep `main` plus the changed-copy test · card 8 → CI at T4 |
| B | Card 1 → `npm run test:unit`, red first, then green · card 2 → `test:keywords` and `test:checker`, red first, then green |
| Coordinator | Card 3 → `test:snap` plus the review recorded · card 6 → the headless install |

*At "done":* each lane runs `npm test` (T2) and reads its exit code itself, and reports the red-first exit codes it recorded.

## 8. Risks and order

1. **The loop's overhead is large next to the change.** *Mitigation:* the panel is scoped (Q6); each lane fits one usage window.
2. **Reviewing 19 snapshots by hand is long and easy to skim.** *Mitigation:* the coordinator reviews against PLAN §6.2's list and records each check; at break-it, QA samples the snapshots independently.
3. **The packager's supply chain** (findings 2–4). *Mitigation:* Q2 and Q3.
4. **The breaker's grammar may disagree with PLAN §5.3 in many places.** *Mitigation:* design v2 places every difference, each with a test.

**Order:** the coordinator's first commit (S2, S3) → W1 with lane A and lane B → combine → T3 → snapshots → review and break-it → fix round → T4 → the owner's check.

## 9. Lane briefs (skeletons)

**Common to all:** your own worktree and branch; Node 26.13.0; write only your owned files (§4); commit early; never push or merge; no AI attribution anywhere; never call anything an owner decision unless the owner made it; "done" is `npm test` exit 0, read yourself; report to the session scratchpad as `s1/lane-<x>-report.md`, and your final message gives the commits, the red-first exit codes and the open items.

**Lane A — tooling** (general-purpose). *Goal:* the upstream, packaging and toolchain checks, and CI. *Read:* PLAN §5.4–§5.6, this §0 (findings 5, 12, 14), §6 (27–33). *Order:* tests first, red, then `sync-upstream` (and run it), `check-vsix`, `check-toolchain`, `check-upstream`, `ci.yml`. *Not in this lane:* `package.json`, the grammar.

**Lane B — grammar** (general-purpose). *Goal:* the grammar and the language configuration, with the tests written first. *Read:* PLAN §5.2, §5.3 and §6 (v2), `lexer.go`, `keywords.go`, SPEC §2, this §6 (1–26). *Order:* the 6 unit files, counter-examples, `check-keywords` and its tests, all run red against the placeholder (record the exit codes), then the grammar and the configuration. *Not in this lane:* snapshots, fixtures, `package.json`.

## 10. Reviews of this plan check

*The architect reviewer and the QA agent each read this draft blind before it goes to the owner. Each finding gets a disposition here.*

| # | Reviewer | Severity | Finding | Disposition |
|---|---|---|---|---|
| | | | *(pending)* | |

## 11. Questions for the owner (recommendation first)

- **Q1 Where do the sprint's documents live?** → **Here, as cep's naming does:** the card and plan check in `docs/sprints/s1-plan-check.md`, the reviews in `docs/reviews/`, the record in `docs/sprints/s1-record.md`. PLAN.md stays the design and the one status line, with no separate sprint-plan or decisions file. The other option is to mirror cep's full set (`sprint-plan.md`, `decisions.md`, `history.md`): more files for a one-sprint repo.
- **Q2 The packager carries a closed-source Microsoft component (finding 2).** → **Keep vsce 4.0.0 as a build-only tool, and add `.npmrc` with `ignore-scripts=true`.** That component never runs, never enters the repo or the `.vsix`, and packaging is proven to work without it (finding 7). Other options:
  - (b) Write our own small packager in Node, about 150 lines with `node:zlib`. No third-party packager, but we own a zip writer and the manifest format.
  - (c) No packaging in CI; the owner runs `npx @vscode/vsce package` on release day.
- **Q3 Transitive package ages and the four advisories (findings 3, 4).** → **Resolve the lockfile with `npm install --before=<the install day − 14 days>`, so that every one of the 160 packages is at least two weeks old, and record the four advisories as known issues.** The advisories are in login and glob code this repo never runs; the high one clears itself once its fix is two weeks old, on 2026-11-12. Other options:
  - (b) A plain `npm install`: newest versions, which clears the high advisory today, but some packages would be days old.
  - (c) Wait to build until 2026-11-13.
- **Q4 The `.vsix` check (finding 5).** → **Add `scripts/check-vsix.mjs`** (Node built-ins only; it reads the zip's file list) as `npm run test:vsix`, asserting the exact set of files, and use `vsce package --no-dependencies`. The other option is the plan's absence-only check, which an empty package passes.
- **Q5 The gate (finding 14).** → **T2 = `npm test`, T3 = `npm ci` + `npm test` + package + `test:vsix`, T4 = CI on a draft PR; no git hooks. `npm test` starts with `scripts/check-toolchain.mjs`, which fails unless Node equals `.nvmrc`. CI lands in the first wave, not last.** The other option is no toolchain check: a different Node could pass locally and fail in CI.
- **Q6 The design panel.** → **A breaker (an independent grammar from cep's sources, diffed against PLAN §5.3), the architect with the-fool, and QA on testability; no state-of-the-art challenger.** The one alternative to TextMate is semantic tokens, which need the language server, and D1 ruled that out for v1. The other options are the full three-reviewer panel with a challenger, or the architect and QA only.
- **Q7 cep lexes `risk/2.5` as a version pragma (finding 10).** → **Forward it to cep's known issues for you to schedule there.** The highlighter shows it as arithmetic, which is what the author meant. This repo never edits cep.
- **Decided as recommended, unless the owner objects:**
  - Lanes are run by fresh general-purpose agents in their own worktrees; the roster has no JavaScript or TextMate specialist.
  - PLAN §7 step 6's visual check becomes the owner's check (finding 13).
  - The branch is `s1/integration`, with one PR.
- **Owner's check additions** (refined from the diff at the end): none yet.
