# S1 — plan check: QA review (2026-11-08)

*Blind QA review of `docs/sprints/s1-plan-check.md` at cep-vscode `9a6eabd` (branch `s1/integration`), step 0 of the full loop. Sources: PLAN.md §5–§6 and CLAUDE.md at the same commit; cep `main` @ `1fa3a5bb` read through git only (`lexer.go`, `keywords.go`, `parse.go`, `lower.go`, `lowering_test.go`, SPEC §2 and App. F, `errors.md`, `grammar.lark`, the 19 fixtures); cep's sprint model §6, §8, §10, §13 and ground rules. I did not see the architect's findings. "Probed" means I ran it in this session; "inferred" means I read it but did not run it. Severity uses ground rule 15.*

**How I checked.** I built PLAN §5.3 v1 as a grammar JSON, plus a second version with the plan check's E-STR-001 fix (§0 finding 8). I ran every §6 counter-example, about 40 extra breaker inputs and all 19 fixtures through vscode-textmate and vscode-oniguruma from the scratch install. I ran the same inputs through a scratch Go lexer that holds cep's `rules` table and keyword list copied from `main`. I also ran the real `vscode-tmgrammar-test` and `vscode-tmgrammar-snap` 0.1.3 binaries against a placeholder, a mutant and the plan grammars in a scratch mini-extension. The scripts and outputs are listed at the end.

## Summary

- **1 blocker, 10 should-fix, 8 later.**
- The blocker: card line 3's proof passes when a snapshot is missing. `vscode-tmgrammar-snap` without `--updateSnapshot` writes any missing `.snap` and exits 0.
- Most should-fix items have the same shape. A proof or a test that cannot go red on the failure it is meant to catch. Three counter-examples have the wrong expected outcome.
- The plan check's probed claims that I re-ran all held: finding 8's fix, findings 9–12, and the table counts in finding 15.

## Evidence audit of the card's acceptance lines

For each line: the result that would show the line false, and whether the named proof can produce that result.

| Line | Falsified by | Can the named proof show it? | Grade |
|---|---|---|---|
| 1 Every token class has its scope | a token with the wrong scope, including a scope that must be absent | Only for positive assertions. Negative-only assertions are green on the placeholder. A misspelled excluded scope is green on any grammar (probed). → Q2 | C |
| 2 Keywords are exactly cep's table | a missing, extra or doubled word; wrong reserved set | Yes for the count line and checker tests 1–7. Tests 8–9 pass with no script at all. Rule (d) and the empty-table rule have no test. → Q3 | B |
| 3 The 19 fixtures tokenize as reviewed | a fixture whose tokens differ from the reviewed snapshot | No, when the snapshot is missing: the tool writes it and exits 0 (probed). Nothing counts 19. → Q1 | D |
| 4 The fixtures are cep `main`'s bytes | any vendored file that differs from `main`, or a missing file | No. No step compares bytes. The SOURCE line, one file's eol and a no-op second run all pass on a sync that read the wrong ref or dropped a file. → Q4 | C |
| 5 The `.vsix` holds exactly the extension's files | a missing or an extra file | Yes, if `check-vsix` asserts the exact set and runs on the real package (Q4 of the plan check). The "no `WARNING` line" half cannot be grepped in GitHub Actions. → Q15 | B |
| 6 The `.vsix` installs | an install that fails | Yes. It would also pass on an empty package, but line 5 covers that. Pass `--extensions-dir` to the list call too. → Q14 | B |
| 7 A keyword change in cep is caught | a changed `keywords.go` on `main` that exits 0 | Yes, given the URL seam. It covers `keywords.go` only, which is what the line claims. → Q18 | B |
| 8 CI runs the same checks | a T3 check that CI does not run | No. Green jobs cannot show that a check is absent. PLAN §5.6's `ci.yml` has no `test:vsix` step. → Q5 | D |

## Findings

### Q1 — blocker — card line 3; §7 (coordinator row); PLAN §6.2

**Finding.** `npm run test:snap` exits 0 when any `.snap` file is missing, because the tool writes a new one from the current grammar. A snapshot that was never committed, or a new fixture from a sync, passes T2, T3 and CI unreviewed. Nothing counts the fixtures or their snapshots, so 18 of 19 also passes.

