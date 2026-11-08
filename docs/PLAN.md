# Plan: CEP syntax highlighting for VS Code

**Status (2026-11-08):** Sprint S1 passed G0 ([record](sprints/s1-record.md)); the scaffold and the gate's toolchain check are built. Next: the design panel on §5–§6 (two waves), then design v2 and G1.

This is a build-ready spec. An agent should be able to build v1 from this file and the cep files it names, with nothing left to guess. Where a regex in §5.3 and a test in §6 disagree, the test is the authority: fix the regex.

## 1. Goal and scope

v1 delivers, for every `.cep` file opened in VS Code:

- colours for every CEPS token class (§5.3);
- Ctrl+/ toggles `--` line comments, Shift+Alt+A toggles `/* */` block comments;
- bracket matching and auto-closing for `( [ {` and the quotes `' " `` ` ``;
- four lexical errors shown in the error colour: a wrong-case keyword (E-KW-002), a reserved-for-later word (E-RES-001), a single-quoted string that runs past the line end (E-STR-001), a bad string escape (E-STR-002).

v1 is declarative only: `package.json`, `language-configuration.json` and one TextMate grammar. It has no TypeScript, no `src/` and no build step.

Not in v1: error squiggles, hover, go-to-definition, formatting (these need a language server, §9) and snippets (open, D1).

## 2. Decisions

**Made (owner, 2026-11-08):** the extension lives in its own repo, VORSAR/cep-vscode, not inside cep. It keeps Node out of cep's pinned toolchain and gate, lets it release on its own tags, and keeps any store token out of the engine's CI.

**Answered (owner, 2026-11-08; each answer is marked under its question, "≠ R" where it differs from the recommendation):**

- **D1. v1 scope.**
  - (a) Highlighting and editor basics as in §1. *Recommended:* a few days of declarative work.
  - (b) (a) plus snippets, for example an empty rule with its clauses in the fixed order.
  - (c) (a) plus live error checking. That needs the language server (§9), which is cep engine work.
  - **Owner, 2026-11-08: (a), as recommended.**
