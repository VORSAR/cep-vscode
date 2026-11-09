# S1 — design review: architecture (2026-11-09)

*Architect reviewer, with the-fool in pre-mortem mode. Design wave 2, step 2 of the full loop. I read PLAN §1 and §4–§6 at v1.1, the plan check v2, the S1 record, the breaker's report and files, the built scaffold, and cep at `main` = `1fa3a5b` through git only. I did not read QA's design files. Nothing was edited or committed in either repo.*

*Filed by the coordinator from the reviewer's returned report, 2026-11-09. The coordinator re-checked three claims: candidate `c2.json` against the breaker's grammar (0 differing runs on the 42 counter-examples; 2 on the fixtures, both D6); PLAN's verbatim `literals.test.cep` (c2 exit 0, breaker exit 255 at 19:8); and D-A8 (VS Code 1.145.2's `COLOR_THEME_DARK="Dark 2026"`, `COLOR_THEME_LIGHT="Light 2026"`). The scratch files named below were in the session scratchpad (`s1/design-arch/`).*

*In the evidence below, "A" is QA's `plan-fixed.json`: PLAN §5.3 v1 plus the plan check's probed E-STR-001 fix. "B" is the breaker's `grammar.json`.*

## Answer to question 1: adopt (c), a mix

**Recommendation.** Keep PLAN §5.3's skeleton, its eleven `keywords-*` keys, the `(?i)` wrong-case rule with ordering rule 4, calls after keywords, and the check-keywords model. The grammar stays hand-written, so there is no build step. Take from the breaker only the constructs that fix valid cep or remove a failure mode:

1. **ASCII word edges.**
   - Keyword rules use `(?<![A-Za-z_])(?:…)(?![A-Za-z0-9_])`.
   - The number rule is cep's own pattern with only a leading edge: `(?<![A-Za-z0-9_])[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?`.
   - A new unscoped `identifier` rule (`[A-Za-z_][A-Za-z0-9_]*`) goes after `function-call`. These edges need it: without it, `x1min` and `ab2sec` colour `min` and `sec` as units (probed).
   - This fixes P2 with no extra duration rule, so Q16 (checking a second unit list) disappears.
2. **Bounded cross-line regions** for `language`, `stream`, `table`, `rule`, `param`, `into`, `given` and `@`.
   - Each begins at its keyword. Its end is `(NAME)|(BACKTICKED)|(?=\S)`, with `applyEndPatternLast`, and its only inner pattern is `#comments`.
   - These replace the one-line `pragma`, `declarations`, `insert-target` and `annotation` rules.
   - They fix P3, P7 and the pragma half of P8.
3. **The declared name excludes keywords**, using grammar.lark's own NAME lookahead: `(?!(?i:<the 115 words, keywords.go order>)(?![A-Za-z0-9_]))[A-Za-z_][A-Za-z0-9_]*`. This is the same paste list as the wrong-case rule. The cross-line regions need it (D-A4).
4. **E-STR-001 as a `match`** from the opening quote to the end of the line, listed before a begin/end rule whose begin requires a closing quote on the line (by lookahead). It cannot cross a line by construction (P1). How much it marks is the owner's choice (P1/D8).
5. **`\u` with 0–3 hex digits** is one invalid escape.
6. **Namespaced calls allow spaces around `:`** (cep treats them as trivia).

**Not adopted:**
- the explicit `[sS][eE]…` case classes: they only matter for Unicode spellings, which cep rejects at the lexer anyway, and P4 is closed;
- calls placed before keywords with a keyword exclusion: this is needed only for `` `math`:`round`( ``, which stays a known limitation;
- the `#main` indirection;
- the generator.

**Evidence.** I built this as `c2.json` (18,429 bytes) and ran it.
- **Against cep's lexer** (the breaker's comparator, adapted to read `keywords-*` keys):
  - On the 36 corpus files, the only 2 disagreements are D6: the backticked declared name keeps the stream-name scope, on purpose. B has 0; A has 5.
  - On the 85 cases there are 11 disagreements. They are the breaker's own 4 gap cases (4, 5, 35, 36), plus D6 (case 49), plus two inputs cep refuses (`@select`, `math:min(`).