**Evidence.** `vscode-tmgrammar-test/dist/snapshot.js:107-111` (no `.snap` → "Generating snapshot", `TestSuccessful`). Probed in the scratch mini-extension: with no `.snap`, the plan v1 grammar gave exit 0, and so did the fixed grammar. An existing snapshot does catch a grammar change: the v1 snapshot against the fixed grammar gave exit 255. This also breaks cep's quality-bar rule "a row that passes without its input is given that input in CI, by a test" (sprint model §10).

**Change.**
1. Add a check to `npm test`, red first by deleting one snapshot. It requires exactly 10 + 2 + 7 fixtures, a `.cep.snap` for each, and no orphan `.snap`. It can live in the tools tests or a small `check-fixtures` step.
2. In CI, after `npm test`, `git status --porcelain` must print nothing. That catches any generated file.
3. Record one red `test:snap` run from a one-scope grammar change, with its exit code, as the snapshot layer's red-first proof.
4. Card line 3's proof becomes: the count check exit 0, `test:snap` exit 0, a clean `git status`, plus the review record.

### Q2 — should-fix — card line 1; §6 (11, 13, 18, 21, 22, 24); §9 lane B

**Finding.** Card line 1 proves "red first" against the placeholder. But every negative assertion (`^ - scope`) is green on the placeholder, so the red run says nothing about them. The runner compares excluded scopes by exact string, so a misspelled excluded scope never fails on any grammar. That is a broken build that passes card line 1.

**Evidence.** `dist/unit/index.js:34-36` (`token.scopes.includes(s)`). Probed. A test file with only negative assertions exited 0 against the placeholder and 0 against the plan grammar. Against a mutant grammar (no `\b` on numbers and units, `(?i)`-like pragma), it exited 255 with four failures. The assertion `- keyword.other.units.cep` (misspelled) stayed green even on the mutant. The negative-only assertions are PLAN §6.1's `y`, `has`, `ts_min`, `int_value`, `intake`, and the plan check's 11, 22 and 24.

**Change.**
1. Write each negative case positively where the token has a scope. For 22, `/` → `keyword.operator.arithmetic.cep` and `0.1` → `constant.numeric.cep`. Both go red if the pragma wrongly matches.
2. For plain identifiers, add a recorded red run against one named mutant grammar. PLAN v1's string end rule covers the E-STR-001 cases. Dropping `\b` from the number, unit and text rules covers 11 and `intake`. List which assertions turned red.
3. Add a lint, red first, in the checker tests. Every scope named in `test/unit/*.test.cep`, required or excluded, must be one the grammar emits.
4. Record the failing-assertion count per file for each red run, not only the exit code. PLAN §7 step 3 already asks for failures in every file.

### Q3 — should-fix — card line 2; §6 (27, 30–33); §7 lane A; PLAN §6.3 tests 8–9

**Finding.** Checker tests 8–9 and tooling counter-examples 27, 30, 31, 32 and 33 assert only "exit 1". Node exits 1 when the script file does not exist, or when the script crashes. So these tests are green before the script is written and cannot be shown red first. Two checker rules have no test: (d) "a category word is not in `keywordList`", and "fail if either list is empty".

**Evidence.** Probed: `node scripts/check-keywords.mjs` with no such file → exit 1, and an uncaught throw → exit 1. PLAN §5.5.2 step 1 and step 3(d) against §6.3 tests 1–9.

