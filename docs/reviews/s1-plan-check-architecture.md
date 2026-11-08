# S1 — plan check: architecture review (2026-11-08)

*Reviewed blind: `docs/sprints/s1-plan-check.md` at `9a6eabd` (branch `s1/integration`), against `docs/PLAN.md`, `CLAUDE.md`, and cep `main` @ `1fa3a5b` read through git. Process sources: cep `main:docs/sprints/00-sprint-model.md` (§6, §8, §10, §11), `main:docs/ground-rules.md`, `main:docs/sprints/templates/plan-check.md`. The-fool's pre-mortem was used as part of the reasoning (section "Pre-mortem" below). Probes ran under `scratchpad/s1/arch/` with the scratch install (vsce 4.0.0, vscode-tmgrammar-test 0.1.3, scripts off). "Probed" means a run in this review showed it; "inferred" means a reading not proven by a run.*

**Counts:** 2 blockers, 10 should-fix, 7 later.

## Findings

### A1 — blocker — §1 "The gate here", §2 S2, §7 "At done", §9 common brief

**Finding.** T2 is "`npm test` exit 0 in the lane's worktree", and neither lane can ever reach it. Each worktree lacks the other lane's files: lane A has no unit tests, and lane B has no fixtures and no `check-toolchain.mjs`, which `npm test` runs first under Q5. §2 S2 itself says such a script "fails until the lane lands it".

**Evidence.** Probed in two lane-shaped scratch dirs, each with the PLAN §5.1 `contributes` block and the placeholder grammar:
- Lane A shape (fixtures, no unit files): `vscode-tmgrammar-test "test/unit/**/*.test.cep"` printed `ERROR no test cases found` and exited 255 (`dist/unit.js:75`).
- Lane B shape (unit files, no fixtures): `vscode-tmgrammar-snap "test/fixtures/**/*.cep"` printed `ERROR No testcases found` and exited 255 (`dist/snapshot.js:77`).

The plan check's own lines: `s1-plan-check.md:84`, `:90`, `:177`, `:190`.

**Recommendation.**
- Define T2 for each lane as an npm script that the scaffold lands. For example, `test:lane-a` runs the toolchain check and the tools tests; `test:lane-b` runs `test:unit`, `test:keywords` and `test:checker`.
- Keep `npm test` as the whole suite. It first runs at T3, on the combined branch.
- Move `check-toolchain.mjs` into the coordinator's scaffold. It is part of the gate and about 20 lines, so both lanes can run it.
- Add to §9's common brief that a lane never edits `package.json`, and never stubs another lane's file, to get green.

### A2 — blocker — §1 steps 5–6 and T3, §4 (snapshots), card line 3, §8 order

**Finding.** Without `--updateSnapshot`, `vscode-tmgrammar-snap` writes any missing `.cep.snap` and exits 0. That causes three problems:
- (a) Lane A's `npm test` writes 19 snapshots from the placeholder grammar into its worktree and passes. Those are files the coordinator owns, and lane A may commit them along with its fixtures.
- (b) T3 at G2 runs before step 6 makes the snapshots. So T3 silently writes 19 unreviewed snapshots and reports green.
- (c) After S1, a fixture added by a re-sync gets a snapshot in CI that nobody reviews.

This breaks CLAUDE.md rule 4. It is also the "row that passes without its input" class that cep's sprint model §10 calls out.

**Evidence.** `dist/snapshot.js:107-111`: when the `.snap` does not exist, it logs `Generating snapshot`, writes the file and returns `TestSuccessful`. Probed: one cep example as the fixture, no `.snap`, placeholder grammar. The run printed `Generating snapshot test/fixtures/examples/01-agent-kill-switch.cep.snap` and exited 0.

**Recommendation.**
- Add a guard that fails when any `test/fixtures/**/*.cep` has no git-tracked `.cep.snap`. Write it in Node with `git ls-files`, run it red first, and run it in `npm test` before `test:snap`. Lane A owns it; it becomes counter-example 34.
- Move "generate and review the 19 snapshots" into step 5, after combine and before T3, so T3 runs against reviewed snapshots.
- Lane briefs say: never run `test:snap:update` and never commit `*.snap`.

### A3 — should-fix — §2 S2

