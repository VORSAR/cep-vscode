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

**During the build — the owner, 2026-11-09:**
- **"An immediate release from CI"**, and then "u need to commit files to github". The owner asked the coordinator to push, and chose "do all of it for me" for v0.0.1. That is **a one-off exception to CLAUDE.md rule 7** (agents never push, merge or tag) for this release only.
  - The coordinator pushed `release/v0.0.1` and opened PR #1.
  - It then fast-forwarded `main` to the tested commit `288768b`; GitHub marked PR #1 merged.
  - It pushed the annotated tag `v0.0.1`.
  - Rule 7 stands for every later release unless the owner says otherwise.
- **v0.1.0: "do all of it after my check".** This is the second one-off exception to rule 7.
  - The coordinator pushed `s1/integration` and opened PR #2, and CI went green on it.
  - The owner did the quick check in a VS Code window running v0.1.0 and reported "it looks good".
  - The coordinator then fast-forwarded `main` to the CI-tested commit `1180407` and pushed the annotated tag `v0.1.0`.

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

- **v0.0.1 released by CI (2026-11-09):**
  - Locally on `288768b`:
    - `npm run gate` exited 0: the toolchain check, `literals.test.cep` (31 assertions red before), the release and toolchain tests (15/15; 9 of the 10 release tests red before), and an 8-file `cep-0.0.1.vsix`;
    - `check-release` accepted `v0.0.1`.
  - The release workflow, run 42574432117 on tag `v0.0.1`, exited 0 in 15 s. Every step was green: `npm ci`, `npm run gate`, `check-release` and `gh release create`.
  - The published asset was downloaded and checked: exactly the 8 S4 files, and its grammar is byte-equal to `v0.0.1`'s `syntaxes/cep.tmLanguage.json`.
  - <https://github.com/VORSAR/cep-vscode/releases/tag/v0.0.1>
  - The run printed one notice: the `ubuntu-latest` runner label moves to Ubuntu 26 from 2026-10-19 (informational).
- **Lane A, tooling (2026-11-09):** 9 commits, cherry-picked cleanly onto `s1/integration` after v0.0.1. The coordinator re-ran the checks in lane A's worktree:
  - **Ownership and attribution:** it touched only its owned files, and no commit carries attribution.
  - **T2:** `npm run test:lane-a` exited 0, with 52/52 tests.
  - **Red first:** before any script existed, 46 of 47 tooling tests failed (exit 1). The pass counts then rose 11 → 20 → 29 → 37 → 41 → 47 as each script landed.
  - **`ci.yml`'s test:** it went red on PLAN v1's file and on each of the three mutations.
  - **Card line 4:** `sync-upstream --check` gave `ok (21 files match 1fa3a5bb…)`, exit 0. It went red with one byte flipped. `comments.cep` is `i/mixed attr/-text`.
  - **Card line 7:** the real `check-upstream` run printed `ok (keywords.go and lexer.go match VORSAR/cep 1fa3a5bb… 2026-11-08)`, exit 0.
  - **On the combined branch:** the tooling, toolchain and release tests passed 62/62, exit 0.
  - **Lane A's open items, for later:** listed below.