**Change.**
1. Every exit-1 test also asserts the script's own message. Per PLAN §5.5 it starts with the script name, for example `check-keywords:`, and it names the input.
2. Every script's tests include an exit-0 case.
3. Add checker tests:
   - add `month` to `keywords-unit` → status 1, names `month` (rule d; `month` is SPEC §2.4's calendar trap);
   - a keyword file without the `keywordList` block → status 1, names `keywordList`;
   - an unparsable grammar JSON → status 1 with a `check-keywords:` line.
4. For red first, run the tests once against a stub script that always exits 0, and record the result.

### Q4 — should-fix — card line 4; §2 S3; §7 lane A

**Finding.** The proof never compares the vendored files with cep `main`. A sync that read the working tree or the wrong ref, wrote 18 files, or dropped an invalid fixture would still pass. It would still write the SOURCE line, keep `comments.cep`'s eol, and change nothing on a second run. PLAN §5.5.1 warns about exactly the working-tree mistake.

**Evidence.** By reading card line 4. cep's checked-out branch (`s3-3-2/integration`) has no diff from `main` in these paths today (`git diff --stat main HEAD`, empty), so a working-tree bug would be invisible now. Inferred.

**Change.** The proof should compare all 20 files, the 19 fixtures plus `keywords.go`: `git hash-object <file>` must equal `git -C ../cep rev-parse <sha>:<path>`, with the counts 10, 2, 7 and 1. Red first by flipping one byte. "A second run changes nothing" should read: `git status --porcelain test/` prints nothing after the second run.

### Q5 — should-fix — card line 8; Goal; §7 lane A; PLAN §5.6

**Finding.** "CI runs the same checks" is proven by "both CI jobs green", which cannot show that a check is missing. PLAN §5.6's `ci.yml` runs `npm run package` but not `test:vsix`, and the plan check does not add it. The goal says the `.vsix` is "checked by CI".

**Evidence.** PLAN §5.6 against the T3 line in plan check §1. Inferred.

**Change.**
1. Name the CI steps: `npm ci`, `npm test` (which includes the toolchain and tools tests, see Q6), `npm run package`, `npm run test:vsix`, then `git status --porcelain` empty (Q1).
2. Prove it with a tools test that reads `ci.yml` and requires each T3 command as a `run:` step. It is red first against PLAN §5.6's file.
3. On the draft PR, read each step's log, not only the green tick.

### Q6 — should-fix — §2 S2; §4; §6 (27–33); §7 lane A

**Finding.** The plan check never says that `npm test` runs `test/tools.test.mjs`, and PLAN §5.1's `test` script does not. Counter-examples 27–33 also need a world of their own:
- `sync-upstream` writes into this repo's `test/` and reads `../cep`, which CI does not have.
- `check-vsix` needs a package path.
- `check-toolchain` needs a version to compare.

Only check-upstream's URL seam is planned.

**Evidence.** Plan check lines 84, 90, 111 and 173; PLAN §5.1 and §5.5.1. Inferred.

**Change.**
1. Write the final `scripts` block into S2, with the tools tests inside `test`.
2. Give `sync-upstream` an output root (the current directory, or `--out`).
3. Have the tools tests build a throwaway git repo as the "cep clone", so they never need `../cep` or touch the real tree.
4. Give `check-vsix` a path argument and `check-toolchain` an `.nvmrc` path argument.

### Q7 — should-fix — §6 counter-example 24

**Finding.** The expected outcome is wrong. With `stream` at the end of one line and `Foo (a string)` on the next, `Foo` gets `support.function.cep`, not plain. The `function-call` rule matches a name followed by `(`. cep's grammar always puts `(` after a stream or table name, so this is the natural form. It is valid cep.

**Evidence.** Probed: `"Foo" → support.function.cep`. cep lexes `Keyword(stream)`, `Ident(Foo)`, `Punct(()` (`grammar.lark:26-27`).

**Change.** Expected: `Foo` → `support.function.cep`, as a known limitation added to PLAN §5.3. Alternatively, the panel decides on a multi-line declaration rule. Test input: `stream` ⏎ `Foo (a string)`.

### Q8 — should-fix — §6 counter-example 7

**Finding.** "the last `'` opens a single-quoted string" conflicts with the P1 fix. At the end of a line, that `'` is matched by the new `'$` rule. It gets `string.quoted.single.cep invalid.illegal.newline.cep` and no begin punctuation. cep rejects it at the lexer.

**Evidence.** Probed with the fixed grammar. cep lexer: `RawString("'''a'''")`, then `lexer: invalid input text "'"` at 1:8.

**Change.** Expected: `'''a'''` → `string.quoted.triple.single.cep`, and the final `'` → `string.quoted.single.cep invalid.illegal.newline.cep` (E-STR-001).

### Q9 — should-fix — §6 counter-example 8; §9 lane B

**Finding.** "`'é'` is one valid escape" is wrong. That string holds a literal `é` and no escape. It looks like `'\u00e9'` lost its backslash-u on the way into the file. I saw the same thing in this session: `\u00E9` and `\uABCD` that I typed into tool input arrived as the characters themselves. The backslash-u escape has one test line in the whole plan (PLAN §6.1 `'caf\u00e9'`) and no fixture. So the same corruption in lane B's file would leave that escape class untested.

**Evidence.** Plan check line 134 bytes (`od`) show `'é'`. Probed: the tool-input decoding (my case file came out with 0 matches for `u00e9`). `grep` over the 19 fixtures finds no `\u` escape. cep: `'\u12'` is E-STR-002 (`lowering_test.go:39`). `strconv.ParseUint(…, 16, 32)` accepts upper-case hex (`lower.go:554`).

**Change.**
1. Expected: `'\u00e9'` → `\u00e9` gets `constant.character.escape.cep`.
2. Add `'\u00E9'` (valid) and `'\U00e9'` → `\U` gets `invalid.illegal.escape.cep`.
3. Add a line to the lane briefs: after writing any file with a backslash-u escape, check its bytes (for example `grep -c 'caf\\u00e9' test/unit/strings.test.cep` prints 1).

### Q10 — should-fix — §0 finding 8 / P1 against PLAN §6.2 (`e-str-001` item)

**Finding.** PLAN §6.2's only check for this fixture, "the last character of line 6", passes on the v1 grammar too. But v1 is broken on this very fixture. Line 7 ends in `'`, which opens a new string, and most of line 8 (`  from S[a == `) is coloured as a string. The plan check fixes the grammar but not the review list, so the snapshot review would accept a broken snapshot.

**Evidence.** Probed. The v1 snapshot against the fixed grammar fails at lines 7–8 (exit 255). Of the 19 fixtures, this is the only one the fix changes.

**Change.** Add to §6.2:
- line 7's final `'` carries `invalid.illegal.newline.cep`;
- on line 8, `from` is `keyword.control.clause.cep`;
- on line 8, `'x'` is a closed string, with begin and end punctuation.

### Q11 — should-fix — §5 P1; §6 (missing case)

**Finding.** When an unterminated string ends in spaces or a tab, the E-STR-001 mark lands on that last space or tab. Both owner's-check themes colour `invalid` by foreground only, so the error is invisible. That happens with both the v1 rule and the probed fix. Trailing whitespace is common, and it is a breaker's first try.

**Evidence.** Probed: `x 'abc␠␠` gives `" " → … invalid.illegal.newline.cep`, and `x 'abc⇥` gives `"\t" → …`. VS Code 1.145.2 theme files: `dark_vs.json` has `invalid` with `foreground #f44747`, `light_vs.json` has `foreground #cd3131`. Dark Modern and Light Modern include them through Dark+ and Light+.

**Change.** Add counter-examples:
- `x 'abc␠␠` → the mark covers a visible character;
- `x '␠␠` → the same;
- the next line is clean in both.

A probed variant does this: the rule `'\s*$`, and the end `(')|((?:\\.?|[^\\'\s])\s*$)`. It marks `c␠␠`, `'␠␠` and `\'␠␠`, and still handles cases 1–3, `'''a''''` and `'a  b'`. The double-quoted rule needs the same change. The panel decides under P1.

### Q12 — later — §6 (missing breaker cases)

These pass with the plan grammar as probed, unless marked as a divergence. They pin the edges a breaker tries first. Each has the expected scopes and cep's lexer result.

| Input | Expected | cep lexer (probed) |
|---|---|---|
| `x ''''` ⏎ `y 'z'` | **Divergence.** TextMate opens a raw string that swallows the rest of the file. cep sees two empty strings. Pin the chosen behaviour and list it as a known limitation. | `String('')`, `String('')`, then line 2 normal |
| `/**/ y` and `/*/ y */ z` | `y` and `z` have no `comment.block.cep` | Comment, then Ident |
| `/* open` ⏎ `stream T (a string);` | line 2 is all `comment.block.cep`. A unit case; today only the e-cmt-001 snapshot covers it. | BadComment |
| `x -- don't` ⏎ `y 'z'` | `don't` is comment; line 2 has a normal string | Comment |
| `'a\\' 'b'` | `\\` escape, then `'` end, then a second string | two Strings |
| `'\''`, `"it\'s"`, `'say \"hi\"'` | each escape is `constant.character.escape.cep` | Strings |
| `'\u00e'`, `'\u'` | `\u` → `invalid.illegal.escape.cep` | Strings (E-STR-002 is static) |
| `SELECTED Select_ _FROM FROM1 fromx` | no `invalid.illegal.keyword-case.cep` | plain Idents |
| `session_id ordered` | no `invalid.illegal.reserved.cep` | plain Idents |
| `GROUP` | `invalid.illegal.keyword-case.cep`, not reserved | MixedKeyword; E-KW-002 (`parse.go:161-162`) |
| `stream Foo(a string)` | `Foo` → `entity.name.type.stream.cep`, not `support.function.cep` | Ident |
| `language` ⏎ `cep/0.1;` | **Divergence.** No version scope on line 2. Add as a known limitation. | `Pragma("cep/0.1")` on line 2 |
| `a<--b` | `<` comparison, then `--b` comment | Cmp, Comment |
| `'it''s'` | two closed strings (the SQL habit) | two Strings |

### Q13 — later — §0 finding 12 against PLAN §6.2 (`comments.cep` item)

**Finding.** The plan check rightly says that "the CRLF lines tokenize like the LF lines" cannot fail. But the item stays in PLAN §6.2's list, and the record will tick it as evidence.

**Change.** In PLAN v2, mark it "not a test; card line 4 is the CRLF proof".

### Q14 — later — card line 6

**Finding.** `--list-extensions` without the same `--extensions-dir` lists the owner's own extensions. If the owner has installed `vorsar.cep` before, the proof passes even when the scratch install failed.

**Change.** Use `code --extensions-dir <scratch> --list-extensions --show-versions`, which prints `vorsar.cep@0.1.0`. The `code` CLI is present (1.145.2).

### Q15 — later — card line 5

**Finding.** In GitHub Actions, vsce prints warnings as `::warning::<msg>` on stdout, with no `WARNING` text. A grep for `WARNING` in CI therefore cannot fail.

**Evidence.** `@vscode/vsce/out/util.js:206-212`.

**Change.** State that "no `WARNING` line" is a local read at T3. If CI should check it too, match `::warning::`.

### Q16 — later — §5 P2

**Finding.** If P2 adds a `duration` rule that lists the unit words, that list sits outside `check-keywords`, because only `keywords-*` keys are parsed. It could drift from `keywords-unit` unnoticed.

**Change.** If P2 takes the rule, the checker also checks that its unit list equals `keywords-unit`, with a test.

### Q17 — later — card scope item 4; §7 lane B

**Finding.** `language-configuration.json` has no automated test, only the owner's hand check. A JSON error makes VS Code ignore the file silently.

**Change.** Add a small test, red first before the file exists. It parses the file, compiles `wordPattern` as a JS `RegExp`, and asserts `comments.lineComment === "--"` and the block pair.

### Q18 — later — §6 counter-example 30; card line 7

**Finding.** Node's `fetch` accepts `data:` URLs but not `file:` URLs, so the URL seam needs one of three things: a `data:` URL for the changed copy, a closed local port for the fetch failure, or a `node:http` server for a non-200 response. PLAN §5.5.3 calls non-200 a failure, but no test covers it.

**Evidence.** Probed: `data:` → 200; `file:` → "not implemented... yet".

**Change.** Add "404 → exit 1, message names the status" to 30.

### Q19 — later — §1 T3; §4 (inferred)

**Finding.** vsce collects files from disk with `dot: true`, and `.vscodeignore` patterns match from the repo root. So a lane worktree inside the repo folder, such as `.claude/worktrees/…`, would be packaged. Q4's exact-set check would turn T3 red, which fails safe but costs a round.

**Evidence.** `@vscode/vsce/out/package.js` `collectAllFiles` (`dot: true`). Inferred.

**Change.** Keep the worktrees outside the repo folder, or add `.claude/**` to `.vscodeignore`.

## Checked and found sound

- §0 finding 8: re-probed. Cases 1–4 (both quote styles) are marked on their own line, and the next line is clean. The fix leaves `'a\'b'`, `'a\\'`, `'\''` and `'it''s'` correct.
- §0 finding 9: cep lexes `2min` as `Number("2")`, `Keyword("min")`. The grammar gives it no scope (probed).
- §0 finding 10: `risk/2.5` → `Pragma("risk/2.5")`; `language CEP/0.1` → Keyword, Ident, `/`, Number (probed).
- §0 finding 11: `given table` gives `SensitiveResources` and `RegisteredApps` the table scope in examples 01 and 07 (probed on the fixtures).
- §0 finding 12: the runner splits lines on `\r\n|\n` (`dist/unit/parsing.js:86`, `dist/snapshot/index.js:13`). `comments.cep`'s CRLF lines tokenize like the LF lines (probed).
- §0 finding 15, table claims: 115 unique words; 17 reserved; both blocks end at a line that is exactly `}` (lines 22 and 29). The PLAN §5.3 categories are 11, with no word doubled or missing. `keywords-reserved` equals `reservedFuture`. The wrong-case list equals `keywordList` in order (script).
- §0 finding 15, test-file parsing: `<` plus dashes, the header line, and the `--` assertion rule are as stated (`parsing.js:47-48, 85-92`). Excluded scopes are compared by exact string (`unit/index.js:34-36`), which is what Q2 rests on.
- PLAN §6.1's verbatim `literals.test.cep`: the real runner gives exit 0 against PLAN v1 and against the fixed grammar, and exit 255 with 31 failures against the placeholder.
- The fix changes one of the 19 snapshots (e-str-001). No valid example gets any `invalid.*` scope under either grammar. The only function scopes in the fixtures are `chain`, `coalesce`, `count`, `math:round` and `sum` (probed).
- Counter-examples 1–6, 10–23, 25 and 26: the expected outcomes match the probe and cep's lexer, or are the panel's stated question.
- P4, answered by probe: `ſelect`, `Key` (Kelvin sign), `seßion` and `ﬁrst` get the wrong-case scope through Unicode folding, and cep rejects every one at the lexer. A non-ASCII letter next to a keyword removes its scope, and cep rejects those inputs too. No input cep accepts gets a different scope. No harmful divergence.
- Escapes: upper-case hex (`\u00E9`) is valid in both cep (`lower.go:554`) and the grammar. `\U`, `\u00e'` and `\u00g0` are invalid in both (probed).
- `GROUP` gets the wrong-case scope, which matches cep's E-KW-002 (`parse.go:161-162`).
- Edges handled like cep (probed): an unterminated block comment runs to the end of the file, like `BadComment`; `comments.cep`'s last line has no newline and is a comment; a leading BOM still gives the pragma scope.
- Empty or mistyped globs cannot pass: both runners exit 255 on "no test cases" (`unit.js`, `snapshot.js:76-79`). An empty `.cep` file renders and compares cleanly (inferred from `renderSnap`).
- §0 finding 5's mechanism: vsce answers "y" to the LICENSE prompt when stdout is not a TTY (`util.js:68-70`), so an empty package does exit 0.
- §0 finding 6: the "is large" note is part of the file-tree output, not `log.warn` (`util.js:355-356`).
- Test material covers every `lexer.go` token class and all four error scopes. The thin spots are named in Q9 and Q12: the backslash-u escape (one unit line), E-STR-002 (unit only; cep has no invalid fixture for this static error), double-quoted E-STR-001 (counter-example 4 only), and BadComment (fixture only).

## Probes (all under the session scratchpad)

- Grammar builder (PLAN v1 and the fixed version): `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/build-grammar.mjs` → `plan-v1.json`, `plan-fixed.json`, `plan-ws.json` (the Q11 variant), `mutant.json`, `placeholder.json`, all in the same folder.
- Tokenizer, which splits lines like the test runner: `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/tm.mjs`.
- cep lexer copy (participle v2.1.4, offline): `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/lex/main.go`.
- Cases and outputs: `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/cases-*.txt` and `out-*.txt`. The fixtures and their tokenizations are in `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/fx/`.
- Real-runner runs (unit and snapshot): `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/qa/mini/`. Outputs are in `unit-*.out`, `lit-*.out` and `snap-*.out` in the qa folder.