- **Against B** (coordinator's `diff.mjs`):
  - the 42 counter-examples: 0 differing runs;
  - the 19 fixtures: 2 runs, both D6;
  - my 18 valid variants: 2 runs (D6, and `` `math`:`round`( ``).
- **A against B** on the same 18 valid variants: 29 differing runs. cep's real parser accepts all 18.
- **PLAN's verbatim `literals.test.cep`**, run with the real `vscode-tmgrammar-test`: A, c1 and c2 exit 0. B exits 255, failing at 19:8 (`` `agent-events` `` lacks `entity.name.type.stream.cep`).
- **The check.** A prototype checker (`check-c.mjs`, about 25 lines) prints `ok (115 keywords, 17 reserved, 11 categories, 5 name-exclusion copies)`. It fails with rule (h) when `week` is removed from one copy.

**How the three compare.**

| | (a) PLAN §5.3 + P1 fix | (b) breaker | (c) mix (`c2`) |
|---|---|---|---|
| Valid cep, against cep | wrong: `given table X` (5 runs in examples 01, 07); split or commented declarations; `5min`; spaced `@`; spaced `ns : f(` | right, except D6 (fails PLAN's own unit test) | right; D6 kept as v1.1 |
| Invalid or incomplete input | a keyword or `SeleCT` after `stream` shows as a name | shows the keyword or the error | same as (b) |
| Size and review | 9,426 B; longest regex 840 chars | 43,695 B; 10 case-class copies of the list; longest regex 5,920 chars; readable only through the generator | 18,429 B; longest 906 chars; 6 identical copies of the list, all machine-checked |
| Runaway regions | none, but v1's string end bleeds (P1) | regions hold only whitespace and comments; probed | same as (b) |
| Backtracking and speed (41,401-line file; worst 20k-char line) | 1,209 ms; 25.8 ms | 1,873 ms; 46.5 ms | 1,495 ms; 24.3 ms |
| check-keywords | works as specified | its forms cannot be checked by parsing; needs generate-and-compare | new canonical forms, a new (g) list, and rule (h) |
| "No build step" (§1) | kept | broken: a generator, a committed output and an equality check | kept |

In all three, no input made a region run away or backtrack badly. The only regions that reach the end of the file are an unclosed `/*` (as in cep) and an unclosed `'''`, which is a shared known limitation.

**The cost of (c).** When cep adds a keyword, someone edits one category and six identical lists, and the checker names any list they missed. A generator would hold one copy, but it changes §1. If the owner prefers it, that is the owner's call.

## Findings

**D-A1 · blocker · PLAN §5.3 `declarations` / plan check P3.**
- **Finding:** v1.1 still gives `X` in `expect given table X` the table-declaration scope. Valid cep in two shipped examples shows a reference as a declaration.
- **Evidence:** `diff.mjs` over the 19 fixtures shows `[5] A: entity.name.type.table.cep → B: -`, for example `examples__01:36:22 "SensitiveResources"` and `examples__07:17:22 "RegisteredApps"`.
- **Recommendation:** a `given` region that consumes `table` (Q1 item 2). It also handles `given` and `table` on separate lines (`valid/v11-given-split.cep`).

**D-A2 · blocker (as v1.1 stands) · §5.3 `strings` / P1.**
- **Finding:** v1.1 keeps v1's end pattern for unclosed strings, which lets three kinds of unclosed string bleed onto later lines (plan check §0 finding 8). Patching the end regex works, but it keeps an unclosed string as a region that only a regex trick can stop.
- **Evidence:** plan check finding 8, and the coordinator's harness check (8 runs on e-str-001 lines 7–8, v1 against plan-fixed). With the match construction, c2 and B agree on all 42 counter-examples, items 1–5 included (0 differing runs).
- **Recommendation:** Q1 item 4. The note in §6.1's strings test ("make this the file's last source line") then goes away.

**D-A3 · should-fix · §5.3 `declarations`, `pragma`, `insert-target`, `annotation` / P7, P8.**
- **Finding:** valid cep with a line break or a comment between a keyword and its name gets the wrong scope or none:
  - `stream` then `U (…)` on the next line, `stream /* c */ U (`, and `table` then `L (…)`: the name shows as `support.function.cep`;
  - `rule` then `R`, `param` then `grace`, `insert` then `into T`, `into` then `T`, `language` then `cep/0.1`, and `@ sink(…)`: wrong scope or none.
  - The workaround is to keep each declaration on one line.
- **Evidence:** `valid/v02–v07`, `v12–v14`; cep's parser says OK for each; A gets them wrong and B and c2 get them right (`DIFF_ALL=1 diff.mjs … valid/*.cep`).
- **Recommendation:** Q1 item 2.

**D-A4 · should-fix · §5.3 declarations and known limitations.**
- **Finding:** declared names do not exclude keywords. This has three effects:
  - `stream events (…)` shows `events` as a valid-looking stream name, although cep rejects it (E-KW-001). This is a likely mistake for a new author.
  - §5.3's limitations say the wrong-case rule covers "the wrong-case-identifier half of E-KW-001", but its declarations rule overrides that (`stream SeleCT`).
  - If D-A3 is fixed with cross-line regions but no exclusion, a bare `stream` typed above an existing `rule R` turns `rule` into a stream name and drops R's rule colour.
- **Evidence:** `tok.mjs c1.json -e "stream\nrule R"` gives `"rule" → entity.name.type.stream.cep`; c2 gives `rule` → declaration and `R` → rule name. Against cep's lexer, c1 has 4 corpus disagreements and c2 has 2.
- **Recommendation:** Q1 item 3. Update §5.3's limitations and §6.2's last bullet: `select` now shows as a keyword and `SeleCT` as the case error.

**D-A5 · should-fix · §5.3 `number` and `keywords-*` / P2.**
- **Finding:** `within 5min`, `ttl 1hour`, `param p duration = 1hour 30min`, `bounded 2min` and `delay(5min)` are valid cep, but both the number and the unit stay uncoloured. The documented `5 min` is the workaround.
- **Evidence:** `valid/v01`, `v10`, `v17`, `v18` all parse OK with cep. A leaves them plain; B and c2 colour a number and a unit.
- **Recommendation:** Q1 item 1 (ASCII edges plus the identifier rule). Note the coupling: digit-friendly edges without the identifier rule colour `min` inside `x1min` (probed with `c2-noident.json`).

**D-A6 · should-fix · §5.5.2, §6.3, seam S1.**
- **Finding:** check-keywords is tied to the `\b(?:…)\b` and `(?i)\b(?:…)\b` forms and to v1.1's 24-entry skeleton. B's case-class regex cannot be parsed back into words, and its top level goes through `#main`. Under (c) the forms, the skeleton and the list copies all change.
- **Evidence:** B's `keyword-case` is 3,754 chars; the prototype in `check-c.mjs` handles (c).
- **Recommendation:** v2 restates seam S1 and §5.5.2 step 2 with the new forms, and updates the (g) constant to c2's 23 entries. It adds rule (h): every `(?!(?i:…)` list equals `keywordList` in order. §6.3 test 6 gets a new non-canonical mutation, such as the old `\b` form. The checker should also either enforce §5.3's "words in the order listed" MUST, or the plan should drop it, since rules (a)–(g) only compare sets (D-A18).

**D-A7 · should-fix · PLAN §1.**
- **Finding:** taking B as it stands would break "no build step" and readable review, and it changes approved v1.1 behaviour (D6).
- **Evidence:** 43,695 bytes; the 115 words appear 10 times as case classes; 11 strings over 200 chars; it fails `literals.test.cep` at 19:8. Its `build.mjs` also reads `lex/rules.go`, a hand-merged copy, not `test/upstream/keywords.go`.
- **Recommendation:** do not adopt (b) as it stands. If the owner wants a generator, rewrite §1 to say so: a committed output and a check in `npm test` that it equals what the generator writes. The coordinator then edits S2 before W1.

**D-A8 · should-fix · card, "Owner's check" / P6, plan check §0 finding 16.**
- **Finding:** VS Code 1.145.2's default themes are now **Dark 2026** and **Light 2026**, not Dark Modern and Light Modern, which the plan measured.
  - In Dark 2026, `and`, `not` and `has_ci` get `#D4D4D4`, the same as `=`, so they still look like names.
  - Stacking `keyword.operator.wordlike.cep` after the category scope gives `#569CD6` in Dark 2026 and Dark Modern, and `#0000FF` in Light 2026 and Light Modern.
- **Evidence:** `workbench.desktop.main.js` contains `COLOR_THEME_DARK="Dark 2026"` and `COLOR_THEME_LIGHT="Light 2026"`. Colours were computed with VS Code's own vscode-textmate 9.3.2 and its theme files (`colours.mjs`, `c2-wordlike.json`).
- **Recommendation:** run the owner's check in Dark 2026 and Light 2026 as well. For P6, see the owner's questions below.

**D-A9 · should-fix · §5.5.3 / D4.**
- **Finding:** the upstream job compares only `keywords.go`. `lexer.go`'s `rules` table, which every non-keyword token class in §5.3 mirrors (PLAN §3), is not watched. Several changes cep may make in its lexer or parser have just been forwarded to it: F1, and the breaker's cep findings 2 and 4.
- **Evidence:** `git log main -- internal/parser/lexer.go`: one commit (`c364f42`, 11-04), the same one that last changed `keywords.go`.
- **Recommendation:** vendor `lexer.go` too, and have `check-upstream` compare both files (one list, the same messages). This extends D4, so it is the owner's call.

**D-A10 · should-fix · the breaker's test material.**
- **Finding:** the "Scopes" in `expected.md` are B's own output, so copying them into unit tests makes B's choices and any of its bugs the spec. `compare.mjs` is also a partial oracle:
  - it accepts any name scope for a plain name, so it would pass D-A1;
  - it requires the E-STR-001 mark on the opening quote, which builds D8 in.
- **Evidence:** `gen-expected.mjs` tokenizes with `grammar.json` (line 16) and calls `compare.mjs` on it; `NAME_SCOPES` in `compare.mjs`.
- **Recommendation:** derive each new unit assertion from cep's lexer tokens and v2's decisions, after the D-list is settled.

**D-A11 · should-fix · §5.5.4 (d), §5.5.6, §5.4 `.gitignore`.**
- **Finding:** a `.DS_Store` that Finder drops in `test/fixtures/**` turns `npm test` red through check-fixtures rule (d), and the gate red through check-clean.
- **Evidence:** `.DS_Store` files exist on this machine (`/Users/ramith/code/cep/.claude/.DS_Store`, `/Users/ramith/code/.DS_Store`). The global ignore file holds only `**/.claude/settings.local.json`.
- **Recommendation:** add `.DS_Store` to `.gitignore`, and have check-fixtures list on-disk files with `git ls-files --cached --others --exclude-standard`.

**D-A12 · should-fix · card scope item 8.**
- **Finding:** re-resolving the lockfile on or after 2026-11-13 has no acceptance line and no done-done box, so nothing proves it before T3.
- **Evidence:** card lines 1–9 and the record's done-done block.
- **Recommendation:** add a line: `npm ls @azure/identity` shows ≥ 4.14.1, and the `npm audit` output is recorded.

**D-A13 · later · S2 `test:vsix`.**
- **Finding:** the script hard-codes `cep-0.1.0.vsix`. After a version bump, the local gate checks a stale ignored file from an older run; CI would fail on the missing file instead.
- **Evidence:** `package.json:63`; `*.vsix` is ignored and never cleaned.
- **Recommendation:** check-vsix defaults to `cep-<version>.vsix`, read from `package.json`.

**D-A14 · later · §6.4.**
- **Finding:** the throwaway repos inherit the user's global git config (signing, hooks, templates).
- **Evidence:** inferred.
- **Recommendation:** run git in the tests with `GIT_CONFIG_GLOBAL` pointing at an empty file and `GIT_CONFIG_NOSYSTEM=1`.

**D-A15 · later · §6.4, the `ci.yml` test.**
- **Finding:** the test must read YAML with no dependency, and the spec does not say how.
- **Recommendation:** specify a line-based reader for `jobs.<id>.steps[].run` and `if:` that fails on anything it cannot place.

**D-A16 · later · §5.5.1 step 3.**
- **Finding:** `--format=%H %cs` must be a single argv element.
- **Recommendation:** write it as `['log','-1','--format=%H %cs',ref]`.

**D-A17 · later · a seam not in the plan.**
- **Finding:** the tests run vscode-textmate 7.0.4, which `vscode-tmgrammar-test` 0.1.3 bundles. VS Code 1.145.2 runs 9.3.2. Both use the same `onig.wasm` (sha1 `b1644a9e…`).
- **Evidence:** 0 differing characters over 164 inputs with c2, and over 146 with A and with B (`engines.mjs`).
- **Recommendation:** record it as a known seam. The owner's check covers it.

**D-A18 · later · §5.3 keyword rules.** "Words in the order listed" is a MUST that nothing checks (see D-A6).

**D-A19 · later · scope lint (`test/grammar.test.mjs`).**
- **Finding:** PLAN §6 has no spec for the lint beyond a layout comment.
- **Recommendation:** it must split space-separated scope names and walk `name`, `contentName`, `captures`, `beginCaptures` and `endCaptures` at every depth. Stacked names appear with P6 and with the E-STR-001 rule.

**D-A20 · later · `given` region on incomplete input.** `given table`, a blank line, then `table K (…)` gives `K` `support.function.cep`, because the region consumes the second `table` (probed with c2). It is transient while typing. Accept it.

## Seams and contracts (question 2)

**What cannot work as written:**
- the B grammar under §5.5.2 (D-A6);
- the snapshot review and the e-kw-001 limitation text, once D-A4 is fixed;
- the owner's check themes (D-A8).

**Hidden coupling:**
- **The fixture inventory sits in four places:** sync's list of 7 invalid files, check-fixtures' counts 10/2/7, check-vsix's 8 names, and the `files` list. This is deliberate friction; keep it.
- **Lane B and the vendored table:** under (b), lane B's generator would read `test/upstream/keywords.go`, which lane A owns after its sync.
- **The version string** in `test:vsix` (D-A13).
- **The test engine against the editor engine** (D-A17).

**Failure modes not handled:**
- lexer drift goes unseen (D-A9);
- junk files turn `npm test` red (D-A11);
- the global git config leaks into throwaway repos (D-A14);
- the lockfile step has no proof (D-A12).

**A17 (should check-toolchain also check npm?):** no. An exact Node pin already fixes npm through setup-node; leave it for later.

## Who decides what (question 3)

**The owner's** (a rule author sees it, or it changes approved scope). Recommendation first:
1. **P1/D8, the E-STR-001 mark:** mark the whole unclosed string, quote to line end, in the error colour. The alternative marks only the last visible character, which is quieter.
2. **P6, word operators:** use `keyword.operator.logical.cep keyword.operator.wordlike.cep` and `keyword.operator.text.cep keyword.operator.wordlike.cep`. Measured above. The alternative is to keep operator colouring and record that they look like names.
3. **P5, typing `'''`:** no extra pair for now. The owner's check types `'''` and `"""` and records what appears; add the pairs only if VS Code produces four quotes. What VS Code does here is inferred, not probed.
4. **The owner's check themes:** add Dark 2026 and Light 2026 (D-A8).
5. **Extend D4 to `lexer.go`** (D-A9): yes.
6. **The breaker's cep findings 2–4**:
   - finding 2: the backtick rule differs between `lexer.go`, `grammar.lark` and `grammar.ebnf`;
   - finding 3: E-LATE-001's fix text;
   - finding 4: the E-STR-001 message for double quotes.

   Recommendation: forward each to cep's known issues, like F1.
7. **Only if (b) is wanted:** the generator and the §1 wording (D-A7). Recommendation: not needed.

**The coordinator's to settle in v2** (each has one answer that follows cep, or keeps v1.1):
- Q1's structure, (c);
- P2 (edges), P3 (`X` plain), P7 (regions);
- P8: the split pragma is fixed; `''''` and an unclosed `'''` stay known limitations, as in the breaker's limitations 1–2;
- P4 stays closed;
- D6: keep v1.1's declared-name scope, which its verbatim test asserts;
- D12: an annotation name is any name; `@select` is invalid input;
- D1–D5, D7, D9–D11 and D13–D15 already match v1.1 or cep;
- the E-KW-001 limitation for lowercase names goes into the README's known limitations.

## Pre-mortem (question 4)

*It is December 2026. S1 shipped as v0.1.0, and authors say the highlighting "lies".*

**1. The default theme hides the operators.** *Likelihood high · impact medium.*
- Most authors run VS Code 1.145 or later, so they get Dark 2026 by default.
- `and`, `not` and `has_ci` render `#D4D4D4`, the same as `=`, so filters read like plain text.
- The owner's check passed because it was run in Dark Modern.
- The root cause is that the colour evidence was measured on themes that are no longer the defaults.
- *Chain:* operators look like names → authors stop trusting the colours → reports arrive as "the extension doesn't highlight".

**2. cep moves and nothing goes red.** *Likelihood medium · impact medium.*
- cep fixes F1 and narrows backticked names in `lexer.go`.
- The weekly job compares only `keywords.go`, so it stays green.
- Later, a re-sync does change `keywords.go`. Under the full loop, the re-sync sprint takes a week, and the new keyword shows as plain text all that time.
- Separately, after 60 days with no commits, GitHub disables scheduled workflows in public repositories (from GitHub's documentation; inferred, not probed), and drift detection stops without telling anyone.

**3. Names lie about E-KW-001.** *Likelihood high · impact low.*
- An author writes `stream events (time timestamp, key string)`.
- v1.1 colours `events` as a valid stream name, and cep rejects it at deploy.
- Fixed by D-A4; the column names still need the language server.

**4. The whole file flips while typing.** *Likelihood medium · impact low.*
- An author types `'''` to start an intent, and the rest of the file turns string-coloured until it is closed. The same happens with `''''` (P5, P8).

**5. The tools go red for the wrong reason.** *Likelihood medium · impact low.*
- A `.DS_Store` in the fixtures, or a stale `cep-0.1.0.vsix` after a version bump, makes the gate red or green for reasons unrelated to the code (D-A11, D-A13).

**Early warning signs:**
- a cep commit that touches `internal/parser/lexer.go`, checked weekly;
- the "last run" date of the upstream job, checked monthly;
- a new VS Code default theme, checked at each VS Code release;
- issue reports that use the word "plain".

**Mitigations, in order:**
- P6 stacked scopes, plus the owner's check in the 2026 themes (low effort);
- D-A9 (low);
- D-A4 (low, inside Q1);
- a calendar check on the scheduled job, plus a light re-sync routine for keyword-only changes. Both are process changes for the owner.

**Inversion check.** Three things would guarantee failure:
- untested themes;
- an unwatched source of truth;
- tests whose expected values come from the grammar under test.

All three exist now: D-A8, D-A9, and D-A10 if `expected.md` is copied into tests.

## What I checked and found sound

- **§5.3's tie rule** (the leftmost match wins; on a tie, the first listed) holds in every probe.
- **The breaker's claims hold when rerun:**
  - 0 disagreements over the 36 corpus files and 8 over the 85 cases;
  - 12 differing fixture runs against A;
  - its keyword lists equal cep `main`'s.
- **The breaker's regions are bounded.** They hold only whitespace and comments. I probed blank lines, comments, an unclosed `/*` inside a region (it behaves as at top level), end of file, nested `@map` annotations, and keywords inside strings and comments.
- **No catastrophic backtracking.** On 19 pathological 20k-character lines (VS Code's tokenizing limit), the worst was 47 ms. A 41,401-line file took 1.2–1.9 s in every grammar.
- **cep's real parser** accepts all 18 valid variants used as evidence.
- **The scaffold:**
  - `package.json` scripts equal S2 exactly;
  - `check-toolchain` passes, and `node --test test/toolchain.test.mjs` passes 5 of 5;
  - `test/upstream/keywords.go` is cep's blob `b6a26e67…`, and `SOURCE` is the S3 line with one LF;
  - `.npmrc` works: no vsce-sign binary is on disk, and the lock's 21 optional packages are absent.
- **Packaging:** with the `files` allowlist, a scratch `vsce package --no-dependencies` produces exactly the 8 S4 names and drops a stray `test/` folder.
- **The other tooling specs** (§5.5.1, §5.5.3–§5.5.7) are buildable as written, apart from D-A13–D-A16. The check-vsix zip reading, check-clean's ignore behaviour and check-upstream's `data:` URL seam all fit what Node's built-ins do.