- **D2. Tools.**
  - The tools themselves. *Recommended:* allow two exact-pinned dev dependencies, with `package-lock.json` committed:
    - `@vscode/vsce` 4.0.0 (MIT, released 2026-09-14). 4.1.0 came out on 2026-10-28 and is under two weeks old.
    - `vscode-tmgrammar-test` 0.1.3 (MIT, released 2024-02-05).

    Also pin Node 26.13.0 (LTS, the version installed locally) in `.nvmrc`.
  - The script language.
    - *Recommended:* plain Node with no npm packages, because Node is already required.
    - The alternative is stdlib Python, the owner's usual choice, but it adds a second toolchain to pin.
  - **Owner, 2026-11-08: both dev dependencies, exact-pinned, Node 26.13.0 in `.nvmrc`, plain Node scripts; as recommended.** The S1 plan check found a licence and an age question in their transitive tree (its §11 Q2, Q3). **Owner, 2026-11-08, at G0:** keep vsce with install scripts and optional packages off, with a rule 5 exception for `@vscode/vsce-sign`; resolve the lockfile with `--before` (today − 14 days), again on or after 2026-11-13 ([S1 record](sprints/s1-record.md#decisions-at-the-gates)).
- **D3. Release channel.**
  - *Recommended:* a `.vsix` attached to a GitHub Release, installed with `code --install-extension`.
  - Later: VS Code Marketplace plus Open VSX (for Cursor and VSCodium). Both are public listings that need a `vorsar` publisher account and a token secret in CI.
  - **Owner, 2026-11-08: a `.vsix` on a GitHub Release; as recommended.**
- **D4. Keyword drift.**
  - *Recommended:*
    - a vendored copy of cep's `keywords.go`;
    - an offline check in `npm test` that the grammar matches it;
    - a CI job that compares the copy with cep `main` and goes red when cep changes.
  - The alternative is to compare by hand.
  - **Owner, 2026-11-08: the vendored copy, the offline check and the CI job; as recommended.**
- **D5. Identity.**
  - *Recommended:* extension name `cep`, publisher `vorsar` (so the Marketplace ID is `vorsar.cep`), display name "CEP Language", language id `cep`, root scope `source.cep`.
  - The publisher name is only reserved when a Marketplace account is created (D3).
  - **Owner, 2026-11-08: `vorsar.cep`, "CEP Language", language id `cep`, scope `source.cep`; as recommended.**
- **D6. Process.**
  - *Recommended:* the light rules in `CLAUDE.md`, as one PR for v1.
  - The alternative is cep's full sprint model (G0–G5, design and QA panels), which is heavy for a few declarative files.
  - **Owner, 2026-11-08: cep's full sprint model (≠ R).** v1 runs as sprint S1 through the full loop; §7 below is the build order inside the loop's lanes, as mapped in [the S1 plan check §1](sprints/s1-plan-check.md#1-routine-shape-waves).

## 3. Where the language is defined

cep is the source of truth. The files used, pinned at **cep `main` = `1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49` (2026-11-08)**:

| cep path | What this repo takes from it |
|---|---|
| `internal/parser/lexer.go` (the `rules` table) | Every token class and its exact regex; §5.3 mirrors it |
| `internal/parser/keywords.go` | `keywordList` (115 reserved words) and `reservedFuture` (17 of them that are errors in v0.1). Vendored as `test/upstream/keywords.go` |
| `docs/language/SPEC.md` §2 | Lexical rules: keywords lowercase-only (§2.1); identifiers and backticked names (§2.3); string escapes, exhaustively `\\ \' \" \n \t \r \uXXXX`, anything else is E-STR-002 (§2.4 table) |
| `docs/language/grammar.lark` | Where each keyword can appear; used for the categories in §5.3 |
| `docs/language/examples/*.cep` (10 files) and `examples/torture/*.cep` (2 files) | Snapshot fixtures. `torture/lexical.cep` uses every literal form; `torture/comments.cep` covers every comment case and has CRLF line endings and no final newline |
| `docs/language/invalid/` (7 files, §6.2) | Snapshot fixtures for the error scopes |

The language is `language cep/0.1;` (frozen). The grammar targets exactly that version.

## 4. Target repo layout

```
cep-vscode/
├── CLAUDE.md                        # agent instructions (exists)
├── LICENSE                          # Apache-2.0 (exists)
├── README.md                        # rewrite in step 7
├── CHANGELOG.md                     # "## 0.1.0" entry in step 7
├── package.json                     # §5.1
├── package-lock.json                # from npm install, committed
├── language-configuration.json      # §5.2
├── syntaxes/
│   └── cep.tmLanguage.json          # §5.3
├── scripts/
│   ├── sync-upstream.mjs            # §5.5.1
│   ├── check-keywords.mjs           # §5.5.2
│   ├── check-upstream.mjs           # §5.5.3
│   ├── check-fixtures.mjs           # §5.5.4
│   ├── check-vsix.mjs               # §5.5.5
│   ├── check-clean.mjs              # §5.5.6
│   └── check-toolchain.mjs          # §5.5.7 (built)
├── test/
│   ├── upstream/
│   │   ├── keywords.go              # byte copy of cep's internal/parser/keywords.go
│   │   └── SOURCE                   # "VORSAR/cep <sha> <date>" of the copy
│   ├── unit/*.test.cep              # §6.1, 6 files
│   ├── fixtures/
│   │   ├── examples/*.cep (+ .cep.snap)   # 10 files
│   │   ├── torture/*.cep  (+ .cep.snap)   # 2 files
│   │   └── invalid/*.cep  (+ .cep.snap)   # 7 files
│   ├── checker.test.mjs             # §6.3
│   ├── grammar.test.mjs             # scope lint + language configuration (plan check card lines 1, 9)
│   ├── tools.test.mjs               # §6.4
│   └── toolchain.test.mjs           # §5.5.7 (built)
├── docs/PLAN.md                     # this file
├── .github/workflows/ci.yml         # §5.6
├── .vscode/launch.json              # §5.4
├── .gitignore  .gitattributes  .nvmrc  .npmrc   # §5.4 (no .vscodeignore: package.json "files")
```

## 5. File specs

*v1.1 (2026-11-08, after G0). This version applies the owner's G0 answers and the S1 plan check's §10 dispositions. §5.1 and §5.4 describe the built scaffold. §5.5.1, §5.5.3 and §5.6 gain test seams and the gate. §5.5.4–§5.5.7 are new. The grammar (§5.3) and the unit tests (§6.1) are unchanged until the design panel answers the plan check's P1–P8; they become v2 at G1.*

### 5.1 `package.json`

Built in the scaffold. The file itself is the reference. It holds:
- the identity and `contributes` fields of v1 (D5);
- the plan check's S2 `scripts` block;
- the S4 `files` allowlist, which replaces `.vscodeignore` (owner, Q4);
- the two exact pins (D2).

The scripts that matter:
- `npm test`: the whole suite.
- `npm run gate`: T3 and CI. It runs `npm test`, then `package`, which is `vsce package --no-dependencies` (plan check §0 finding 5), then `test:vsix` and `test:clean`.
- `npm run test:lane-a` and `npm run test:lane-b`: each lane's T2.

Both test tools read `contributes.grammars` from `package.json`, so they need no `-g` flag. The glob quotes are required, because the tools expand the globs themselves. Both exit −1 when a glob finds nothing. `vscode-tmgrammar-snap` without `--updateSnapshot` writes any missing `.snap` and exits 0, which is why `test:fixtures` (§5.5.4) runs before it.

### 5.2 `language-configuration.json`

```json
{
  "comments": { "lineComment": "--", "blockComment": ["/*", "*/"] },
  "brackets": [["(", ")"], ["[", "]"], ["{", "}"]],
  "autoClosingPairs": [
    { "open": "(", "close": ")" },
    { "open": "[", "close": "]" },
    { "open": "{", "close": "}" },
    { "open": "'", "close": "'", "notIn": ["string", "comment"] },
    { "open": "\"", "close": "\"", "notIn": ["string", "comment"] },
    { "open": "`", "close": "`", "notIn": ["string", "comment"] },
    { "open": "/*", "close": " */", "notIn": ["string"] }
  ],
  "surroundingPairs": [["(", ")"], ["[", "]"], ["{", "}"], ["'", "'"], ["\"", "\""], ["`", "`"]],
  "wordPattern": "\\$\\{[A-Za-z_][A-Za-z0-9_]*\\}|[A-Za-z_][A-Za-z0-9_]*|[0-9]+(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?"
}
```

Folding is not configured. VS Code's default indentation folding already folds a `rule` and its indented clauses.

### 5.3 `syntaxes/cep.tmLanguage.json`

**How TextMate picks a rule.** At each position it tries every pattern in the current list. The match that **starts earliest** wins; on a tie, the pattern **listed first** wins. Every ordering rule below follows from that.

**Skeleton.** The top-level `patterns` MUST be exactly this list, in this order. `check-keywords.mjs` enforces the order.

```json
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "CEP",
  "scopeName": "source.cep",
  "fileTypes": ["cep"],
  "patterns": [
    { "include": "#comments" },
    { "include": "#strings" },
    { "include": "#pragma" },
    { "include": "#param-ref" },
    { "include": "#backticked" },
    { "include": "#annotation" },
    { "include": "#declarations" },
    { "include": "#insert-target" },
    { "include": "#number" },
    { "include": "#keywords-declaration" },
    { "include": "#keywords-type" },
    { "include": "#keywords-modifier" },
    { "include": "#keywords-clause" },
    { "include": "#keywords-window" },
    { "include": "#keywords-unit" },
    { "include": "#keywords-logical" },
    { "include": "#keywords-constant" },
    { "include": "#keywords-builtin" },
    { "include": "#keywords-text" },
    { "include": "#keywords-reserved" },
    { "include": "#keywords-wrong-case" },
    { "include": "#function-call" },
    { "include": "#operators" },
    { "include": "#punctuation" }
  ],
  "repository": {
    "comments": {
      "patterns": [
        {
          "name": "comment.line.double-dash.cep",
          "match": "(--).*$",
          "captures": { "1": { "name": "punctuation.definition.comment.cep" } }
        },
        {
          "name": "comment.block.cep",
          "begin": "/\\*",
          "end": "\\*/",
          "beginCaptures": { "0": { "name": "punctuation.definition.comment.cep" } },
          "endCaptures": { "0": { "name": "punctuation.definition.comment.cep" } }
        }
      ]
    },
    "keywords-unit": { "name": "keyword.other.unit.cep", "match": "\\b(?:ms|sec|min|hour|day|week)\\b" }
  }
}
```

**Ordering rules (MUST):**

1. `comments` comes before everything, so `--x` is never two minus signs and `/*` is never division.
2. Inside `strings`, the triple-quoted rules come before the single-quoted ones, so `'''` doesn't open an empty `''` string.
3. `pragma`, `declarations` and `insert-target` come before the `keywords-*` rules, because they start on the same keyword and must win the tie.
4. Every exact-case `keywords-*` rule comes before `keywords-wrong-case`, so `from` is a keyword and only `FROM`/`From` is an error.
5. Every `keywords-*` rule comes before `function-call`. Otherwise `sort(`, `cron(`, `delay(`, `batch(`, `raw(` and `has_any_ci(` would be coloured as function calls.
6. Inside `operators`, `->` and the two-character comparisons come before the single characters.

**The rules.**

The regexes below are written plain. When writing the JSON, escape every backslash, so `\b` becomes `"\\b"` and `\$\{` becomes `"\\$\\{"`. `NAME` below stands for this exact text: ``[A-Za-z_][A-Za-z0-9_]*|`[A-Za-z0-9_\-. ]*` `` (a plain name, or a backticked name as cep's lexer defines it).

```
comments
  line          match  (--).*$          name comment.line.double-dash.cep   cap 1 punctuation.definition.comment.cep
  block         begin  /\*  end  \*/    name comment.block.cep              begin/end cap 0 punctuation.definition.comment.cep
                no inner patterns: block comments do not nest; an unclosed one runs to end of file (E-CMT-001)

strings         (rules in this order)
  triple-single begin '''  end '''      name string.quoted.triple.single.cep   no inner patterns (raw: \n stays two characters)
  triple-double begin """  end """      name string.quoted.triple.double.cep   no inner patterns
  single        begin '    end (')|((?:[^\\\n])$)
                name string.quoted.single.cep
                begin cap 0 punctuation.definition.string.begin.cep
                end cap 1 punctuation.definition.string.end.cep, end cap 2 invalid.illegal.newline.cep   (E-STR-001)
                patterns: include #string-escapes
  double        same as single with " in place of '   name string.quoted.double.cep

string-escapes  (rules in this order)
  valid         match \\(?:[\\'"ntr]|u[0-9A-Fa-f]{4})   name constant.character.escape.cep
  invalid       match \\.                               name invalid.illegal.escape.cep      (E-STR-002)

pragma          match \b(language)\s+([a-z][a-z0-9_]*/[0-9]+\.[0-9]+)
                cap 1 storage.type.declaration.cep, cap 2 constant.other.version.cep

param-ref       match \$\{[A-Za-z_][A-Za-z0-9_]*\}      name variable.other.constant.param.cep

backticked      match `[A-Za-z0-9_\-. ]*`               name variable.other.quoted.cep

annotation      match (@)([A-Za-z_][A-Za-z0-9_]*)
                cap 1 punctuation.definition.annotation.cep, cap 2 storage.type.annotation.cep

declarations    (four rules; cap 1 is always storage.type.declaration.cep)
  stream        match \b(stream)\s+(NAME)   cap 2 entity.name.type.stream.cep
  table         match \b(table)\s+(NAME)    cap 2 entity.name.type.table.cep
  rule          match \b(rule)\s+(NAME)     cap 2 entity.name.function.rule.cep
  param         match \b(param)\s+(NAME)    cap 2 variable.other.constant.param.cep

insert-target   match \b(insert)\s+(into)\s+(NAME)
                cap 1 and 2 keyword.control.clause.cep, cap 3 entity.name.type.stream.cep

number          match \b[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\b    name constant.numeric.cep

function-call   (rules in this order)
  namespaced    match \b([A-Za-z_][A-Za-z0-9_]*)(:)([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()
                cap 1 entity.name.namespace.cep, cap 2 punctuation.separator.namespace.cep, cap 3 support.function.cep
  plain         match \b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()           cap 1 support.function.cep

operators       (rules in this order)
  arrow         match ->                  name keyword.operator.arrow.cep
  comparison    match ==|!=|>=|<=|>|<     name keyword.operator.comparison.cep
  assignment    match =                   name keyword.operator.assignment.cep
  arithmetic    match [+\-*/%]            name keyword.operator.arithmetic.cep

punctuation
  match ;   name punctuation.terminator.statement.cep
  match ,   name punctuation.separator.comma.cep
  match \.  name punctuation.accessor.cep
  match :   name punctuation.separator.key-value.cep
```

**Keyword rules.** Each `keywords-<category>` entry is a single `{ "name": <scope>, "match": "\\b(?:w1|w2|…)\\b" }`. The match MUST be in exactly that form, with the words in the order listed below, because `check-keywords.mjs` parses it. Each of the 115 words of `keywordList` sits in exactly one category.

| Repository key | Scope | Words |
|---|---|---|
| `keywords-declaration` | `storage.type.declaration.cep` | language param stream table rule |
| `keywords-type` | `storage.type.primitive.cep` | string int float bool timestamp duration object |
| `keywords-modifier` | `storage.modifier.cep` | optional primary key |
| `keywords-clause` | `keyword.control.clause.cep` | intent partition by of ttl from every once within for after match skip past last late events drop allow select as output first insert into window emit on close change due end time arrival watermark bounded ascending idle expect given then todo asc desc |
| `keywords-window` | `keyword.other.window.cep` | sort cron delay batch |
| `keywords-unit` | `keyword.other.unit.cep` | ms sec min hour day week |
| `keywords-logical` | `keyword.operator.logical.cep` | and or not in is |
| `keywords-constant` | `constant.language.cep` | true false null |
| `keywords-builtin` | `support.function.builtin.cep` | raw |
| `keywords-text` | `keyword.operator.text.cep` | has_ci has_cs contains_ci contains_cs starts_with_ci starts_with_cs ends_with_ci ends_with_cs has_any_ci has_any_cs has_all_ci has_all_cs contains_any_ci contains_any_cs contains_all_ci contains_all_cs matches_ci matches_cs contains_match_ci contains_match_cs |
| `keywords-reserved` | `invalid.illegal.reserved.cep` | group having order limit offset join trigger aggregation sequence session tumbling hopping sliding processing route to punctuated |

The counts are 5 + 7 + 3 + 44 + 4 + 6 + 5 + 3 + 1 + 20 + 17 = 115. `keywords-reserved` MUST equal `reservedFuture` exactly (E-RES-001).

`keywords-wrong-case` is `{ "name": "invalid.illegal.keyword-case.cep", "match": "(?i)\\b(?:<all 115 words, in keywords.go order>)\\b" }`. Rule 4 means it only ever matches spellings that are not all-lowercase. That covers E-KW-002 (`FROM`) and the wrong-case-identifier half of E-KW-001 (`Select` used as a name). The 115 words in keywords.go order, ready to paste:

```
language|param|stream|table|rule|intent|partition|by|of|ttl|from|every|once|within|for|after|match|skip|past|last|late|events|drop|allow|route|to|select|as|output|first|insert|into|window|sort|cron|delay|batch|emit|on|close|change|due|end|time|arrival|watermark|bounded|ascending|punctuated|idle|primary|key|optional|expect|given|then|todo|and|or|not|in|is|null|true|false|raw|timestamp|string|int|float|bool|duration|object|asc|desc|ms|sec|min|hour|day|week|has_ci|has_cs|contains_ci|contains_cs|starts_with_ci|starts_with_cs|ends_with_ci|ends_with_cs|has_any_ci|has_any_cs|has_all_ci|has_all_cs|contains_any_ci|contains_any_cs|contains_all_ci|contains_all_cs|matches_ci|matches_cs|contains_match_ci|contains_match_cs|group|having|order|limit|offset|join|trigger|aggregation|sequence|session|tumbling|hopping|sliding|processing
```

**Known limitations (accepted for v1; a TextMate grammar matches patterns, it does not parse):**

- References are plain identifiers: stream and table names after `from`, `of` and `in`; step aliases like `lead`; and `lead.agentId`. Only declarations and `insert into` targets get name scopes.
- A keyword used as a declared name (`stream select (…)`, `stream SeleCT (…)`, both E-KW-001) shows as a name, not an error. The `declarations` rule captures it first.
- Annotation keys (`type`, `url`) and record field names (`{agentId: …}`) are plain.
- No other E-code is shown. That needs the language server (§9).

### 5.4 Small files

`.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

~~`.vscodeignore`~~: replaced by the `files` allowlist in `package.json` (owner, 2026-11-08, Q4). A denylist packs any stray folder, such as an agent worktree inside the repo (probed in the plan check's review). vsce refuses to combine the two.

`.gitignore`:

```
node_modules/
*.vsix
.claude/worktrees/
```

`.npmrc` (owner, 2026-11-08, Q2) keeps every install script from running and every optional package, including vsce-sign's native binary, off disk:

```
ignore-scripts=true
omit=optional
```

`.gitattributes` keeps fixture bytes exact. `torture/comments.cep` has 5 CRLF line endings that are under test, and must survive any `core.autocrlf` setting:

```
test/fixtures/** -text
test/upstream/** -text
```

`.nvmrc`: `26.13.0`

### 5.5 Scripts

All scripts are ES modules run with `node`, and they use only Node built-ins (`node:fs`, `node:path`, `node:child_process`, `node:process`, `node:zlib`, global `fetch`).
- Subprocesses use `execFileSync` with an argument array, never a shell string.
- The exit code is 0 for a pass and 1 for any failure. A missing or unparsable input is a failure, never a pass.
- Every message starts with the script's name, for example `check-keywords: …`. A failure message also names the input or the item at fault.
- Every default path resolves from the script's own location (`import.meta.dirname`), not the current directory, so a script behaves the same from any worktree.
- Each script's tests (§6.3, §6.4) assert its message, not just its exit code, because Node itself exits 1 for a missing script. They also include a passing case.

#### 5.5.1 `scripts/sync-upstream.mjs <path-to-cep-clone> [--ref <git-ref>] [--out <dir>]`

The script reads files from a git ref, `main` by default, through git's object store. It never reads or changes the cep working tree, so it works whatever branch the cep clone has checked out (the owner's clone is usually on a sprint branch). Run `git -C ../cep fetch origin` first and pass `--ref origin/main` to sync with the remote's `main`.

- **`--out <dir>`** is the root that the paths below are written under. It defaults to the repo root. The tests pass a temporary directory and a throwaway git repo as the "cep clone", so they never need a real cep or touch this repo's tree.
- **In S1** the sync runs pinned to the sprint's target: `node scripts/sync-upstream.mjs <absolute path of the cep clone> --ref 1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`.

1. Fail if no path is given, or if `git -C <cep> rev-parse --verify <ref>^{commit}` fails.
2. Read each file with `git -C <cep> cat-file blob <ref>:<path>` through `execFileSync(…, { encoding: 'buffer' })`. That gives raw bytes, with no line-ending conversion. Write the Buffer as-is, creating directories as needed:
   - `internal/parser/keywords.go` → `test/upstream/keywords.go`
   - every `*.cep` listed by `git -C <cep> ls-tree --name-only <ref> docs/language/examples/` → `test/fixtures/examples/`
   - every `*.cep` listed by `git -C <cep> ls-tree --name-only <ref> docs/language/examples/torture/` → `test/fixtures/torture/`
   - `ls-tree` prints full paths, for example `docs/language/examples/01-agent-kill-switch.cep`, and lists the `torture` folder as an entry of its own. Keep only names ending in `.cep`, and write each under its basename.
   - these seven under `docs/language/invalid/` → `test/fixtures/invalid/`: `e-cmt-001-unterminated-comment.cep`, `e-kw-001-keyword-as-identifier.cep`, `e-kw-001-mixedcase-identifier.cep`, `e-kw-002-uppercase-keyword.cep`, `e-res-001-group-by.cep`, `e-str-001-newline-in-single-quoted.cep`, `e-txt-001-unsuffixed-text-operator.cep`. A missing one is a failure.
3. Write `test/upstream/SOURCE` as one line, `VORSAR/cep <sha> <date>`, from `git -C <cep> log -1 --format=%H %cs <ref>`.
4. Never delete anything, because the `.cep.snap` files live next to the fixtures. List every `test/fixtures/**/*.cep` that was not in this copy set and exit 1 if there are any, so a person removes the stale fixture and its snapshot.
5. Print the files written that changed and the line `next: npm test, then review every snapshot diff`.

#### 5.5.2 `scripts/check-keywords.mjs [--grammar <path>] [--keywords <path>]`

The defaults are `syntaxes/cep.tmLanguage.json` and `test/upstream/keywords.go`.

1. Read the keyword file. Take `keywordList` as every `"…"` string between the line containing `keywordList = []string{` and the next line that is exactly `}`. Take `reservedFuture` as every `"…"` key between `reservedFuture = map[string]bool{` and the next line that is exactly `}`. Fail if either is empty.
2. Read the grammar JSON. For every `repository` key starting with `keywords-`, other than `keywords-wrong-case`, parse its `match` against `^\\b\(\?:([a-z_|]+)\)\\b$` and split group 1 on `|`. For `keywords-wrong-case`, parse its `match` against `^\(\?i\)\\b\(\?:([a-z_|]+)\)\\b$`.
3. Fail with one line per problem if:
   - (a) a `keywords-*` match is not in its canonical form;
   - (b) a word is in two categories;
   - (c) a `keywordList` word is in no category;
   - (d) a category word is not in `keywordList`;
   - (e) the set of `keywords-reserved` words differs from `reservedFuture`;
   - (f) the set of `keywords-wrong-case` words differs from `keywordList`;
   - (g) the top-level `patterns` list differs from the skeleton list in §5.3, which is held in the script as a constant.
4. On pass, print `check-keywords: ok (<n> keywords, <m> reserved, <k> categories)`. At the pinned commit that is `115 keywords, 17 reserved, 11 categories`.

#### 5.5.3 `scripts/check-upstream.mjs [--url <url>] [--local <path>]` (CI's scheduled job)

1. Fetch `--url` with `fetch` and `AbortSignal.timeout(30000)`. The default is `https://raw.githubusercontent.com/VORSAR/cep/main/internal/parser/keywords.go`.
2. A network error or a non-200 status is a failure: `check-upstream: could not fetch <url>: <reason or status>`.
3. Compare the fetched bytes with `--local`, which defaults to `test/upstream/keywords.go`, read with `test/upstream/SOURCE` beside it.
   - If they are equal, exit 0 with `check-upstream: ok (matches <SOURCE line>)`.
   - Otherwise exit 1 with `check-upstream: cep main's keyword table differs from test/upstream (synced at <SOURCE line>); run sync-upstream, update the grammar, review the snapshots`.

The tests use three seams, since Node's `fetch` cannot read `file:` URLs:
- a `data:` URL for the same bytes (exit 0) and for a changed copy (exit 1);
- a port with nothing listening, for a refused connection;
- a `node:http` server on `127.0.0.1` that answers 404.

This script is not part of `npm test`, so local runs stay offline and deterministic.

#### 5.5.4 `scripts/check-fixtures.mjs [--root <dir>]`

This is the guard that `test:snap` lacks: the snapshot tool writes a missing snapshot and passes.

1. `--root` defaults to the repo root. List the files under `<root>/test/fixtures/` on disk, and list the tracked ones with `git -C <root> ls-files -- test/fixtures`. Tracked means staged or committed.
2. Fail, with one line per problem, if:
   - (a) the `.cep` counts are not exactly 10 in `examples/`, 2 in `torture/` and 7 in `invalid/` (constants in the script);
   - (b) a `.cep` has no tracked `<name>.cep.snap` beside it;
   - (c) a `.cep.snap` has no `.cep` beside it;
   - (d) any other file is there.
3. On a pass, print `check-fixtures: ok (19 fixtures, 19 tracked snapshots)`.

Its tests build a throwaway git repo in a temporary directory.

#### 5.5.5 `scripts/check-vsix.mjs <file.vsix>`

1. Read the file with `node:fs`. Find the zip's end-of-central-directory record, signature `0x06054b50`, searching back from the end over at most 65,557 bytes. Then read every central-directory entry, signature `0x02014b50`, and collect the file names. A missing file, or a file that is not a zip, is a failure.
2. Compare the names, as a set, with the 8 of the S1 plan check's S4 (a constant):

   ```
   extension.vsixmanifest
   [Content_Types].xml
   extension/package.json
   extension/readme.md
   extension/changelog.md
   extension/LICENSE.txt
   extension/language-configuration.json
   extension/syntaxes/cep.tmLanguage.json
   ```

   Fail with one line per missing name and one per extra name.
3. On a pass, print `check-vsix: ok (8 files)`.

Its tests write small zips with `node:zlib` (stored or deflated) into a temporary directory: the S4 set (exit 0), an empty zip, one with an extra `extension/test/x`, one without the grammar, and a non-zip file.

#### 5.5.6 `scripts/check-clean.mjs [--root <dir>]`

Run `git -C <root> status --porcelain --untracked-files=all`. Ignored files (`node_modules/`, `*.vsix`) are not listed. Any output is a failure, and the message lists each path. This is how `npm run gate` catches a snapshot or any other file written during the run. On a pass, print `check-clean: ok`. Its tests use a throwaway git repo: a clean one, one with an untracked file, and one with a changed file.

#### 5.5.7 `scripts/check-toolchain.mjs [--nvmrc <path>] [--node <version>]`

Built in the scaffold. It fails unless the running Node (or `--node`) equals the exact `x.y.z` in `.nvmrc`, accepting a leading `v` in either. A missing, unreadable or inexact `.nvmrc` is a failure. On a pass it prints `check-toolchain: ok (node <version>)`. Its tests are `test/toolchain.test.mjs`. Whether it should also check npm's version is open for the panel (plan check A17).

### 5.6 `.github/workflows/ci.yml`

Every action is pinned to a full commit SHA. The checkout and upload SHAs are the ones cep's own workflow pins; setup-node v7.1.0 was released on 2026-10-08.

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
permissions:
  contents: read
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1  # v7.1.0
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run gate
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9  # v7.0.2
        with:
          name: vsix
          path: "*.vsix"
  upstream:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1  # v7.1.0
        with:
          node-version-file: .nvmrc
      - run: node scripts/check-upstream.mjs
```

The test job runs exactly T3 (`npm ci`, then `npm run gate`; owner, 2026-11-08, Q5). A tooling test (§6.4) fails unless it does. `npm run gate` includes the `.vsix` check and the clean-tree check.

The `upstream` job runs only on the weekly `schedule` and by hand (owner, 2026-11-08, Q8). A cep keyword change then shows up within a week, even when nobody touches this repo, but it never blocks a PR or a merge here. A red scheduled run starts a re-sync sprint.

## 6. Tests

These are the spec. Write all of them first, see them fail, then write the grammar (§7).

### 6.1 Unit tests: `test/unit/*.test.cep`

**Format** (`vscode-tmgrammar-test`):

- Line 1 is `-- SYNTAX TEST "source.cep" "<description>"`.
- An assertion line starts with `--` and points at the source line above it.
- `^` marks the columns that must carry the scope.
- Because `--` itself occupies columns 0–1, a token starting at column 0 is asserted with `<` followed by one `-` per character: `-- <----- scope` covers 5 characters from column 0.
- `^ - scope` asserts that a scope is absent; `^ a - b` asserts `a` is present and `b` absent.
- The test tool ignores assertion lines when tokenizing, so they never affect the grammar's state.

**Example: `test/unit/literals.test.cep`, verbatim.** The caret columns were generated by script and are exact; write this file as shown.

```
-- SYNTAX TEST "source.cep" "literals and declarations"
language cep/0.1;
-- <-------- storage.type.declaration.cep
--       ^^^^^^^ constant.other.version.cep
--              ^ punctuation.terminator.statement.cep
param grace duration = 1 hour 30 min;
-- <----- storage.type.declaration.cep
--    ^^^^^ variable.other.constant.param.cep
--          ^^^^^^^^ storage.type.primitive.cep
--                   ^ keyword.operator.assignment.cep
--                     ^ constant.numeric.cep
--                       ^^^^ keyword.other.unit.cep
--                            ^^ constant.numeric.cep
--                               ^^^ keyword.other.unit.cep
param threshold float = 2.5e-3;
--                      ^^^^^^ constant.numeric.cep
param strict bool = true;
--                  ^^^^ constant.language.cep
stream `agent-events` (id string, ts timestamp) time ts watermark bounded 2 min;
--     ^^^^^^^^^^^^^^ entity.name.type.stream.cep
--                                   ^^^^^^^^^ storage.type.primitive.cep
--                                              ^^^^ keyword.control.clause.cep
--                                                      ^^^^^^^^^ keyword.control.clause.cep
  partition by id of `agent-events` ttl ${grace}
--^^^^^^^^^ keyword.control.clause.cep
--                   ^^^^^^^^^^^^^^ variable.other.quoted.cep
--                                      ^^^^^^^^ variable.other.constant.param.cep
  from S[ts > timestamp '2026-01-01T00:00:00Z' and text has_ci 'it\'s']
--            ^^^^^^^^^ storage.type.primitive.cep
--                      ^^^^^^^^^^^^^^^^^^^^^^ string.quoted.single.cep
--                                             ^^^ keyword.operator.logical.cep
--                                                      ^^^^^^ keyword.operator.text.cep
--                                                                ^^ constant.character.escape.cep
  select math:round(risk) as scaled, Select
--       ^^^^ entity.name.namespace.cep
--            ^^^^^ support.function.cep
--                        ^^ keyword.control.clause.cep
--                                   ^^^^^^ invalid.illegal.keyword-case.cep
  group by a -- not a 'string'
--^^^^^ invalid.illegal.reserved.cep
--           ^^^^^^^^^^^^^^^^^ comment.line.double-dash.cep
```

**The other five files.** Each block below is a source line, then the token and the scope it must have; `≠` means the scope must be absent. Write each source line, then one assertion line per token. Line fragments need not form a valid program; the grammar does not parse.

`test/unit/comments.test.cep`:

```
-- a whole-line comment                       "--" → punctuation.definition.comment.cep; "a whole-line comment" → comment.line.double-dash.cep
x /* inline */ y                              "/* inline */" → comment.block.cep; "y" ≠ comment.block.cep
/* first line                                 (two source lines) "second line" on line 2 → comment.block.cep
   second line */
a == /* between */ 'read'                     "'read'" → string.quoted.single.cep
resource == 'vault -- not a comment'          "--" → string.quoted.single.cep ≠ comment.line.double-dash.cep
/* has -- and 'quote' */                      "'quote'" → comment.block.cep ≠ string.quoted.single.cep
after /* x */ match skip past last            "match" → keyword.control.clause.cep
```

`test/unit/strings.test.cep`:

```
"say \"hi\" and a \\ backslash"               "\"" (first) → constant.character.escape.cep; "\\" → constant.character.escape.cep; whole → string.quoted.double.cep
'caf\u00e9'                                   "\u00e9" → constant.character.escape.cep
'bad \x escape'                               "\x" → invalid.illegal.escape.cep
'''raw \n stays'''                            "\n" → string.quoted.triple.single.cep ≠ constant.character.escape.cep
"""raw "double" and 'single' quotes"""        "double" and 'single' → string.quoted.triple.double.cep
  intent '''first line                        (three source lines) line 2's "--" → string.quoted.triple.single.cep ≠ comment.line.double-dash.cep;
  -- not a comment                            line 3's "last" → string.quoted.triple.single.cep
last'''
  intent 'this intent                         last "t" → invalid.illegal.newline.cep   (E-STR-001; make this the file's last source line)
```

`test/unit/keywords.test.cep`: one line per category, then the error and edge cases:

```
language                                      "language" → storage.type.declaration.cep
rule;                                         "rule" → storage.type.declaration.cep
string int float bool timestamp duration object   each → storage.type.primitive.cep
optional primary key                          each → storage.modifier.cep
from every within after select output emit    each → keyword.control.clause.cep
sort cron delay batch                         each → keyword.other.window.cep
ms sec min hour day week                      each → keyword.other.unit.cep
and or not in is                              each → keyword.operator.logical.cep
true false null                               each → constant.language.cep
has_ci contains_cs has_any_ci matches_cs contains_match_ci   each → keyword.operator.text.cep
group having join session route to punctuated each → invalid.illegal.reserved.cep
FROM Select SeleCT Min                        each → invalid.illegal.keyword-case.cep   (E-KW-002 / E-KW-001)
a has 'secret'                                "has" ≠ keyword.operator.text.cep   (E-TXT-001: unsuffixed is not an operator)
ts_min int_value into intake                  "ts_min" ≠ keyword.other.unit.cep; "int_value" ≠ storage.type.primitive.cep; "into" → keyword.control.clause.cep; "intake" ≠ keyword.operator.logical.cep
```

The first two lines are written this way because `stream`, `table`, `rule` and `param` followed by a name match `declarations`, and `language` followed by a version matches `pragma` (§5.3). A bare `language` and `rule;` reach `keywords-declaration` itself.

`test/unit/names.test.cep`:

```
stream Findings (agentId string)              "stream" → storage.type.declaration.cep; "Findings" → entity.name.type.stream.cep; "Findings" ≠ support.function.cep
table Blocked (agentId string) primary key (agentId)   "Blocked" → entity.name.type.table.cep; "key" → storage.modifier.cep ≠ support.function.cep
rule LexicalTorture                           "LexicalTorture" → entity.name.function.rule.cep
  insert into Findings;                       "insert" and "into" → keyword.control.clause.cep; "Findings" → entity.name.type.stream.cep
@sink(type = 'http', @map(type = 'json'))     "@" → punctuation.definition.annotation.cep; "sink" and "map" → storage.type.annotation.cep
select count() as n, coalesce(text, 'none')   "count" and "coalesce" → support.function.cep
  from S window delay(${pause})               "delay" → keyword.other.window.cep ≠ support.function.cep
raw(text) contains_cs 'café'                  "raw" → support.function.builtin.cep ≠ support.function.cep
`select` == "double"                          "`select`" → variable.other.quoted.cep ≠ keyword.control.clause.cep
```

`test/unit/operators.test.cep`:

```
-> follow = S[a == b and c != d]              "->" → keyword.operator.arrow.cep; "=" → keyword.operator.assignment.cep; "==" and "!=" → keyword.operator.comparison.cep
risk >= 2 or risk <= 1 or a > b or a < b      ">=" "<=" ">" "<" → keyword.operator.comparison.cep
risk * 100 / 100 + 1 - 2 % 3                  "*" "/" "+" "-" "%" → keyword.operator.arithmetic.cep
param floor int = -1;                         "-" → keyword.operator.arithmetic.cep; "1" → constant.numeric.cep; ";" → punctuation.terminator.statement.cep
lead.agentId, x                               "." → punctuation.accessor.cep; "," → punctuation.separator.comma.cep
{agentId: 'a1'}                               ":" → punctuation.separator.key-value.cep
```

### 6.2 Snapshot tests: `test/fixtures/**/*.cep`

There are 19 fixtures (10 examples, 2 torture, 7 invalid), copied by `sync-upstream.mjs`. The first `npm run test:snap:update` writes a `.cep.snap` next to each. **Review every snapshot by hand** against §5.3 before committing it. Check at least:

- `torture/lexical.cep`: every string, escape, number, duration, param ref and backticked name has its §5.3 scope. `'''wire\s+transfer'''` has no escape scope.
- `torture/comments.cep`: nothing after `--` or inside `/* */` carries a non-comment scope. The CRLF lines tokenize like the LF lines. Text that looks like a comment inside a string or the triple-quoted intent is string.
- `invalid/e-kw-002-uppercase-keyword.cep`: `RULE`, `INTENT`, `FROM`, `SELECT`, `INSERT` and `INTO` carry `invalid.illegal.keyword-case.cep`.
- `invalid/e-res-001-group-by.cep`: `group` carries `invalid.illegal.reserved.cep`; `sum` carries `support.function.cep`.
- `invalid/e-str-001-newline-in-single-quoted.cep`: the last character of line 6 carries `invalid.illegal.newline.cep`.
- `invalid/e-cmt-001-unterminated-comment.cep`: lines 4–5 are `comment.block.cep` to the end of the file.
- `invalid/e-txt-001-unsuffixed-text-operator.cep`: `has` carries no keyword scope.
- `invalid/e-kw-001-*.cep`: `select` and `SeleCT` show as `entity.name.type.stream.cep`. That is the accepted limitation in §5.3, not a bug.

After the review, a snapshot changes only with a diff that has been read and explained in the commit message.

### 6.3 Checker tests: `test/checker.test.mjs` (`node:test`, no dependencies)

Each test copies the real grammar JSON into a temporary directory (`fs.mkdtempSync(path.join(os.tmpdir(), 'cep-'))`), makes one change in memory, writes it, and runs `node scripts/check-keywords.mjs --grammar <tmp> [--keywords <path>]` with `spawnSync`. It then asserts the exit status, and that the output names the word or rule involved. Test names, verbatim:

1. `passes on the real grammar and the vendored table`: status 0, output contains `115 keywords, 17 reserved, 11 categories`.
2. `fails when a keyword is in no category`: remove `ms` from `keywords-unit`. Status 1, output contains `ms`.
3. `fails when a keyword is in two categories`: add `ms` to `keywords-clause`. Status 1, output contains `ms`.
4. `fails when the reserved category differs from reservedFuture`: move `join` from `keywords-reserved` to `keywords-clause`. Status 1, output contains `join`.
5. `fails when the wrong-case list differs from keywordList`: remove `week` from `keywords-wrong-case`. Status 1, output contains `week`.
6. `fails when a keywords match is not in canonical form`: set `keywords-unit.match` to `\\b(ms|sec)\\b`. Status 1, output contains `keywords-unit`.
7. `fails when the top-level pattern order differs`: swap the first two `patterns` entries. Status 1, output contains `comments`.
8. `fails when the keyword table is missing`: `--keywords <tmp>/absent.go`. Status 1.
9. `fails when the grammar is missing`: `--grammar <tmp>/absent.json`. Status 1.
10. `fails when a category word is not in keywordList`: add `month` to `keywords-unit`. Status 1, output contains `month`. This is rule (d); `month` is SPEC §2.4's calendar trap.
11. `fails when the keyword table has no keywordList block`: a `--keywords` file without it. Status 1, output contains `keywordList`.
12. `fails when the grammar is not JSON`: a `--grammar` file holding `{`. Status 1.

Every test also asserts that the output has a line starting with `check-keywords:` (v1.1; plan check Q3). Red first: the tests run once against a stub `check-keywords.mjs` that always exits 0, and every failing test is recorded.

### 6.4 Tooling tests: `test/tools.test.mjs` (`node:test`, no dependencies) (v1.1)

Each test owns its world: a temporary directory and, where git is involved, a throwaway repo made with `git init` and an empty identity set with `-c user.name=t -c user.email=t@t`. No test reads `../cep` or writes into this repo. Each script gets a passing case and asserts its own message.

- **`sync-upstream`** (§5.5.1), against a throwaway "cep" repo that has the cep paths with a few small files:
  - a sync writes the files and `SOURCE` under `--out`;
  - an unknown `--ref` → 1;
  - a stale `.cep` already under `--out` → 1, naming it;
  - a missing invalid fixture in the source → 1, naming it;
  - a second run → the files are unchanged, byte for byte.
- **`check-upstream`** (§5.5.3): the same bytes as a `data:` URL → 0; a changed copy → 1, saying it differs; a refused connection → 1; a 404 → 1, naming the status.
- **`check-fixtures`** (§5.5.4):
  - 10 + 2 + 7 tracked pairs → 0;
  - a missing `.snap` → 1;
  - an untracked `.snap` → 1;
  - an orphan `.snap` → 1;
  - 18 fixtures → 1;
  - an extra file → 1.
- **`check-vsix`** (§5.5.5): the S4 set → 0; an empty zip, an extra file, a missing file, or a non-zip → 1, each naming the problem.
- **`check-clean`** (§5.5.6): a clean repo → 0; an untracked or a changed file → 1, naming the path.
- **`ci.yml`**: the test job's `run:` steps are exactly `npm ci` then `npm run gate`, and the `upstream` job has the schedule-or-dispatch `if:` → passes. Red first against v1's §5.6 file.

`test/toolchain.test.mjs` (built) covers `check-toolchain` (§5.5.7).

## 7. Build steps, in order

Commit after each step. Commit messages say what changed and why, with no AI attribution. The owner pushes; agents do not.

0. **Decisions.** The owner answers D1–D6 (§2); annotate §2 with the answers and the date.
1. **Scaffold.** Write `package.json` (§5.1) with `"devDependencies": {}`, `.nvmrc`, `.gitignore`, `.gitattributes`, `.vscodeignore` and `.vscode/launch.json` (§5.4). Then run `npm install --save-dev --save-exact @vscode/vsce@4.0.0 vscode-tmgrammar-test@0.1.3` (needs D2) and check that `package.json` now pins both exactly. Commit `package-lock.json`.
2. **Vendor upstream.** Write `scripts/sync-upstream.mjs` (§5.5.1) and run `node scripts/sync-upstream.mjs ../cep`. Check that `test/upstream/SOURCE` names cep `main`'s commit; at plan time that was `1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`. After committing, `git ls-files --eol test/fixtures/torture/comments.cep` must show `i/mixed` and `attr/-text`, which means the 5 CRLF line endings were kept.
3. **Tests first.**
   - Write a placeholder grammar `{ "scopeName": "source.cep", "patterns": [], "repository": {} }`.
   - Write the six unit test files (§6.1), `scripts/check-keywords.mjs` (§5.5.2) and `test/checker.test.mjs` (§6.3).
   - Run `npm run test:unit` and `npm run test:keywords`. Both must exit non-zero, and the output must show failing assertions in every unit file. Record the exit codes in the commit message.
4. **Grammar and editor config.** Write `syntaxes/cep.tmLanguage.json` (§5.3) and `language-configuration.json` (§5.2). Run `npm run test:unit`, `npm run test:keywords` and `npm run test:checker`; each must exit 0. When an assertion fails, fix the grammar, never the assertion. The one exception is an assertion whose caret column is wrong: check it by counting columns, and say so in the commit.
5. **Snapshots.** Run `npm run test:snap:update`, review all 19 snapshots per §6.2 and commit them. Then `npm test` must exit 0.
6. **Manual check.** Press F5 and open all 19 fixtures in the test window, once in the Dark Modern theme and once in Light Modern. On a sample of tokens, "Developer: Inspect Editor Tokens and Scopes" should show the §5.3 scope. Check Ctrl+/, Shift+Alt+A, and auto-closing of `(`, `[`, `{`, `'`, `"` and `` ` ``.
7. **Docs and package.**
   - Rewrite `README.md`: what the extension does, that it supports `language cep/0.1`, how to install from a `.vsix`, and the commands from `CLAUDE.md`.
   - Add `CHANGELOG.md` with `## 0.1.0`.
   - Run `npm run package`. It must produce `cep-0.1.0.vsix` with no warnings; `unzip -l cep-0.1.0.vsix` lists no `test/`, `scripts/` or `docs/` files.
   - Run `code --install-extension cep-0.1.0.vsix`, open a cep example in a normal VS Code window, and check that it is coloured and the status bar says "CEP".
8. **CI.** Write `scripts/check-upstream.mjs` (§5.5.3) and `.github/workflows/ci.yml` (§5.6). Run `node scripts/check-upstream.mjs` locally; it must exit 0. The owner pushes the branch and opens the PR, and CI must be green on both jobs.
9. **Release (owner).** Merge, tag `v0.1.0`, and create a GitHub Release with `cep-0.1.0.vsix` attached (D3).

## 8. Done when

- [ ] `npm test` exits 0 on a clean checkout after `npm ci`; the exit code was read, not assumed.
- [ ] All 19 snapshots were reviewed by hand per §6.2.
- [ ] The step 6 manual check passed in both themes.
- [ ] `cep-0.1.0.vsix` builds without warnings, contains only the extension files, and installs and colours `.cep` files.
- [ ] Both CI jobs are green on the PR.
- [ ] No commit contains AI attribution.
- [ ] The status line at the top of this file says what shipped.

## 9. Later (not v1)

- **Snippets** (if D1 is not (b)): `contributes.snippets` with one snippet per declaration and one per rule shape (plain, pattern, windowed), with clauses in the fixed order: intent, partition, body, expect/todo, select, rate, insert.
- **Language server.** Error squiggles carrying cep's E-codes, hover, go-to-definition for streams, tables and params, and formatting through cep's printer.
  - The server MUST live in the cep repo, because it needs `internal/parser`, and Go forbids importing an `internal/` package from another module. That makes it cep engine work, planned through cep's own process, for example as a `cmd/` binary that speaks LSP over stdio.
  - This repo then gains `src/extension.ts`, a build step and the `vscode-languageclient` dependency, which needs owner approval. The TextMate grammar stays for fast colouring.
- **Store publishing** (D3). The Marketplace needs a `vorsar` publisher and a `VSCE_PAT` secret for `vsce publish`. Open VSX needs the `vorsar` namespace and an `OVSX_PAT` secret for `npx ovsx publish`, which is another dependency.
