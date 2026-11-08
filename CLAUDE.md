# cep-vscode

VS Code extension that highlights the CEP rule language (CEPS, `.cep` files). The plan, its open decisions and the status line are in [docs/PLAN.md](docs/PLAN.md).

The language is defined in the engine repo, VORSAR/cep (local clone: `../cep`): tokens in `internal/parser/lexer.go`, the one keyword table in `internal/parser/keywords.go`, the spec, grammar and examples in `docs/language/`. When this repo and cep disagree, cep wins. Never edit cep from here.

## Commands

- `npm ci` installs the pinned dev tools. `.npmrc` turns off install scripts and optional packages.
- `npm test` runs the toolchain check, unit tests, keyword check, checker, grammar and tooling tests, fixture guard and snapshot tests. Green means its exit code is 0, read yourself.
- `npm run gate` is the full gate: `npm test`, then package, the `.vsix` check and a clean-tree check. CI runs `npm ci && npm run gate`. A lane's own check is `npm run test:lane-a` or `npm run test:lane-b`.
- `npm install --before=<today minus 14 days>` re-resolves the lockfile so every package is at least two weeks old. Record `npm audit` after.
- `npm run test:snap:update` rewrites the snapshots. Run it only after reviewing the diff line by line.
- `node scripts/sync-upstream.mjs ../cep` refreshes the vendored keyword table and fixtures from cep's `main` branch. It reads through git and never touches cep's working tree.
- `npm run package` builds the `.vsix`.
- F5 opens a test VS Code window. "Developer: Inspect Editor Tokens and Scopes" shows the scopes under the cursor.

## Rules

1. The owner decides scope and trade-offs. Recommend, recommendation first; never decide.
2. Ask before anything irreversible or public: push, merge, tag, release, store publishing, new dependency.
3. Tests are the spec: no grammar change without a test that failed first.
4. A snapshot changes only with a reviewed diff; never update snapshots to turn red green.
5. Dependencies are few, exact-pinned, Apache-2-compatible and at least two weeks old. One exception (owner, 2026-11-08): `@vscode/vsce`'s closed-source `@vscode/vsce-sign`, as a build-only tool that never ships ([S1 record](docs/sprints/s1-record.md)).
6. No shell scripts; utility scripts use no npm dependencies.
7. Agents never push, merge or tag; only the owner merges to `main`.
8. No AI attribution in git. No secrets in the repo.
9. Docs describe what is built and stay lean; status lives in the plan's status line.