- **Lane B, grammar (2026-11-09):** 3 commits. The coordinator re-ran the checks in lane B's worktree:
  - **Ownership and attribution:** it touched only its 12 owned files, no commit carries attribution, and the `'caf\u00e9'` escape bytes are intact.
  - **T2:** `npm run test:lane-b` exited 0. All 7 unit files pass; `check-keywords` reports `115 keywords, 17 reserved, 11 categories, 5 name exclusions`; the checker passes 19/19 and the grammar tests 4/4.
  - **Red first, against the placeholder:** 442 assertions failed. Per file: comments 15/16, counter 107/122, keywords 179/185, literals 31/31, names 59/67, operators 19/19, strings 32/32. Grammar tests 1, 2 and 4 failed.
  - **The checker's stub runs** gave no `TypeError`. Removing each rule (a)–(i) and the empty-list stop turned its named tests red.
  - **The 8 named mutants** each made `test:unit` exit 255.
  - **Spec errors, to fix in PLAN:**
    - `ts_min` cannot go red under the fifth mutant, because the leading edge already guards it; pair it with dropping the leading edge from `keywords-unit`.
    - §5.3's table lists four categories (type, modifier, constant, reserved) in an order other than `keywords.go`'s, which rule (i) requires.
  - **The grammar matches v0.0.1:** it tokenizes identically to v0.0.1's on all 19 fixtures, the 42 counter-examples and the breaker's 85 cases (coordinator's diff, 0 runs).
- **Combine (2026-11-09):**
  - Lane A applied cleanly.
  - Lane B conflicted, as expected, on `syntaxes/cep.tmLanguage.json` and `language-configuration.json`, which v0.0.1 had added. Both were resolved to lane B's files, keeping the grammar's three metadata fields (`$schema`, `name`, `fileTypes`).
  - The configuration was identical in content, and the grammar differed only in keyword-list order (rule i) and the metadata.
  - `literals.test.cep` matched byte for byte.
  - `package.json` regained the S2 scripts block plus `test:release`, at version 0.1.0.
- **Snapshots:**
  - `check-fixtures` exited 1 with no snapshots (19 missing).
  - The 19 were generated; no valid file carries an `invalid.*` scope.
  - A 25-item check script from §6.2 v2 passes 25/25, and goes red on 8 items against PLAN v1's snapshots. The comments torture file was also read line by line.
  - Red run: renaming `constant.numeric.cep` made `test:snap` exit 255 on all 19 fixtures.
- **T3 (2026-11-09):** `npm ci` exit 0, then `npm run gate` exit 0:
  - toolchain ok;
  - 7/7 unit files;
  - keywords ok;
  - checker 19/19, grammar 4/4, tooling 52/52, release 10/10;
  - fixtures ok (19, 19 tracked), and the snapshots pass;
  - package, `check-vsix` ok (8 files), `check-clean` ok.
- **v0.1.0 released by CI (2026-11-09):**
  - **T4:** PR #2's CI run, 42575981504 on `1180407`, was green: the test job ran `npm ci` and `npm run gate` and uploaded the `.vsix` in 18 s; the `upstream` job was skipped, as designed.
  - **The owner's quick check passed.**
  - **The merge:** `main` was fast-forwarded to `1180407`, and GitHub marked PR #2 merged at 06:56:02Z. CI on `main`'s push, run 42576107797, succeeded.
  - **The release run**, 42576113240 on tag `v0.1.0`, exited 0 in 20 s: `npm ci`, the gate, `check-release` and `gh release create`.
  - **The published asset:** `cep-0.1.0.vsix` holds exactly the 8 S4 files, reports version 0.1.0, and its grammar is byte-equal to the tag's.
  - <https://github.com/VORSAR/cep-vscode/releases/tag/v0.1.0>
- **Re-sync to cep `75f541e` (2026-11-09, at the owner's request).**
  - **Why:** cep fixed F1–F4; `keywords.go` is unchanged.
  - **The sync:** `node scripts/sync-upstream.mjs ../cep` wrote `lexer.go`, `torture/lexical.cep` and `SOURCE`. `--check` then reported 21 files matching `75f541e`, and cep's working tree was untouched.
  - **The snapshot diff**, reviewed line by line: only `lexical.cep` changed, with its comment line and `or risk/2.5 > risk/1.5e3`, read as cep now reads it (name, `/`, number).
  - **The grammar change (F2), test-first:** five assertions were added to `names.test.cep`. The four rejections failed against the old rule (exit 255). All six copies of the backticked pattern then took cep's `[A-Za-z_]` first character, and `test:lane-b` exited 0.
  - **PLAN** now pins `75f541e`, and its known limitation 2 is rewritten.
  - **Not copied:** cep's new `invalid/e-syn-001-malformed-backticked-name.cep` is not one of the sync's 7 invalid fixtures (an open question for the owner).
- **v0.1.1 released by CI (2026-11-09):**
  - **CI:** PR #3 ran green on `d2e7f28` (run 42588610165: `npm ci` and the gate in 22 s).
  - **The merge:** the owner merged PR #3 on GitHub as a rebase-merge, so `main` = `96f3f36`, whose tree is identical to the tested `d2e7f28`. CI on `main`, run 42588681471, succeeded.
  - **The tag:** the owner asked "did we release a new version with this if not do now", so the coordinator tagged `96f3f36` as `v0.1.1` and pushed the tag. That is a third rule 7 exception, at the owner's word.
  - **The release run**, 42588873069, exited 0 in 19 s: `npm ci`, the gate, `check-release` and `gh release create`.
  - **The published asset:** `cep-0.1.1.vsix` holds 8 files, reports version 0.1.1, and its grammar is byte-equal to the tag's.
  - <https://github.com/VORSAR/cep-vscode/releases/tag/v0.1.1>
- **Re-sync to cep `ebb8496` (2026-11-09):**
  - **What changed in cep:** since `75f541e`, cep changed only `grammar.lark` (whole-word keywords, a BOM ignored only at the start) and added three invalid examples. `lexer.go`, `keywords.go` and every example are byte-identical.
  - **The sync:** `git -C ../cep fetch origin` exited 0, then `node scripts/sync-upstream.mjs ../cep` exited 0 and wrote only `SOURCE`. `--check` reported 22 files matching.
  - **Tests:** `npm test` exited 0 with no snapshot change, and the gate exited 0.
  - **The grammar, verified on cep's new invalid files:** `languagecep/0.1` is a plain name, and `streamS` is not the keyword. A mid-file BOM is unmarked, which is known limitation 3.
  - **A coverage gap found:** a grammar without the trailing word edge on its seven declaration regions passed every unit test and snapshot, reading `languagecep/0.1` as a valid pragma.
  - **Closed by unit guards:** `names.test.cep` gained one glued line per keyword. They are green on the grammar, and each of the seven one-region mutants turned its line red (exit 255).
  - **Fixtures:** the fixture list is unchanged, since the guards cover the gap more precisely than snapshots would. The BOM example would only pin today's unmarked behaviour.
- **v0.1.2 released by CI (2026-11-09):**
  - **CI:** PR #4 ran green on `24a25ea`.
  - **The merge:** the owner merged it on GitHub, so `main` = `a802bb2`, whose tree equals the tested one. CI on `main` succeeded.
  - **The tag:** the owner said "cut the release", so the coordinator tagged `a802bb2` as `v0.1.2` and pushed the tag.
  - **The release run**, 42616429488, exited 0 in 22 s: `npm ci`, the gate, `check-release` and `gh release create`.
  - **The published asset:** `cep-0.1.2.vsix` holds 8 files, reports version 0.1.2, and its grammar is byte-equal to the tag's.
  - <https://github.com/VORSAR/cep-vscode/releases/tag/v0.1.2>
- **Re-sync to cep `7c65dbf` (2026-11-13, after cep's S1.1c-3):**
  - **What changed in cep:** since `ebb8496`, 296 commits (PRs #27–#39), ending with S1.1c-3 (PR #38, `1fec29a`) and its close-out. Under the paths the sync reads, the only change is a new grammar-level invalid file, `e-pat-005-arrow-before-absence.cep`, which is not vendored. `lexer.go`, `keywords.go`, `grammar.lark` and every example are byte-identical; S1.1c-3 changed cep's diagnostics and documents.
  - **The sync:** after the owner merged cep's PRs #38 and #39, cep's `main` = `origin/main` = `7c65dbf`. `node scripts/sync-upstream.mjs ../cep` exited 0 and wrote only `SOURCE`, and `--check` reported 22 files matching.
  - **Tests:** `npm test` exited 0 with no snapshot change, and the gate exited 0 at `7d65c55`.
  - **The release:** the owner said "do a release with changes upto now", so v0.1.3 is this re-sync alone, and the review and break-it move to v0.1.4.
  - **The weekly upstream job**, which had never run (it reached `main` after the 2026-11-09 slot), was dispatched once on `main` at the owner's go-ahead: run 43418403967 passed.
- **v0.1.3 released by CI (2026-11-13):**
  - **CI:** the owner said "create the pr", so the coordinator pushed `sync/cep-7c65dbf` and opened PR #5, which ran green on `bd6e97f` (run 43418904154).
  - **The merge:** the owner merged it on GitHub as a rebase-merge, so `main` = `fe48513`, whose tree equals the tested one. CI on `main`, run 43419025681, succeeded.
  - **The tag:** at the owner's word ("do a release with changes upto now"), the coordinator tagged `fe48513` as `v0.1.3` and pushed the tag.
  - **The release run**, 43419105888, exited 0 in 24 s: `npm ci`, the gate, `check-release` and `gh release create`.
  - **The published asset:** `cep-0.1.3.vsix` holds 8 files, reports version 0.1.3, and its grammar and language configuration are byte-equal to the tag's.
  - <https://github.com/VORSAR/cep-vscode/releases/tag/v0.1.3>
- **Upstream coverage (2026-11-13, at the owner's go-ahead, after v0.1.3):** two gaps in how cep changes reach this repo, each closed test-first.
  - **New invalid files arrived silently:** the sync copies 8 of cep's 29 by name. It now holds the other 21 as reviewed, not vendored (`NOT_VENDORED`), and any invalid file on neither list fails the sync and `--check`, naming it. Red: 0 of 2 (`9bc0487`).
  - **The weekly job watched 2 of 22 files:** it now also checks out cep and runs `sync-upstream --check --ignore-source`, which compares all 22 files and the invalid set but not `SOURCE`. Red: 5 of 11 (`563ba30`).
  - **Proof on cep:** against a shallow clone of `7c65dbf` the job's command passes. In that scratch clone, a docs-only commit still passes, while an edited example and a new invalid file each fail, naming the file.
- **PLAN corrections from lane B (2026-11-09):** §5.3's table now lists type, modifier, constant and reserved in `keywords.go` order (rule i). §6.1 pairs `ts_min` with dropping the leading edge `L`.
- **Lane A's open items, for later:**
    - `--check` compares only the 21 targets, so an extra stale `.cep` is caught by `check-fixtures`, not by `--check`;
    - each sync test takes about 1.3 s;
    - beyond §6.4, the tests also isolate `XDG_CONFIG_HOME` and set `GIT_CEILING_DIRECTORIES`.

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

**2026-11-09, the owner: v0.1.1 is the re-sync.** After the owner asked to follow up on cep's fixes ("Sync cep-vscode"), the owner chose, as recommended:
- **Ship the re-sync to cep `75f541e` now as v0.1.1.** The review and break-it move from v0.1.1 to v0.1.2.
- **Vendor cep's new `invalid/e-syn-001-malformed-backticked-name.cep` as an 8th invalid fixture.** That puts the sync's copy set at 22 files and check-fixtures at 10 + 2 + 8, both changed test-first.

**2026-11-09, the owner: v0.1.2 is the re-sync to cep `ebb8496`.** The owner's pasted brief asked to sync and re-verify without pushing. The coordinator found one change needed (below), and the owner then said "if there is a change required lets do it and ship a new release". The review and break-it move to v0.1.3.

**2026-11-13, the owner: v0.1.3 is the re-sync to cep `7c65dbf`.** After the owner merged cep's S1.1c-3 (PR #38) and its close-out (PR #39), the coordinator re-synced; only `SOURCE` changed. The owner then said "do a release with changes upto now". The review and break-it move to v0.1.4, and the lockfile refresh folds into v0.1.4 if that ships on or after the 13th.

**2026-11-13, the owner: v0.1.4 is the upstream coverage.** After the coordinator closed two gaps in how cep's changes reach this repo (the owner: "do 2,3"), the owner said "lets do a new release with new changes". The review and break-it move to v0.1.5, and the lockfile refresh folds into v0.1.5 if that ships on or after the 13th.

**2026-11-09, the owner: incremental delivery.** The owner asked for a working product as early as possible, then iteration, and said several released versions are fine. PLAN §7.0 now holds the release ladder. Decisions, in order:
1. **The release ladder** (PLAN §7.0): v0.0.1 preview, then v0.1.0 (S1), then v0.1.1 (S1.1), then v0.1.x (lockfile), then later items.
2. **v0.1.0 ships before the review and break-it of the combined build**, which move to v0.1.1 (S1.1) with the one fix round (≠ R: the recommendation was to review before v0.1.0). S1's G3 row moves with them. v0.1.0's owner's check is the quick check (Dark 2026 and Light 2026, the editor basics, typing `'''`); the four-theme check comes in v0.1.1.
3. **The lockfile re-resolve moves from before T3 to a patch release on or after 2026-11-13**, as recommended. This amends G0 Q3. v0.1.0 ships with today's lockfile: every package is at least two weeks old, and the four advisories are recorded as known issues. Card line 10 moves with it.
4. **CI cuts each release when the owner pushes a `v*` tag**, as recommended. The added scope is `release.yml` and `scripts/check-release.mjs`, with `test/release.test.mjs` (PLAN §5.6.1).
5. **"An immediate release from CI."** v0.0.1 is cut by CI from the design-reviewed reference grammar, with PLAN §6.1's verbatim `literals.test.cep` and the release job, ahead of the lanes' tested v0.1.0. Its gate is what exists at that rung (PLAN §7.0). The coordinator builds it on a branch, `release/v0.0.1`; the owner pushes, merges and tags.

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
| F1 | plan check §0 finding 10 | later (cep) | cep lexes `risk/2.5` (no spaces) as one `Pragma` token: `Pragma` (`internal/parser/lexer.go:25`) is tried before `Ident` (`:31`). Probed with cep's rules on participle v2.1.4: `Pragma("risk/2.5")`, while `risk / 2.5` and `Risk/2.5` lex as arithmetic. Confirmed with cep's real parser (a copy equal to `1fa3a5b`, 2026-11-09): `from S[risk/2.5 > 1.0]` fails with `E-SYN-001: unexpected token "risk/2.5"`, and `risk / 2.5` parses. SPEC §2.5 does not say division needs spaces. | forwarded to cep's known issues (owner, Q7); this repo shows it as arithmetic; **Fixed in cep `75f541e` (2026-11-09, its VSC-F1 to VSC-F4)**; this repo re-synced to it. |
| F2 | design breaker, cep finding 2 | later (cep) | The backticked-name rule differs across `lexer.go` (`` `[A-Za-z0-9_\-. ]*` ``), `grammar.lark` (a letter or `_` first) and `grammar.ebnf` ("any-but-backtick"). The engine accepts `` stream `1abc` ``, an empty name and an all-space name (the breaker's runs of cep's parser). | forwarded to cep's known issues (owner, G1-7); this repo follows `lexer.go`; **Fixed in cep `75f541e` (2026-11-09, its VSC-F1 to VSC-F4)**; this repo re-synced to it. |
| F3 | design breaker, cep finding 3 | later (cep) | E-LATE-001's fix text (`docs/language/errors.md` line 31 and `errors.go`) offers `late events allow <duration>`, which SPEC §6.3 rev 3 makes E-LATE-002. | forwarded to cep's known issues (owner, G1-7); **Fixed in cep `75f541e` (2026-11-09, its VSC-F1 to VSC-F4)**; this repo re-synced to it. |
| F4 | design breaker, cep finding 4 | later (cep) | The E-STR-001 message, "a single-quoted string does not end on its line", is also given for an unclosed double-quoted string (`parse.go` `lexError`). | forwarded to cep's known issues (owner, G1-7); **Fixed in cep `75f541e` (2026-11-09, its VSC-F1 to VSC-F4)**; this repo re-synced to it. |

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
Build (G2)   ☑ every lane at T2 (lane A 52/52, lane B all green) ☑ T3 `npm ci && npm run gate` exit 0 (2026-11-09)
             ☐ a test for every token class and error scope shipped
             ☐ tests on the real code ☐ every breaker's red test committed
Review (G3)  → moved to S1.1 / v0.1.1 (owner, 2026-11-09, ≠ R; see Scope changes)
             ☐ architecture review of the combined diff: no drift
             ☐ QA break-it run ☐ every finding fixed, forwarded (owner consent for blockers) or rejected with reason
Verify (G4)  ☑ T4 CI exit 0 on PR #2 (test job; upstream skipped by design), logs read
             ☑ owner's check passed (the v0.1.0 quick check, 2026-11-09; the four-theme check moves to v0.1.1)
             ☐ every acceptance line met by its named proof (line 10, the lockfile, moves to v0.1.x)
Exit (G5)    ☑ released as v0.0.1 (PR #1) and v0.1.0 (PR #2); merged and tagged by the coordinator at the owner's word (rule 7 exceptions)
             ☐ main CI green on the merge commit
             ☐ sprint record + five-line retro ☐ known issues ☐ PLAN.md status line
             ☐ documents reconciled (plan + reasons only) ☐ memory updated
             ☐ worktrees removed ☐ points and duration recorded
```

## Retro

*(at close-out)*
