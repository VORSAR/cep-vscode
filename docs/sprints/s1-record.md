# S1 — sprint record

**Sprint:** S1 — v1 syntax highlighting (vorsar.cep 0.1.0) · **Routine:** the full loop · **Size:** ≈ 8 SP as sized against the 2-week cap · **Branch:** `s1/integration`
**What to build and how each item is proven:** [the card in the plan check](s1-plan-check.md#the-sprint-card) · **How it runs:** [plan check §1](s1-plan-check.md#1-routine-shape-waves) · **Process:** cep's [sprint model](https://github.com/VORSAR/cep/blob/main/docs/sprints/00-sprint-model.md)

*This record holds the plan check, the owner's decisions at the gates, measured results, the done-done checklist and the retro. Status stays in code and git; the one status line is at the top of [PLAN.md](../PLAN.md).*

---

## Plan check (step 0)

The full draft is [s1-plan-check.md](s1-plan-check.md), read-only against cep `main` @ `1fa3a5b`. Its §0 found 15 places where the plan did not match the code or the tools. The main ones:
- vsce brings in a closed-source Microsoft component;
- the dependency tree is 160 packages and carries four advisories;
- vsce can package an empty `.vsix` with exit 0;
- the E-STR-001 rule lets a string bleed onto the next line in three cases;
- `2min`, `given table` and `risk/2.5` diverge from cep.

The architect and QA reviewed v1 blind and found 3 blockers, 20 should-fix and 15 later between them. v2 places all 38 findings ([plan check §10](s1-plan-check.md#10-reviews-of-this-plan-check)).

## Decisions at the gates

**Before the sprint — the owner, 2026-11-08** (PLAN §2): D1 (a), D2, D3, D4 and D5 as recommended. **D6 ≠ R:** cep's full sprint model instead of the light rules.

**Plan check (G0) — the owner, 2026-11-08** (asked in plain language with options; every answer was the recommendation):

1. **Q1 — documents.** The plan check and the record go in `docs/sprints/`, the reviews in `docs/reviews/`. PLAN.md stays the design and the one status line.
2. **Q2 — the packager's licence.** Keep `@vscode/vsce` 4.0.0, with `.npmrc` setting `ignore-scripts=true` and `omit=optional`.
   - **The owner grants CLAUDE.md rule 5 an exception** for its closed-source dependency `@vscode/vsce-sign`, as a build-only tool. With that `.npmrc` its native binary is never on disk.
   - The JS wrapper stays in `node_modules`. `vsce package` never calls it, and it never enters the repo or the `.vsix`.
3. **Q3 — package ages.** Resolve the lockfile with `npm install --before=<install day − 14 days>`.
   - The scaffold does this today (`--before=2026-10-25`), and it is re-resolved again on or after 2026-11-13, before T3, so the `@azure/identity` 4.14.1 fix is in.
   - The `minimatch` moderate advisory goes to known issues.
   - The `npm audit` result is recorded here.
4. **Q4 — the `.vsix` check.** `scripts/check-vsix.mjs` asserts the exact 8 files of S4, and a `files` allowlist replaces `.vscodeignore`.
5. **Q5 — the gate.**
   - T2 is each lane's own script.
   - T3 is `npm ci && npm run gate`, and CI runs exactly that.
   - `check-toolchain` fails unless Node equals `.nvmrc`.
   - No git hooks.
   - The owner opens the draft PR right after combine, so CI runs before break-it.
6. **Q6 — the design panel.** Two waves: a breaker with QA on testability, then the architect with the-fool. No challenger.
7. **Q7 — cep's `risk/2.5`.** Forwarded to cep's known issues, for the owner to schedule there (see Findings).
8. **Q8 — upstream drift.** The `upstream` CI job runs on its weekly schedule and by hand only, never on PRs or pushes. A red scheduled run starts a re-sync sprint.
9. **Q9 — the defaults.** Yes to all three:
   - The lanes are run by fresh general-purpose agents in worktrees under `.claude/worktrees/`.
   - PLAN §7 step 6's visual check moves into the owner's check.
   - S1 is one PR from `s1/integration`.

**G0 passed 2026-11-08**, on the owner's answers above.

**The design (G1) — the owner, 2026-11-09.** The panel ran:
- the breaker, blind, re-deriving the grammar from cep's sources;
- QA on testability (271 mutant grammars);
- the architect with the-fool.

Their reports are [breaker](../reviews/s1-design-breaker.md), [QA](../reviews/s1-design-qa.md) and [architecture](../reviews/s1-design-architecture.md). The owner then answered eight questions, each as recommended:

1. **G1-1 — the grammar's structure: (c), the mix.** Keep PLAN §5.3's skeleton, its eleven `keywords-*` keys, the `(?i)` wrong-case rule and the check-keywords model. The grammar stays hand-written, with no build step. Add from the breaker:
   - ASCII word edges and an unscoped identifier rule;
   - bounded declaration regions that can cross lines;
   - declared names that exclude keywords;
   - E-STR-001 as a one-line match.

   The evidence: the architect's candidate equals the breaker's grammar on all 42 counter-examples and passes PLAN's verbatim unit test.
2. **G1-2 — E-STR-001: mark the whole unclosed string**, from its quote to the end of the line.
3. **G1-3 — word operators also carry `keyword.operator.wordlike.cep`**, so the default themes colour them like keywords.
4. **G1-4 — watch `lexer.go` too.** It is vendored beside `keywords.go`, and `check-upstream` compares both. This amends D4.
5. **G1-5 — the owner's check uses four themes:** Dark 2026, Light 2026 (VS Code 1.145's defaults), Dark Modern and Light Modern.
6. **G1-6 — triple quotes: test first.** There are no extra auto-closing pairs yet. The owner's check types `'''` and `"""` and records what appears.
7. **G1-7 — the breaker's three cep findings are forwarded** to cep's known issues, beside F1 (Findings: F2–F4).
8. **G1-8 — the scheduled job's 60-day pause** becomes a known issue, with a monthly check in CLAUDE.md.

**G1 passed 2026-11-09.** Design v2 (PLAN §5–§6) places every review finding (Findings table below) and applies G1-1 to G1-8. Two scaffold changes came with v2: `.DS_Store` in `.gitignore` (D-A11), and `test:vsix` with no argument (D-A13).

## How it runs

At most two agents at once.

| Step | Slot A | Slot B |
|---|---|---|
| Before the panel | **Coordinator:** the scaffold (plan check S2–S4, `check-toolchain` and its test, the placeholder grammar, the vendored table) | — |
| Design wave 1 | **Breaker:** an independent grammar and case table from cep's sources, given only the scope vocabulary | **QA:** testability of PLAN §5–§6 and the tooling specs |
| Design wave 2 | **Architect with the-fool:** structure, contracts, failure modes | — |
| W1 | **Lane A — tooling** (general-purpose) | **Lane B — grammar** (general-purpose) |
| Close-out | Combine → snapshots → T3 → draft PR (CI) → install → review and break-it → one fix round → T4 → owner's check → **merge** | — |

## Measured results

*(filled as the work lands: each acceptance line's measurement, as a number)*

## Test material

The 19 fixtures come from cep at `1fa3a5b`:
- `docs/language/examples/*.cep`: 10 files;
- `docs/language/examples/torture/*.cep`: 2 files;
- 7 of the 24 files in `docs/language/invalid/`.

PLAN §6.1's unit files and plan check §6's 47 counter-examples cover the rest. These are thin spots, each now with a unit case (QA's review):
- the backslash-u escape;
- E-STR-002, which has no invalid fixture;
- double-quoted E-STR-001;
- an unterminated block comment, which only a fixture covered.

## Scope changes

None.

## Findings

The plan check's 38 review findings and their dispositions are in [plan check §10](s1-plan-check.md#10-reviews-of-this-plan-check). Findings from later stages go here.

**The design review (G1, 2026-11-09).** Design v2 (PLAN §5–§6) places every finding of the [QA](../reviews/s1-design-qa.md) and [architecture](../reviews/s1-design-architecture.md) reviews, and every breaker doubt. Each one is **fixed in v2** at the place named, unless marked otherwise.
- The coordinator re-checked D-Q1 (moving `ttl` and `arrival` leaves every v1.1 unit test green) and D-A8 (VS Code 1.145.2's default themes are Dark 2026 and Light 2026).
- The breaker's grammar claims and the architect's candidate were checked with the coordinator's diff.

| Finding | Severity | Placed in v2 |
|---|---|---|
| D-Q1 keyword categories untested | blocker | §6.1 keywords: every word of every category |
| D-Q2 escapes and raw `"""` untested | blocker | §6.1 strings |
| D-Q3 name rules untested | blocker | §6.1 names |
| D-Q4 punctuation and namespaced-call lookahead untested | blocker | §6.1 strings, comments and names; §6.5 test 2 |
| D-Q5 sync could read the working tree | blocker | §6.4 sync: ref ≠ working tree, CRLF, no final newline |
| D-Q6 one mutant cannot show absent-scope assertions red | should-fix | §6.1 red first (named mutants); card line 1 |
| D-Q7 checker tests too weak | should-fix | §6.3 tests 9, 10, 14, 15; red first after the grammar |
| D-Q8 counter-examples unplaced; column-1 tokens | should-fix | §6.1 `counter.test.cep`, the `<~-` note; §4 |
| D-Q9 §6.2 e-str-001 and CRLF items | should-fix | §6.2 |
| D-Q10 grammar tests unspecified | should-fix | §6.5 |
| D-Q11 rule 5 calls untested | should-fix | §6.1 names |
| D-Q12 git config leaks into tests | should-fix | §6.4 preamble |
| D-Q13 deleted snapshot still tracked; total-only counts | should-fix | §5.5.4; §6.4 |
| D-Q14 second sync run passes with no script | should-fix | §6.4 sync |
| D-Q15 `ci.yml` assertion too weak | should-fix | §6.4 `ci.yml` |
| D-Q16 missing-input failures untested | should-fix | §5.5 (a git failure is a failure); §5.5.6; §6.4 |
| D-Q17 input cep rejects | later | §6.1 names |
| D-Q18 checker tests 6, 8, 9, 12 | later | §6.3 tests 6, 7, 11, 12, 16 |
| D-Q19 byte edges | later | §6.4 check-upstream, check-vsix |
| D-Q20 no byte-proof command | later | §5.5.1 `--check`; card line 4 |
| D-A1 `given table X` shown as a declaration | blocker | §5.3 `given` region; §6.1 names; §6.2 |
| D-A2 v1.1 string end bleeds | blocker | §5.3 `single-unclosed` match (G1-2) |
| D-A3 split or commented declarations | should-fix | §5.3 declaration regions; §6.1 names |
| D-A4 declared names do not exclude keywords | should-fix | §5.3 `NAME`; §6.1 names; §6.2 e-kw-001 |
| D-A5 `5min` uncoloured | should-fix | §5.3 ASCII edges and `identifier`; §6.1 keywords |
| D-A6 checker tied to the v1 forms | should-fix | §5.5.2 v2 (forms, 23-entry g, h, i); §6.3 tests 6, 7, 17–19 |
| D-A7 the breaker's grammar breaks "no build step" | should-fix | G1-1 (c); no generator |
| D-A8 the default themes are now Dark and Light 2026 | should-fix | G1-5; §5.3 wordlike colours; card owner's check |
| D-A9 `lexer.go` unwatched | should-fix | G1-4; §3; §5.5.1; §5.5.3 |
| D-A10 test values copied from a grammar | should-fix | §6.1 note: expected values come from cep |
| D-A11 `.DS_Store` turns the gate red | should-fix | §5.4 `.gitignore` (built); §5.5.4; §6.4 |
| D-A12 the lockfile step has no proof | should-fix | card line 10 |
| D-A13 `test:vsix` hard-codes the version | later | §5.5.5 default path; `package.json` (built) |
| D-A14 global git config in tests | later | §6.4 preamble |
| D-A15 YAML with no dependency | later | §6.4 `ci.yml` line reader |
| D-A16 the format string must be one argv element | later | §5.5 preamble |
| D-A17 test engine 7.0.4 against VS Code's 9.3.2 | later | known issue (below); the owner's check covers it |
| D-A18 word order is a MUST nobody checks | later | §5.5.2 rule (i); §6.3 test 19 |
| D-A19 the scope lint's reach | later | §6.5 |
| D-A20 a `given` region while typing | later | §5.3 known limitation 10 |
| Breaker D1–D4, D6, D12, D14 | — | §5.3 "Choices settled in v2" |
| Breaker D5, D11 | — | §5.3 `given` region; ASCII edges |
| Breaker D7, D10, D13, D15 | — | as v1.1, or §5.3 known limitations 2 and 5; VS Code strips CR |
| Breaker D8 | — | G1-2 |
| Breaker D9 | — | F2 (forwarded) |
| P1–P8 | — | P1 G1-2 · P2, P3, P7 §5.3 · P4 closed by QA's probe · P5 G1-6 · P6 G1-3 · P8 split pragma fixed, `''''` known limitation 1 |

| # | From | Severity | Finding | Disposition |
|---|---|---|---|---|
| F1 | plan check §0 finding 10 | later (cep) | cep lexes `risk/2.5` (no spaces) as one `Pragma` token: `Pragma` (`internal/parser/lexer.go:25`) is tried before `Ident` (`:31`). Probed with cep's rules on participle v2.1.4: `Pragma("risk/2.5")`, while `risk / 2.5` and `Risk/2.5` lex as arithmetic. Confirmed with cep's real parser (a copy equal to `1fa3a5b`, 2026-11-09): `from S[risk/2.5 > 1.0]` fails with `E-SYN-001: unexpected token "risk/2.5"`, and `risk / 2.5` parses. SPEC §2.5 does not say division needs spaces. | forwarded to cep's known issues (owner, Q7); this repo shows it as arithmetic |
| F2 | design breaker, cep finding 2 | later (cep) | The backticked-name rule differs across `lexer.go` (`` `[A-Za-z0-9_\-. ]*` ``), `grammar.lark` (a letter or `_` first) and `grammar.ebnf` ("any-but-backtick"). The engine accepts `` stream `1abc` ``, an empty name and an all-space name (the breaker's runs of cep's parser). | forwarded to cep's known issues (owner, G1-7); this repo follows `lexer.go` |
| F3 | design breaker, cep finding 3 | later (cep) | E-LATE-001's fix text (`docs/language/errors.md` line 31 and `errors.go`) offers `late events allow <duration>`, which SPEC §6.3 rev 3 makes E-LATE-002. | forwarded to cep's known issues (owner, G1-7) |
| F4 | design breaker, cep finding 4 | later (cep) | The E-STR-001 message, "a single-quoted string does not end on its line", is also given for an unclosed double-quoted string (`parse.go` `lexError`). | forwarded to cep's known issues (owner, G1-7) |

## Known issues

- **GitHub pauses a public repo's scheduled workflows after 60 days with no commits** (from GitHub's documentation; not tested here). The weekly `upstream` drift job would then stop silently. *Mitigation (owner, G1-8):* the owner checks the job's last-run date monthly, as CLAUDE.md says, and re-enables it if paused.
- **The tests and VS Code run different vscode-textmate versions.** `vscode-tmgrammar-test` 0.1.3 bundles 7.0.4, and VS Code 1.145.2 runs 9.3.2; both use the same `onig.wasm`. The architect found 0 differing characters over 164 inputs. *Forward:* the owner's check covers it in the real editor (architecture D-A17).
- **`minimatch` 10.2.6, GHSA-g3hv-75wg-m249 (moderate).** It comes through `@vscode/vsce` 4.x, which requires `^10.2.6`, so there is no fix within vsce 4.x. The DoS needs hostile glob patterns, and this repo's only globs are its own. Forward: the next vsce major.

## Done-done

*Copied at G0 from cep's sprint model §13. Each box is ticked with its evidence.*

```
Sprint S1 — v1 syntax highlighting · routine: full · SP ≈ 8 · cap 2 weeks
Entry (G0)   ☑ card complete and approved (plan check v2; §11 answered 2026-11-08)
             ☑ dependencies merged, main green (none; main has no CI yet) ☑ fits the cap, lanes ≤ 8 days (inferred sizes)
             ☑ plan check reviewed (architect, QA) and answered by the owner
             ☑ test material exists, or making it is an item (vendoring is scope item 2)
Design (G1)  ☑ architecture + the-fool findings resolved (placed in PLAN §5–§6 v2; Findings table)
             ☑ QA testability findings resolved (placed in v2; Findings table)
             ☑ owner decisions recorded (G1-1 to G1-8, 2026-11-09)
             ☑ ADRs: n/a; the lasting decisions are recorded in PLAN §2 and this record (no ADR folder in this repo)
Build (G2)   ☐ every lane at T2 ☐ T3 `npm ci && npm run gate` exit 0
             ☐ a test for every token class and error scope shipped
             ☐ tests on the real code ☐ every breaker's red test committed
Review (G3)  ☐ architecture review of the combined diff: no drift
             ☐ QA break-it run ☐ every finding fixed, forwarded (owner consent for blockers) or rejected with reason
Verify (G4)  ☐ T4 CI exit 0 on the draft PR, both jobs, logs read ☐ owner's check passed
             ☐ every acceptance line met by its named proof
Exit (G5)    ☐ one PR, ≤ 100 commits, merged by the owner
             ☐ main CI green on the merge commit
             ☐ sprint record + five-line retro ☐ known issues ☐ PLAN.md status line
             ☐ documents reconciled (plan + reasons only) ☐ memory updated
             ☐ worktrees removed ☐ points and duration recorded
```

## Retro

*(at close-out)*