**Finding.** S2 is the one interface both lanes build against, and the plan check does not write it out. It names `test:vsix` and "the toolchain step", but not their commands. It does not say whether `test/tools.test.mjs` runs in `npm test`: PLAN §5.1's `test:checker` runs only `test/checker.test.mjs`. It also does not give the new `package` command (`--no-dependencies`, Q4). If the tools tests are not wired in, counter-examples 27–33 never run at T2, T3 or T4.

**Evidence.** `s1-plan-check.md:90`; `PLAN.md:139-147`.

**Recommendation.** Write the full `scripts` block into §2 S2, verbatim. This is the template's "signature and stub". It should hold:
- the per-lane T2 scripts (A1);
- the snapshot guard (A2);
- `test:tools`;
- `test:vsix`;
- `package` with `--no-dependencies`;
- one `gate` script (A4).

### A4 — should-fix — §1 "The gate here", §11 Q5, card line 8

**Finding.** The gate is defined twice, and it lands alongside the feature rather than before it.
- T3 is a command string in the plan check. CI is a separate file that lane A writes from PLAN §5.6, and that file runs neither `test:vsix` nor a snapshot guard. The two can drift. Card line 8 ("both CI jobs green") does not prove that CI runs T3's checks.
- Q5's "CI lands in the first wave" does not put the gate first (ground rule 13). CI first runs at T4, on the draft PR. `check-toolchain` lands in W1, in parallel with the grammar.

