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

**The design (G1) — the owner, YYYY-MM-DD:** *(after the panel and design v2)*

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

| # | From | Severity | Finding | Disposition |
|---|---|---|---|---|
| F1 | plan check §0 finding 10 | later (cep) | cep lexes `risk/2.5` (no spaces) as one `Pragma` token: `Pragma` (`internal/parser/lexer.go:25`) is tried before `Ident` (`:31`). Probed with cep's rules on participle v2.1.4: `Pragma("risk/2.5")`, while `risk / 2.5` and `Risk/2.5` lex as arithmetic. | forwarded to cep's known issues (owner, Q7); this repo shows it as arithmetic |

## Known issues

- **`minimatch` 10.2.6, GHSA-g3hv-75wg-m249 (moderate).** It comes through `@vscode/vsce` 4.x, which requires `^10.2.6`, so there is no fix within vsce 4.x. The DoS needs hostile glob patterns, and this repo's only globs are its own. Forward: the next vsce major.

## Done-done

*Copied at G0 from cep's sprint model §13. Each box is ticked with its evidence.*

```
Sprint S1 — v1 syntax highlighting · routine: full · SP ≈ 8 · cap 2 weeks
Entry (G0)   ☑ card complete and approved (plan check v2; §11 answered 2026-11-08)
             ☑ dependencies merged, main green (none; main has no CI yet) ☑ fits the cap, lanes ≤ 8 days (inferred sizes)
             ☑ plan check reviewed (architect, QA) and answered by the owner
             ☑ test material exists, or making it is an item (vendoring is scope item 2)
Design (G1)  ☐ architecture + the-fool findings resolved ☐ QA testability findings resolved
             ☐ owner decisions recorded ☐ ADRs written for lasting decisions
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