**Evidence.** `s1-plan-check.md:84`, `:214`; `PLAN.md:458-460` (the test job's steps are `npm ci`, `npm test`, `npm run package`).

**Recommendation.**
- Add one script: `npm run gate` = `npm test && npm run package && npm run test:vsix`.
- T3 = `npm ci && npm run gate`. ci.yml's test job runs exactly `npm ci` and then `npm run gate`.
- Land `check-toolchain` and `gate` in the scaffold.
- Add an option to Q5: the owner opens the draft PR right after combine, so CI runs before break-it and not only at step 9.

### A5 — should-fix — §3 (`.vsix` rule), §4, card line 5, Q4

**Finding.** The `.vsix` file set is a cross-lane contract with no seam.
- Its inputs come from three places: the coordinator (`package.json`, plus README and CHANGELOG, which are written late), lane B (the grammar and the config), and vsce's renames. The expected list lives in lane A's `check-vsix`.
- PLAN §5.4's `.vscodeignore` is a denylist, so any stray folder in the checkout ships. Agent worktrees inside the repo folder would be packed, with their `node_modules` (inferred: where this session puts lane worktrees is not fixed).

**Evidence.** Probed with PLAN §5.4's `.vscodeignore` and a stray `.claude/worktrees/lane-a/` folder. `vsce package --no-dependencies` exited 0, and the zip held `extension/.claude/worktrees/lane-a/scripts/sync-upstream.mjs` and `extension/.claude/worktrees/lane-a/node_modules/x/index.js`.

With a `"files"` allowlist in `package.json`, the stray folder was left out. But LICENSE and CHANGELOG must then be listed: the run printed `WARNING LICENSE, LICENSE.md, or LICENSE.txt not found` and dropped `changelog.md`. vsce renames files: the real names are `extension/readme.md`, `extension/changelog.md` and `extension/LICENSE.txt`.

**Recommendation.**
- Add seam S4 with the exact 8 entries:
  - `extension.vsixmanifest`
  - `[Content_Types].xml`
  - `extension/package.json`
  - `extension/readme.md`
  - `extension/changelog.md`
  - `extension/LICENSE.txt`
  - `extension/language-configuration.json`
  - `extension/syntaxes/cep.tmLanguage.json`
- Replace `.vscodeignore` with a `files` allowlist in `package.json`: `syntaxes/cep.tmLanguage.json`, `language-configuration.json`, `LICENSE`, `CHANGELOG.md`. README is always included.
- Land README and CHANGELOG stubs in the scaffold, so the file set is complete from T3 on.
- Decide where lane worktrees live. If they live inside the repo, add that folder to `.gitignore`.

### A6 — should-fix — §2 S3, §9 lane A brief, card line 4

**Finding.** S3 has three problems:
- **Two writers.** `test/upstream/*` gets the coordinator's first copy, then lane A's sync writes the same files.
- **Unfixed bytes.** The byte format of `SOURCE` (for example, whether it ends in a newline) is not fixed, so "re-produces it byte for byte" can fail for a trivial reason.
- **An unpinned ref.** Sync defaults to `--ref main`, and cep is moving: its fixtures changed in five commits between 11-04 and 11-08, and the owner's cep checkout is on `s3-3-2/integration`. If local `main` moves before lane A runs sync, the fixtures differ from what this plan check read, and card line 4 (`SOURCE` names `1fa3a5b`) fails.

Also, the documented `../cep` path does not resolve from a lane worktree.

**Evidence.**
- `git -C ../cep log main -- docs/language/examples docs/language/invalid` lists 61ec18c and 865457e (11-08), and afb1a3e, 8acc609 and e117eaf (11-06).
- `git -C ../cep worktree list` shows `1339c5f [s3-3-2/integration]`.
- `PLAN.md:398-407`; `s1-plan-check.md:92`, `:110`.

**Recommendation.**
- Lane A runs `node scripts/sync-upstream.mjs /Users/ramith/code/cep --ref 1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`.
- Fix `SOURCE`'s exact bytes in S3.
- Say that lane A owns `test/upstream/*` from its sync onward, and that the coordinator's copy only serves lane B in W1.

### A7 — should-fix — §11 (missing question), card line 8, §1 steps 9–11

**Finding.** The `upstream` CI job runs on `pull_request` and on `push` to `main`. So a keyword change in cep turns this repo's draft PR and its merge commit red, for a reason outside this repo. G5 ("main CI green on the merge commit") then cannot close. Ground rule 11 stops the line until a re-sync, and a re-sync is a scope change (ground rule 7). The plan check has no rule for cep moving mid-sprint, and no owner question about it.

**Evidence.** `PLAN.md:441-447` (triggers), `:465-472` (the upstream job); cep ground rules 7 and 11; sprint model §4 (exit). keywords.go has changed once so far (c364f42, 11-04), so the likelihood is low and the impact is a blocked G5 (inferred).

**Recommendation.** Add Q8 with these options:
- (a) Keep the job on PRs and `main`. A cep change blocks merging until a re-sync.
- (b) Run `upstream` on schedule and dispatch only. Drift then shows as a red scheduled run, not a red merge gate.
- (c) Keep (a), and record that a cep keyword change during S1 becomes a new sprint, not S1 scope.

Recommend (b) or (c); the owner decides. Also state in the card that S1 targets `1fa3a5b`.

### A8 — should-fix — §5, §8 order, §9 lane A

**Finding.** Lane A builds four scripts, but PLAN §5 v1 specs only two of them (`sync-upstream`, `check-upstream`). `check-vsix` and `check-toolchain` have no spec: no arguments, messages, exit codes or expected list. Only `check-upstream` has a test seam (its URL):
- Tests 27–29 need a fake cep repo, and must not write into the repo's own `test/fixtures`. PLAN §5.5.1 gives sync no output-dir argument.
- Test 33 cannot switch Node.

The design review cannot check what is not designed. Also, §8's order line goes from the first commit straight to W1 and skips steps 1–3 and G1.

**Evidence.** `s1-plan-check.md:103-104`, `:161-167`, `:186`; `PLAN.md:392-433`.

**Recommendation.**
- Have design v2 spec every lane A script in PLAN §5.5's style, each with its seam:
  - `sync-upstream --out <dir>`, defaulting to the repo root;
  - `check-toolchain --nvmrc <path> [--node <version>]`;
  - `check-upstream --url <url>`;
  - `check-vsix <file>`, with the S4 list;
  - the snapshot guard (A2).
- Fix the order line: G0 → scaffold → panel, design review and owner decisions → G1 → W1 → combine plus snapshot review → T3 → …

### A9 — should-fix — §0 finding 7, §11 Q2

**Finding.** Q2's facts are off, and it misses an option.
- Q2 says the closed-source component "never runs, never enters the repo or the `.vsix`", and pairs that with `ignore-scripts=true`. But the native binary comes as an optional platform package, so it is on disk after any install, with scripts on or off. `ignore-scripts` stops install scripts. It does not keep the component out.
- The missing option: `omit=optional` in `.npmrc` keeps every platform binary off disk (vsce-sign's and the keyring's), and packaging still works.
- The Microsoft-licensed JS package `@vscode/vsce-sign` stays under every vsce option. It is a regular dependency that vsce loads at start; loading it has no side effects.

**Evidence.**
- The scratch install (scripts off) has `node_modules/@vscode/vsce-sign-darwin-arm64/bin/vsce-sign`, and its `LICENSE.txt` begins "MICROSOFT SOFTWARE LICENSE TERMS".
- `@vscode/vsce/out/package.js:81` requires `@vscode/vsce-sign` at load. `vsce-sign/src/main.js` only requires `child_process` and `path` at import (`:9-10`).
- The binary is called only from the sign and verify paths (`out/package.js:1535-1555`). The keyring is required lazily (`out/store.js:109`).
- Probed: with both `vsce-sign-darwin-arm64` and `keyring-darwin-arm64` removed, `vsce package --no-dependencies` exited 0 with 8 files.
- That `npm ci` with `omit=optional` removes exactly these packages is npm's documented behaviour (inferred, not run).

**Recommendation.**
- Correct Q2's facts: the binary is installed, but `vsce package` never runs it, and `ignore-scripts` stops install scripts only.
- Add an option: `.npmrc` with `ignore-scripts=true` and `omit=optional`, proven by one T3 run.
- State that the Microsoft-licensed JS package stays in `node_modules` under every vsce option. Rule 5 then needs either the owner's explicit exception or option (b) or (c).

### A10 — should-fix — §11 Q3, §0 finding 4

**Finding.** Q3 says the high advisory "clears itself" on 2026-11-12. It does not. The lockfile pins `@azure/identity` 4.14.0 and `@azure/msal-node` 6.0.1, and `npm ci` installs those until someone re-resolves the lockfile and commits it. As written, v0.1.0 ships with the high advisory in its lockfile. The plan also records no procedure for the next dependency refresh.

**Evidence.** The scratch lockfile has `node_modules/@azure/identity` 4.14.0 and `node_modules/@azure/msal-node` 6.0.1, and vsce asks for `@azure/identity` `^4.13.2`. `s1-plan-check.md:210`.

**Recommendation.**
- Make the re-resolve an in-scope item: run `npm install --before=<that day − 14 days>` on or after 2026-11-13 and before T3. That is inside the 2-week cap.
- Record the `npm audit` result in the sprint record.
- Put the refresh command in CLAUDE.md's Commands.

### A11 — should-fix — card Goal, §5 (missing panel question), owner's check

**Finding.** The goal says every token class shows "in its own colour". No test can prove that, and with the planned scopes it is false in both default themes.
- In Dark Modern, six scopes share one blue.
- All 25 word operators (`and or not in is` plus the 20 text operators) get the operator colour #d4d4d4 against a #CCCCCC editor foreground. So `has_ci` looks like a plain name.

The owner's check in Dark Modern and Light Modern will show this.

**Evidence.** Probed with a scratch script, `scratchpad/s1/arch/theme-colours.mjs`, over VS Code 1.145.2's `theme-defaults/themes` (dark_modern, which includes dark_plus, which includes dark_vs):
- `#569cd6` for `storage.type.declaration`, `storage.type.primitive`, `storage.modifier`, `storage.type.annotation`, `keyword.other.window` and `constant.language`.
- `#d4d4d4` for `keyword.operator.logical`, `.text`, `.arrow`, `.comparison` and `.arithmetic`.
- In Light Modern, the same operators get `#000000`, the default text colour.
- `dark_vs.json` maps `keyword.operator.wordlike` and `keyword.operator.expression` to `#569cd6`.

**Recommendation.**
- Reword the goal to "its own scope, coloured by the theme".
- Add panel question P6: should the word operators use `keyword.operator.wordlike.cep`, so that they colour as keywords?
- Add to the owner's check what each default theme is expected to show.

### A12 — should-fix — §11 "Decided as recommended, unless the owner objects"

**Finding.** This bucket treats silence as consent, and it calls three items "decided" before the owner answers. Ground rule 1 forbids labelling an owner decision. Sprint model §12 says answers are read literally, and no gate passes with an open question. Two of the three items are real owner choices: moving step 6's visual check to the owner changes PLAN §7, and §3 lets the owner choose two PRs at the plan check.

**Evidence.** `s1-plan-check.md:217-220`; cep ground rule 1; sprint model §3 and §12.

**Recommendation.** Turn the bucket into Q9, "Confirm these three defaults?", with a recommendation and a required answer.

### A13 — later — §1, §4, §9 (the lane split)

**Finding.** Lane B carries 5 of the 8 SP and is the critical path; lane A carries 3. The reason given for putting `check-keywords` in lane B ("so the two cannot disagree") cuts both ways: if one agent misreads §5.3, both the grammar and its checker pass. The checker's spec (§5.5.2, §6.3) is exact, so it can be built independently.

**Evidence.** Inferred; `s1-plan-check.md:12`, `:88`.

**Recommendation.** Consider moving `check-keywords` and its tests to lane A. That balances the lanes, and the checker becomes an independent reading of §5.3. If it stays in lane B, have lane B commit at three points (tests red, checker green, grammar green), so a usage stop resumes cleanly.

### A14 — later — §5, Q6 (the breaker)

**Finding.** The breaker re-derives the scope table "without reading PLAN §5.3". Scope names are naming choices, so most of the diff will be names rather than classification errors (risk 4).

**Evidence.** Inferred.

**Recommendation.** Give the breaker the list of scope names and what each one denotes, but not the rules, their order or the tests. The diff is then about which text gets which class.

### A15 — later — §4

**Finding.** `CLAUDE.md` is not in the ownership table (`docs/**` does not cover it). Yet its Commands section and its description of `npm test` change with Q3–Q5.

**Evidence.** `s1-plan-check.md:110`; `CLAUDE.md` "Commands".

**Recommendation.** Add `CLAUDE.md` to the coordinator's row.

### A16 — later — §5, Q6

**Finding.** The panel has three reviewers, but at most two agents run at once (ground rule 17). The plan check does not say which two go first.

**Evidence.** cep ground rule 17; `s1-plan-check.md:116`.

**Recommendation.** State the panel's waves, for example breaker and QA first, then the architect.

### A17 — later — §0 finding 14, Q5

**Finding.** The reason given for having no T0/T1 is incomplete. A git hook can be a Node file wired with `git config core.hooksPath`, which is neither a shell script nor a dependency. Having no T1 may still be right, since agents never push, but Q5 should show the option. Also, `check-toolchain` checks Node only, while npm's version decides the lockfile format and the path masking in finding 5.

**Evidence.** Inferred; `s1-plan-check.md:50`.

**Recommendation.** Add the Node-hook alternative to Q5. Either check npm's version too, or state why not.

### A18 — later — §2 S1

**Finding.** S1 fixes "the 24-entry top-level list" before the panel answers P2 and P3. Each of those may add a top-level rule (`duration`, `given table`).

**Evidence.** `s1-plan-check.md:88`, `:119-120`.

**Recommendation.** Make the contract "the top-level list in PLAN §5.3 v2".

### A19 — later — §11 Q4

**Finding.** Q4 bundles two things. `--no-dependencies` fixes the empty-package bug and is needed whichever check is chosen. `check-vsix` is a design choice. The "other option" text drops both.

**Evidence.** `s1-plan-check.md:213`. The empty package reproduces: under this scratchpad's UUID path, `vsce package` gave 2 files and exit 0, and `--no-dependencies` gave 8.

**Recommendation.** Present `--no-dependencies` as a fix, not an option. Q4 then asks only about the exact-set check.

## Pre-mortem (the-fool)

*It is three weeks from now and S1 has failed.*

1. **The lanes never finish — likelihood: certain; impact: high.** Lane A runs `npm test` and gets exit 255 at `test:unit`. Lane B gets exit 1 at `check-toolchain` and exit 255 at `test:snap`. Each agent either reports "done except X" or edits `package.json` or stubs the other lane's files to get green. Ownership breaks, and the combine hits conflicts in `package.json`. (A1, A3.)
   - 1st order: W1 stalls.
   - 2nd order: the coordinator re-briefs mid-wave.
   - 3rd order: the usage-window budget is spent twice.
2. **Snapshots nobody reviewed — likelihood: high; impact: high.** Lane A's `npm test` writes 19 placeholder snapshots, and lane A commits them with the fixtures. After lane B's grammar lands, every snapshot fails. Someone runs `test:snap:update` to turn red green, which breaks rule 4. Months later, cep adds an example, a re-sync copies it, and CI writes and passes its snapshot unseen. (A2.)
3. **T3 is red because of the package — likelihood: medium; impact: medium.** Lane worktrees sit inside the repo folder, and `npm run package` sweeps them in. If Q4 is adopted, `check-vsix` fails T3 mid-sprint. If Q4 is declined, a 70 MB `.vsix` with local files goes onto a public GitHub Release. (A5.)
4. **cep moves — likelihood: medium; impact: medium.** The owner merges cep S3.3-2 and pulls. Lane A's sync (default `main`) copies changed fixtures, and card line 4 fails. If keywords.go changes, the draft PR and later `main` go red, and G5 cannot close. (A6, A7.)
5. **The owner's check fails on colour — likelihood: high; impact: medium.** In Dark Modern, `and`, `has_ci` and `contains_cs` look like names, and the types, modifiers, window keywords and constants are all one blue. The goal said "its own colour", so scopes get reworked after G4. (A11.)

**Early warnings:** a lane report that says "npm test fails only on the other lane's part"; untracked `*.cep.snap` in a lane worktree; `git -C ../cep rev-parse main` ≠ `1fa3a5b`; a `.vsix` over about 20 KB.

**Inversion: what would guarantee failure?**
- A "done" no lane can meet. It exists (A1).
- A gate that passes without its input. It exists (A2).
- An external source read without a pin. It exists (A6).

## Checked and found sound

- Routine: the full loop is the owner's D6. The language-design skill does not apply, since cep's language does not change.
- Scope: one coherent change, and every in-scope item serves the goal ("checked by CI" covers CI; the drift job is D4). The not-in-scope list covers the near-misses.
- Ownership: apart from A5, A6 and A15, every file has one owner. The grammar's hand-off from the coordinator's placeholder to lane B is explicit.
- `package.json` as a coordinator-owned file works once the scripts block is complete. Neither lane needs `contributes` changed, because its paths are fixed in PLAN §5.1.
- vsce leaves out `package-lock.json` and `.npmrc` by default (`out/package.js:1256`, `:1262`).
- Finding 5 reproduces: 2 files and exit 0 under a UUID path; 8 files with `--no-dependencies`.
- Finding 12: both tools split lines on `\r\n|\n` (`dist/unit/parsing.js:86`, `dist/snapshot/index.js:13`).
- Both tools read `contributes.grammars` from `package.json` (`dist/common/index.js:92-114`).
- `keywords.go` at cep `main` has 115 unique words and 17 reserved. Local `main` and `origin/main` are both `1fa3a5b`.
- CI pins: the checkout and upload-artifact SHAs equal cep's `gate.yml` (lines 19 and 36).
- Toolchain: local Node is v26.13.0 and npm is 11.20.0, matching the planned `.nvmrc`. VS Code is 1.145.2 (meets `^1.90.0`), and `code` is on the PATH, so card line 6 can be run.
- T4 as a draft PR follows cep §10's rule for a sprint that adds a CI job.
- Sound recommendations:
  - Q1 (where the docs live);
  - Q6's reason for having no challenger (semantic tokens need the language server, which D1 excluded);
  - Q7 (forward `risk/2.5` to cep, never edit cep).
- Lanes A and B are each one coherent job, and each fits one usage window (inferred). Lane B is the tighter fit (A13).

## Probe files

All under `/private/tmp/claude-501/-Users-ramith-code-cep-vscode/0b00b821-788a-47f4-882d-af5d011a85f6/scratchpad/s1/arch/`:
- `laneA/`, `laneB/`: lane-shaped dirs for A1 and A2.
- `noopt/`: a copy of the scratch `node_modules` with the optional native packages removed (A9).
- `ext/`, `ext2/`, `*.vsix`: the packaging probes (A5, A9, A19).
- `theme-colours.mjs`, `scopes.txt`: the theme colour map (A11).
