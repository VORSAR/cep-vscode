# Plan: CEP syntax highlighting for VS Code

**Status (2026-11-09):** **v0.0.1 is released**, cut by CI from tag `v0.0.1` ([release](https://github.com/VORSAR/cep-vscode/releases/tag/v0.0.1)). It ships the design-reviewed reference grammar. Delivery is incremental, as a release ladder (§7.0). S1 passed G1; its lanes A (tooling) and B (grammar) are building v0.1.0. Next: combine the lanes onto `main`'s v0.0.1, restore the full S2 scripts block, review the snapshots, run the gate, and open the v0.1.0 PR.

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
| `internal/parser/lexer.go` (the `rules` table) | Every token class and its exact regex; §5.3 mirrors it. Vendored as `test/upstream/lexer.go` and watched by the scheduled job (owner, G1-4) |
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
│   │   ├── lexer.go                 # byte copy of cep's internal/parser/lexer.go (G1-4)
│   │   └── SOURCE                   # "VORSAR/cep <sha> <date>" of the copy
│   ├── unit/*.test.cep              # §6.1, 7 files (the six of v1, plus counter.test.cep)
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

*v2 (2026-11-09, G1). This version places every finding of the S1 design review. The reviews are the [breaker](reviews/s1-design-breaker.md), [QA testability](reviews/s1-design-qa.md) and [architecture](reviews/s1-design-architecture.md); the S1 record's Findings table maps each one to where it went. It also applies the owner's G1 decisions G1-1 to G1-8. §5.1 and §5.4 describe the built scaffold. (v1.1, 2026-11-08, applied the G0 answers and added the tooling specs.)*

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

### 5.3 `syntaxes/cep.tmLanguage.json` (v2)

*v2 (2026-11-09, G1). The structure is the owner's G1-1, (c): PLAN v1's skeleton, keyword keys, `(?i)` wrong-case rule and checker model, plus these changes from the design panel:*
- *ASCII word edges and an unscoped identifier rule;*
- *bounded declaration regions that can cross lines;*
- *declared names that exclude keywords;*
- *E-STR-001 as a one-line match that marks the whole unclosed string (G1-2);*
- *word operators that also carry `keyword.operator.wordlike.cep` (G1-3).*

*The reference build is the architect's candidate, which equals the blind breaker's grammar on all 42 plan-check counter-examples and passes §6.1's verbatim `literals.test.cep` ([architecture review](reviews/s1-design-architecture.md)). The grammar is hand-written; there is no build step.*

**How TextMate picks a rule.** At each position it tries every pattern in the current list. The match that **starts earliest** wins; on a tie, the pattern **listed first** wins. A begin/end region with `applyEndPatternLast` tries its inner patterns before its end. Every ordering rule below follows from that.

**Notation.** The regexes below are written plain. When writing the JSON, escape every backslash, so `\$` becomes `"\\$"`. Five names stand for exact text:
- `L` = `(?<![A-Za-z_])`: a word starts here.
- `R` = `(?![A-Za-z0-9_])`: a word ends here. These are cep's ASCII edges. Oniguruma's `\b` counts non-ASCII letters, which cep's identifiers exclude.
- `WORDS` = the 115 words of `keywordList`, in `keywords.go` order, joined by `|`. This is the paste list below.
- `NAME` = `(?!(?i:WORDS)R)[A-Za-z_][A-Za-z0-9_]*`: a plain name that is not a reserved word in any case. It is grammar.lark's own NAME exclusion.
- `BT` = `` `[A-Za-z0-9_\-. ]*` ``: a backticked name, exactly as `lexer.go` defines it.

**Skeleton.** The top-level `patterns` MUST be exactly this list, in this order. `check-keywords.mjs` enforces it (rule g).

```
comments, strings, param-ref, backticked, declarations, annotation, number,
keywords-declaration, keywords-type, keywords-modifier, keywords-clause, keywords-window, keywords-unit,
keywords-logical, keywords-constant, keywords-builtin, keywords-text, keywords-reserved, keywords-wrong-case,
function-call, identifier, operators, punctuation
```

Each entry is `{ "include": "#<key>" }`. There are 23 of them.

**Ordering rules (MUST):**

1. `comments` comes first, so `--x` is never two minus signs and `/*` is never division. `a--b` and `-->` are comments, as in cep (`lexer.go:22`).
2. Inside `strings`, each triple-quoted rule comes before its one-line rules, so `'''` never opens `''`. The unclosed one-line `match` and the closed one-line region exclude each other: the closed region's begin requires its closing quote on the line, by lookahead.
3. `param-ref` and `backticked` come before `declarations` and every keyword rule, so `${min}` and `` `from` `` are never keywords.
4. `declarations` comes before the keyword rules, because each region starts on its keyword and must win the tie.
5. Every exact-case `keywords-*` rule comes before `keywords-wrong-case`, so only spellings that are not all-lowercase are errors.
6. Every `keywords-*` rule comes before `function-call`. So `sort(`, `cron(`, `delay(`, `batch(`, `raw(`, `min(` and `has_any_ci(` keep their keyword class.
7. `function-call` comes before `identifier`, which it ties with on the name.
8. `identifier` comes after every keyword rule and consumes whole names, so no keyword, unit or number matches inside one (`ts_min`, `x1min`, `intake`, `select_`).
9. Inside `operators`, `->` comes before `-`, and the two-character comparisons before `=`, `<` and `>`.

**The rules.**

```
comments
  line            match  (--).*$          name comment.line.double-dash.cep   cap 1 punctuation.definition.comment.cep
  block           begin  /\*  end  \*/    name comment.block.cep              begin/end cap 0 punctuation.definition.comment.cep
                  no inner patterns: block comments do not nest; an unclosed one runs to end of file, as cep's BadComment

strings           (rules in this order)
  triple-single   begin '''  end '''      name string.quoted.triple.single.cep   no inner patterns (raw)
  triple-double   begin """  end """      name string.quoted.triple.double.cep   no inner patterns (raw)
  single-unclosed match ((')(?:[^'\\\n]|\\.)*\\?)$
                  name string.quoted.single.cep
                  cap 1 invalid.illegal.newline.cep (E-STR-001: the whole unclosed string, G1-2)
                  cap 2 punctuation.definition.string.begin.cep
  single          begin '(?=(?:[^'\\\n]|\\.)*')   end '
                  name string.quoted.single.cep   begin cap 0 …string.begin.cep, end cap 0 …string.end.cep
                  patterns: include #string-escapes
  double-unclosed, double: as the two rules above, with " in place of '   name string.quoted.double.cep

string-escapes    (rules in this order)
  valid           match \\(?:[\\'"ntr]|u[0-9A-Fa-f]{4})   name constant.character.escape.cep
  invalid         match \\(?:u[0-9A-Fa-f]{0,3}|.)          name invalid.illegal.escape.cep   (E-STR-002;
                  a \u with fewer than four hex digits is one invalid escape)

param-ref         match \$\{[A-Za-z_][A-Za-z0-9_]*\}   name variable.other.constant.param.cep
backticked        match BT                             name variable.other.quoted.cep

declarations      bounded regions, each: begin L(<kw>)R, applyEndPatternLast true, patterns [include #comments]
  language        begin cap 1 storage.type.declaration.cep
                  end ([a-z][a-z0-9_]*/[0-9]+\.[0-9]+)|(?=\S)        end cap 1 constant.other.version.cep
  stream          begin cap 1 storage.type.declaration.cep
                  end (NAME)|(BT)|(?=\S)                             end cap 1 and 2 entity.name.type.stream.cep
  table           as stream                                          end cap 1 and 2 entity.name.type.table.cep
  rule            as stream                                          end cap 1 and 2 entity.name.function.rule.cep
  param           as stream                                          end cap 1 and 2 variable.other.constant.param.cep
  into            begin cap 1 keyword.control.clause.cep
                  end (NAME)|(BT)|(?=\S)                             end cap 1 and 2 entity.name.type.stream.cep (the insert target)
  given           begin cap 1 keyword.control.clause.cep   end (?=\S)
                  patterns [include #comments, match L(table)R name storage.type.declaration.cep]
                  so the name after "given table" is a plain reference, never a declaration

annotation        begin @ (cap 0 punctuation.definition.annotation.cep)
                  end ([A-Za-z_][A-Za-z0-9_]*)|(?=\S)   end cap 1 storage.type.annotation.cep
                  applyEndPatternLast true, patterns [include #comments]

number            match (?<![A-Za-z0-9_])[0-9]+(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?   name constant.numeric.cep
                  (cep's Number pattern with a leading edge only, so 5min is a number and a unit, as cep lexes it)

function-call     (rules in this order)
  namespaced      match (?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*(:)\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()
                  cap 1 entity.name.namespace.cep, cap 2 punctuation.separator.namespace.cep, cap 3 support.function.cep
  plain           match (?<![A-Za-z0-9_])([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()         cap 1 support.function.cep

identifier        match [A-Za-z_][A-Za-z0-9_]*   (no name: a plain reference, field or capture)

operators         (rules in this order)
  arrow           match ->                  name keyword.operator.arrow.cep
  comparison      match ==|!=|>=|<=|>|<     name keyword.operator.comparison.cep
  assignment      match =                   name keyword.operator.assignment.cep
  arithmetic      match [+\-*/%]            name keyword.operator.arithmetic.cep

punctuation
  match ;   name punctuation.terminator.statement.cep
  match ,   name punctuation.separator.comma.cep
  match \.  name punctuation.accessor.cep
  match :   name punctuation.separator.key-value.cep
```

**Keyword rules.**
- Each `keywords-<category>` entry is a single `{ "name": <scope>, "match": "L(?:w1|w2|…)R" }`: exactly `(?<![A-Za-z_])(?:` + the words + `)(?![A-Za-z0-9_])`.
- The words are in `keywords.go` order, and each of the 115 words of `keywordList` sits in exactly one category.
- `check-keywords.mjs` parses these forms (§5.5.2).
- The logical and text words also carry `keyword.operator.wordlike.cep` (owner, G1-3). The default themes colour that scope like keywords: `#569CD6` in Dark 2026 and Dark Modern, `#0000FF` in Light 2026 and Light Modern (measured with VS Code 1.145.2's own engine). Without it the word operators get the plain-text colour.

| Repository key | Scope (`name`) | Words |
|---|---|---|
| `keywords-declaration` | `storage.type.declaration.cep` | language param stream table rule |
| `keywords-type` | `storage.type.primitive.cep` | string int float bool timestamp duration object |
| `keywords-modifier` | `storage.modifier.cep` | optional primary key |
| `keywords-clause` | `keyword.control.clause.cep` | intent partition by of ttl from every once within for after match skip past last late events drop allow select as output first insert into window emit on close change due end time arrival watermark bounded ascending idle expect given then todo asc desc |
| `keywords-window` | `keyword.other.window.cep` | sort cron delay batch |
| `keywords-unit` | `keyword.other.unit.cep` | ms sec min hour day week |
| `keywords-logical` | `keyword.operator.logical.cep keyword.operator.wordlike.cep` | and or not in is |
| `keywords-constant` | `constant.language.cep` | true false null |
| `keywords-builtin` | `support.function.builtin.cep` | raw |
| `keywords-text` | `keyword.operator.text.cep keyword.operator.wordlike.cep` | has_ci has_cs contains_ci contains_cs starts_with_ci starts_with_cs ends_with_ci ends_with_cs has_any_ci has_any_cs has_all_ci has_all_cs contains_any_ci contains_any_cs contains_all_ci contains_all_cs matches_ci matches_cs contains_match_ci contains_match_cs |
| `keywords-reserved` | `invalid.illegal.reserved.cep` | group having order limit offset join trigger aggregation sequence session tumbling hopping sliding processing route to punctuated |

The counts are 5 + 7 + 3 + 44 + 4 + 6 + 5 + 3 + 1 + 20 + 17 = 115. `keywords-reserved` MUST equal `reservedFuture` exactly (E-RES-001). The breaker re-derived this table blind from grammar.lark and SPEC and reached the same 11 classes ([breaker review](reviews/s1-design-breaker.md)).

`keywords-wrong-case` is `{ "name": "invalid.illegal.keyword-case.cep", "match": "(?i)L(?:WORDS)R" }`. Ordering rule 5 means it only ever matches spellings that are not all-lowercase. That covers E-KW-002 (`FROM`) and the case half of E-KW-001 (`SeleCT` used as a name). `WORDS` appears six times in all: once here, and once in each of the five name exclusions (stream, table, rule, param, into). `check-keywords.mjs` checks every copy (rule h). The 115 words in `keywords.go` order, ready to paste:

```
language|param|stream|table|rule|intent|partition|by|of|ttl|from|every|once|within|for|after|match|skip|past|last|late|events|drop|allow|route|to|select|as|output|first|insert|into|window|sort|cron|delay|batch|emit|on|close|change|due|end|time|arrival|watermark|bounded|ascending|punctuated|idle|primary|key|optional|expect|given|then|todo|and|or|not|in|is|null|true|false|raw|timestamp|string|int|float|bool|duration|object|asc|desc|ms|sec|min|hour|day|week|has_ci|has_cs|contains_ci|contains_cs|starts_with_ci|starts_with_cs|ends_with_ci|ends_with_cs|has_any_ci|has_any_cs|has_all_ci|has_all_cs|contains_any_ci|contains_any_cs|contains_all_ci|contains_all_cs|matches_ci|matches_cs|contains_match_ci|contains_match_cs|group|having|order|limit|offset|join|trigger|aggregation|sequence|session|tumbling|hopping|sliding|processing
```

**Choices settled in v2** (each follows cep, or keeps v1.1):
- A backticked declared name takes the declared-name scope, as v1.1's verbatim test asserts (breaker D6).
- An annotation name is any name; `@select` is input cep rejects (D12).
- `null` is a constant (D1).
- `batch` is a window keyword everywhere, `emit on batch end` included (D2).
- `asc` and `desc` are clause words (D3).
- `timestamp` is a type both in a schema and before a literal (D4).
- `raw` keeps the builtin scope with or without `(` (D14).

**Known limitations (accepted for v2; a TextMate grammar matches patterns, it does not parse):**

1. An unclosed `'''` or `"""` colours the rest of the file as a raw string, and `''''` opens one. cep sees two empty strings, or an unclosed `'`. A begin rule cannot look past its line.
2. cep's lexer reads `risk/2.5` (no spaces) as a version-pragma token and refuses the rule (F1, forwarded to cep). The grammar shows a division. After `LANGUAGE` (not lowercase), `cep/0.1` gets no version scope.
3. After a character cep refuses at the lexer, the grammar carries on with no mark on that character. Examples: a stray `#`, a `$` without `{`, a non-ASCII letter outside a string. A stray backtick pairs with the next one on its line.
4. An unclosed `/*` shows as a comment to the end of the file, which is how cep lexes it. Nothing marks it as E-CMT-001.
5. Parse and static errors get no mark. This covers E-KW-001 for a lowercase keyword in a slot that is not a declaration (a column named `key`), E-TXT-001 (`has`), E-SYN-*, and the rest. That needs the language server (§9).
6. A call is recognised only with its `(` on the same line as its name. A namespaced call written with backticks (`` `math`:`round`( ``) is not shown as a call.
7. Function names are not checked against cep's catalogue: any name before `(` that is not a keyword is `support.function.cep`.
8. Escapes inside an unclosed one-line string are not coloured: the whole string is the error.
9. References are plain identifiers: stream and table names after `from`, `of`, `in` and `given table`, step aliases, `lead.agentId`. Annotation keys and record field names are plain too.
10. While typing, a `given table` with no name yet, a blank line, and then a `table K (` declaration gives `K` the function scope (architecture D-A20). It clears once the name is written.
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
.DS_Store
```

(`.DS_Store` added in v2: a Finder file in a fixture folder would otherwise turn `check-fixtures` and `check-clean` red; architecture D-A11.)

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

### 5.5 Scripts (v2)

All scripts are ES modules run with `node`, and they use only Node built-ins (`node:fs`, `node:path`, `node:child_process`, `node:process`, `node:zlib`, global `fetch`).
- Subprocesses use `execFileSync` with an argument array, never a shell string. A `git` format such as `--format=%H %cs` is one array element.
- The exit code is 0 for a pass and 1 for any failure. A missing or unparsable input is a failure, never a pass. So is a failed subprocess: a `git` exit code other than 0 is a failure even when its stdout is empty.
- Every message starts with the script's name, for example `check-keywords: …`. A failure message also names the input or the item at fault.
- Every default path resolves from the script's own location (`import.meta.dirname`), not the current directory, so a script behaves the same from any worktree.
- Each script's tests (§6.3, §6.4) assert its message, not just its exit code, because Node itself exits 1 for a missing script. Each script also has a passing case.

#### 5.5.1 `scripts/sync-upstream.mjs <path-to-cep-clone> [--ref <git-ref>] [--out <dir>] [--check]`

The script reads files from a git ref, `main` by default, through git's object store. It never reads or changes the cep working tree, so it works whatever branch the cep clone has checked out (the owner's clone is usually on a sprint branch). Run `git -C <cep> fetch origin` first and pass `--ref origin/main` to sync with the remote's `main`.

1. Fail if no path is given, or if `git -C <cep> rev-parse --verify <ref>^{commit}` fails.
2. Read each file with `git -C <cep> cat-file blob <ref>:<path>` through `execFileSync(…, { encoding: 'buffer' })`. That gives raw bytes, with no line-ending conversion. Write each Buffer as it is under `--out` (default: the repo root), creating directories as needed. The files:
   - `internal/parser/keywords.go` → `test/upstream/keywords.go`;
   - `internal/parser/lexer.go` → `test/upstream/lexer.go` (owner, G1-4);
   - every `*.cep` that `git -C <cep> ls-tree --name-only <ref> docs/language/examples/` lists → `test/fixtures/examples/`;
   - every `*.cep` that `ls-tree` lists for `docs/language/examples/torture/` → `test/fixtures/torture/`;
   - these seven under `docs/language/invalid/` → `test/fixtures/invalid/`: `e-cmt-001-unterminated-comment.cep`, `e-kw-001-keyword-as-identifier.cep`, `e-kw-001-mixedcase-identifier.cep`, `e-kw-002-uppercase-keyword.cep`, `e-res-001-group-by.cep`, `e-str-001-newline-in-single-quoted.cep`, `e-txt-001-unsuffixed-text-operator.cep`. A missing one is a failure, naming it.

   `ls-tree` prints full paths and lists the `torture` folder as an entry of its own. Keep only names ending in `.cep`, and write each under its basename.
3. Write `test/upstream/SOURCE` as exactly `VORSAR/cep <sha> <date>` and one LF, from `git -C <cep> log -1 --format=%H %cs <ref>`.
4. Never delete anything: the `.cep.snap` files live next to the fixtures. List every `.cep` under `<out>/test/fixtures/` that was not in this copy set, and exit 1 if there are any, so a person removes the stale fixture and its snapshot.
5. Print each file written that changed, then the line `next: npm test, then review every snapshot diff`.
6. **`--check`** writes nothing. It compares each of the 21 targets (19 fixtures, `keywords.go`, `lexer.go`), and `SOURCE`, with what step 2 would write. It exits 1, naming each file that differs or is missing; otherwise it prints `sync-upstream: ok (21 files match <sha>)`. This is the byte proof for the vendored files (plan check card line 4).

In S1 the sync runs pinned to the sprint's target: `node scripts/sync-upstream.mjs <absolute path of the cep clone> --ref 1fa3a5bb9d3bbabfe0c26ca3daa62086c8093c49`.

#### 5.5.2 `scripts/check-keywords.mjs [--grammar <path>] [--keywords <path>]`

The defaults are `syntaxes/cep.tmLanguage.json` and `test/upstream/keywords.go`.

1. Read the keyword file.
   - Take `keywordList` as every `"…"` string between the line containing `keywordList = []string{` and the next line that is exactly `}`.
   - Take `reservedFuture` as every `"…"` key between `reservedFuture = map[string]bool{` and the next line that is exactly `}`.
   - If either block is missing or empty, print one line naming it and stop with exit 1.
2. Read the grammar JSON, then parse three kinds of word list:
   - **Category lists.** For every `repository` key starting with `keywords-` other than `keywords-wrong-case`, parse its `match` against `^\(\?<!\[A-Za-z_\]\)\(\?:([a-z_|]+)\)\(\?!\[A-Za-z0-9_\]\)$` and split group 1 on `|`.
   - **The wrong-case list.** For `keywords-wrong-case`, parse its `match` against the same pattern, with `\(\?i\)` in front.
   - **The name exclusions.** For every `end` in `repository.declarations.patterns` that contains `(?!(?i:`, take the list from `\(\?!\(\?i:([a-z_|]+)\)\(\?!\[A-Za-z0-9_\]\)\)`.
3. Fail with one line per problem if:
   - (a) a `keywords-*` match is not in its canonical form;
   - (b) a word is in two categories;
   - (c) a `keywordList` word is in no category;
   - (d) a category word is not in `keywordList`;
   - (e) the set of `keywords-reserved` words differs from `reservedFuture`;
   - (f) the `keywords-wrong-case` list differs from `keywordList`;
   - (g) the top-level `patterns` list differs from §5.3's 23-entry skeleton, which the script holds as a constant;
   - (h) there are not exactly 5 name exclusions, or one of them differs from `keywordList`;
   - (i) any word list (a category, the wrong-case list or an exclusion) is not in `keywordList` order.
4. On a pass, print `check-keywords: ok (<n> keywords, <m> reserved, <k> categories, <e> name exclusions)`. At the pinned commit that is `115 keywords, 17 reserved, 11 categories, 5 name exclusions`.

#### 5.5.3 `scripts/check-upstream.mjs [--url-keywords <url>] [--url-lexer <url>] [--local <dir>]` (CI's scheduled job)

1. Fetch both files with `fetch` and `AbortSignal.timeout(30000)`. The defaults are `https://raw.githubusercontent.com/VORSAR/cep/main/internal/parser/keywords.go` and the same path ending in `lexer.go` (owner, G1-4).
2. A network error or a non-200 status is a failure: `check-upstream: could not fetch <url>: <reason or status>`.
3. Compare each fetched file's bytes with the same file in `--local` (default `test/upstream/`), and read `SOURCE` there. A missing local file or a missing `SOURCE` is a failure, naming the path.
   - If both are equal, exit 0 with `check-upstream: ok (keywords.go and lexer.go match <SOURCE line>)`.
   - Otherwise exit 1 with one line per differing file: `check-upstream: cep main's <file> differs from test/upstream (synced at <SOURCE line>); run sync-upstream, update the grammar, review the snapshots`.

The tests use three seams, since Node's `fetch` cannot read `file:` URLs:
- `data:` URLs for the same bytes, for a changed copy, and for the same bytes plus a final newline;
- a port with nothing listening, for a refused connection;
- a `node:http` server on `127.0.0.1` that answers 404.

This script is not part of `npm test`, so local runs stay offline and deterministic.

#### 5.5.4 `scripts/check-fixtures.mjs [--root <dir>]`

This is the guard that `test:snap` lacks: the snapshot tool writes a missing snapshot and passes.

1. `--root` defaults to the repo root. A `git` failure there (not a repository) is a failure.
2. **Candidates.** List the candidate files with `git -C <root> ls-files --cached --others --exclude-standard -- test/fixtures`. Ignored files, such as a `.DS_Store`, are skipped. A candidate counts as present only if it also exists on disk, because `git ls-files` still lists a tracked file that was deleted.
3. **Tracked** means listed by `git -C <root> ls-files --cached -- test/fixtures` (staged or committed).
4. Fail, with one line per problem, if:
   - (a) the present `.cep` files are not exactly 10 in `examples/`, 2 in `torture/` and 7 in `invalid/`. The counts are per folder and are constants in the script; a total of 19 is not enough.
   - (b) a `.cep` has no `<name>.cep.snap` beside it that is both present and tracked;
   - (c) a `.cep.snap` has no `.cep` beside it;
   - (d) any other present file is there.
5. On a pass, print `check-fixtures: ok (19 fixtures, 19 tracked snapshots)`.

#### 5.5.5 `scripts/check-vsix.mjs [<file.vsix>] [--root <dir>]`

1. **Which file.** With no file, check `cep-<version>.vsix` in `--root` (default: the repo root), with `version` read from that root's `package.json`. A stale package from an older version is then never checked by mistake. `npm run test:vsix` runs it with no argument.
2. **Read it.** Read the file with `node:fs`. Find the zip's end-of-central-directory record, signature `0x06054b50`, searching back from the end over at most 65,557 bytes; that also covers a zip with an archive comment. Then read every central-directory entry, signature `0x02014b50`, and collect the file names. A missing file, or a file that is not a zip, is a failure, naming the path.
3. **Compare.** Compare the names, as a set, with the 8 of the S1 plan check's S4 (a constant):

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
4. On a pass, print `check-vsix: ok (8 files)`.

#### 5.5.6 `scripts/check-clean.mjs [--root <dir>]`

Run `git -C <root> status --porcelain --untracked-files=all`. A `git` failure is a failure: outside a repository `git` exits 128 with an empty stdout, which must not read as "clean". Any output is a failure, and the message lists each path. Ignored files (`node_modules/`, `*.vsix`, `.DS_Store`) are not listed. This is how `npm run gate` catches a snapshot or any other file written during the run. On a pass, print `check-clean: ok`.

#### 5.5.7 `scripts/check-toolchain.mjs [--nvmrc <path>] [--node <version>]`

Built in the scaffold. It fails unless the running Node (or `--node`) equals the exact `x.y.z` in `.nvmrc`, accepting a leading `v` in either. A missing, unreadable or inexact `.nvmrc` is a failure. On a pass it prints `check-toolchain: ok (node <version>)`. Its tests are `test/toolchain.test.mjs`. It does not check npm: the exact Node pin fixes npm's version through setup-node (architecture review, A17).

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

#### 5.6.1 `.github/workflows/release.yml` and `scripts/check-release.mjs` (owner, 2026-11-09: CI cuts the releases)

**Why a separate workflow.** CI cuts each release when the owner pushes a `v*` tag. The owner still decides when; agents never tag. This is its own workflow, so `ci.yml` and its test stay as they are, and the write permission lives only here.

```yaml
name: release
on:
  push:
    tags: ["v*"]
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Run every step except creating the release"
        type: boolean
        default: true
permissions:
  contents: read
jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1  # v7.1.0
        with:
          node-version-file: .nvmrc
      - run: npm ci
      - run: npm run gate
      - run: node scripts/check-release.mjs --ref "$GITHUB_REF_NAME" --ref-type "$GITHUB_REF_TYPE" --notes release-notes.md
      - if: github.event_name == 'push'
        run: gh release create "$GITHUB_REF_NAME" "cep-${GITHUB_REF_NAME#v}.vsix" --verify-tag --title "$GITHUB_REF_NAME" --notes-file release-notes.md
        env:
          GH_TOKEN: ${{ github.token }}
```

**How it is used.**
- It adds no action or dependency: `gh` is on GitHub's runners, and the two action SHAs are `ci.yml`'s.
- `workflow_dispatch` lets the owner run it once by hand, as a dry run, after the PR that adds it is merged and before the first tag. That follows cep's rule that a new workflow runs once by hand: a tag-only workflow cannot run on the PR.

**`scripts/check-release.mjs --ref <ref> --ref-type <tag|branch> [--notes <path>] [--root <dir>]`:**
1. On a tag push the ref is the tag, so it must be exactly `v` + `package.json`'s `version`; otherwise fail, naming both. On a dispatch the ref is a branch, so it checks that the branch is `main` and uses `package.json`'s version.
2. `CHANGELOG.md` must have a `## <version>` section; otherwise fail, naming the version.
3. Write that section's body to `--notes`. Check that `cep-<version>.vsix` exists in the root.
4. On a pass, print `check-release: ok (v<version>, notes <n> lines)`.

It uses Node built-ins only, like every script in §5.5.

**Tests** (in `test/release.test.mjs`, a file of their own, so they never collide with lane A's `test/tools.test.mjs`):
- `check-release` on a temp root:
  - a matching tag → 0, and writes the notes;
  - a tag that does not match the version → 1;
  - a missing CHANGELOG section → 1;
  - a missing `.vsix` → 1;
  - a dispatch from a branch other than `main` → 1.
- `release.yml` read with the same line reader as `ci.yml`. Its triggers must be `push: tags v*` and `workflow_dispatch`. Top-level permissions must be `contents: read`, and `contents: write` only on the release job. Its `run:` steps must be `npm ci`, `npm run gate`, the `check-release` line, then the `gh release create` line guarded by `github.event_name == 'push'`.
- Red first against a copy without the guard and a copy with top-level `contents: write`.

**Release notes come from `CHANGELOG.md`.** So each rung of the ladder (§7.0) adds a `## <version>` section, and bumps `package.json`'s version in the same PR.

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

**v2 additions (2026-11-09).** QA's design review ran 271 mutant grammars against the v1.1 tests. 31 survived every layer, and 37 more were caught only by a snapshot, which cannot show its own grammar wrong ([QA review](reviews/s1-design-qa.md)). v2 adds the lines below so that each grammar rule has a unit assertion that goes red when the rule is wrong.

**Format notes added in v2.**
- A token at column 1 cannot take `^` either, because `--` covers columns 0–1. Assert it with `<~-…`: each `~` skips one column from column 0, and each `-` covers one character. For example, `-- <~----- storage.type.annotation.cep` covers columns 1–5. Where a fragment allows it, prefix the source line with `x ` to move the key token off columns 0–1.
- **Expected values come from cep, not from a grammar.** Derive each expected scope from cep's lexer tokens (`lexer.go`), the keyword table and the decisions in §5.3 v2. Never copy it from any grammar's output, including the breaker's `expected.md` (architecture D-A10).
- **Check escape bytes.** After writing a file that holds a backslash-u escape, check its bytes with `grep`. Such escapes have arrived decoded through tool input in this sprint.

**Additions to the five files.** Each line is a source line, then its tokens and their scopes; `≠` means the scope must be absent.

`test/unit/keywords.test.cep` (D-Q1, D-Q6, G1-3):
- **Every word of every category,** each asserted with its category scope. Write the lines from the §5.3 table, by script or by hand, with these placements:
  - the declaration words as `language; param; stream; table; rule;`, so no word is followed by a name that a declaration region would capture;
  - the clause line broken after `insert`, so `insert` and `into window` are separate;
  - `raw` as `x raw y`.

  With this, no word can move to another category and keep every test green.
- **The wordlike scope:** each logical and text word also asserts `keyword.operator.wordlike.cep`.
- **Calls, not keywords:** `x int_value(a) intake(b) has_ci_flag(c) fromage(d)` → each name is `support.function.cep`. This is the positive form of the "no keyword inside a name" rule.
- `2min 5 min 1hour` → `2`, `5` and `1` are `constant.numeric.cep`; `min`, `min` and `hour` are `keyword.other.unit.cep` (P2, as cep lexes it).
- `x1min ab2sec` → each a single plain name: `≠ keyword.other.unit.cep` and `≠ constant.numeric.cep`.

`test/unit/strings.test.cep` (D-Q2, D-Q4, G1-2):
- `x '\n\t\r' "\n\t\r"` → each of the 6 escapes is `constant.character.escape.cep`.
- `x '\0 \$ \a'` → `\0`, `\$` and `\a` are `invalid.illegal.escape.cep`.
- `x """raw \n stays"""` → `\n` is `string.quoted.triple.double.cep ≠ constant.character.escape.cep`.
- `x 'read'` → the column-2 quote is `punctuation.definition.string.begin.cep` and the column-7 quote is `punctuation.definition.string.end.cep`.
- `  intent 'this intent` → the whole of `'this intent`, from the quote to the end of the line, is `invalid.illegal.newline.cep`, and the quote is also `punctuation.definition.string.begin.cep` (G1-2). The next source line, `y 'z'`, has a closed string.

`test/unit/comments.test.cep` (D-Q4):
- `x /* inline */ y` → `/*` and `*/` are `punctuation.definition.comment.cep`.

`test/unit/names.test.cep` (D-Q3, D-Q4, D-Q11, D-Q17, architecture D-A1, D-A3, D-A4):
- **Backticked names and declarations on one line:**
  - `` x `agent events` `` → `variable.other.quoted.cep`;
  - `` insert into `agent-events`; `` → `` `agent-events` `` is `entity.name.type.stream.cep`;
  - `table Blocked (a string)` → `table` is `storage.type.declaration.cep`;
  - `rule LexicalTorture` → `rule` is `storage.type.declaration.cep`;
  - `stream  Foo (a string)` (two spaces) → `Foo` is `entity.name.type.stream.cep`;
  - `select upstream as u` → `as` is `keyword.control.clause.cep`.
- **Declarations split across lines or comments** (each valid cep):
  - `stream`, then `U (a string)` on the next line → `U` is `entity.name.type.stream.cep`;
  - `stream /* c */ U (a string)` → likewise;
  - `rule`, then `R` → `entity.name.function.rule.cep`;
  - `param`, then `grace duration = 1 min;` → `grace` is `variable.other.constant.param.cep`;
  - `insert`, then `into T;` → `into` is a clause, and `T` is `entity.name.type.stream.cep`;
  - `language`, then `cep/0.1;` → `cep/0.1` is `constant.other.version.cep`;
  - `@ sink(type = 'log')` → `@` is `punctuation.definition.annotation.cep`, and `sink` is `storage.type.annotation.cep`.
- **Names that are keywords** (E-KW-001):
  - `stream events (a string)` → `events` is `keyword.control.clause.cep ≠ entity.name.type.stream.cep`;
  - `stream SeleCT (a string)` → `SeleCT` is `invalid.illegal.keyword-case.cep`.
- **`given table`:**
  - `  expect given table T [ {a: 1} ]` → `given` is a clause, `table` is `storage.type.declaration.cep`, and `T` is `≠ entity.name.type.table.cep`;
  - `given`, then `table T` on the next line → likewise.
- **Calls and punctuation:**
  - in `math:round(x)`, `:` is `punctuation.separator.namespace.cep`;
  - `math : round (x)` → a namespaced call;
  - `x {agentId:lead}` → `agentId` is `≠ entity.name.namespace.cep`, and `:` is `punctuation.separator.key-value.cep`;
  - `  from S window cron('0 0 * * *', 'UTC')` → `cron` is `keyword.other.window.cep ≠ support.function.cep`;
  - `  from S window batch()` → `batch` likewise;
  - `  where text has_any_ci(${t})` → `has_any_ci` is `keyword.operator.text.cep ≠ support.function.cep`;
  - `select count (x)` → `count` is `support.function.cep`.
- **Input cep rejects:**
  - `x ${ grace }` → `${` is `≠ variable.other.constant.param.cep`;
  - `` x `a/b` `` → the backtick is `≠ variable.other.quoted.cep`.

**A seventh file, `test/unit/counter.test.cep`,** holds the S1 plan check's §6 items 1–39, written as answered at G1:
- **Item 5:** the mark covers the whole unclosed string.
- **Item 15** (`2min`), **item 36** (a declaration split over two lines) and the split-pragma half of **item 39:** coloured as cep lexes them.
- **Item 37** (`given table T`): `T` is plain.
- **The `''''` half of item 39:** pinned as known limitation 1.
- **Item 24**, an unclosed block comment, is the file's last source line.

**Red first, for the unit layer.**
1. Every unit file runs against the placeholder grammar and shows failures. Record each file's count of failing assertions.
2. The assertions that require a scope to be absent cannot go red on the placeholder. So each one is also run once against the named mutant that breaks it, and the assertions that turned red are recorded:
   - block comment `end` = `$` → `y`;
   - one-line strings include `#comments` → `--` in a string;
   - the block comment includes `#strings` → `'quote'`;
   - the triple-quoted strings include `#string-escapes` → `\n`;
   - the trailing edge `R` dropped from `keywords-unit` and `keywords-wrong-case`, with `identifier` removed → `ts_min`, `x1min`, `SELECTED`;
   - `function-call` moved before the keyword rules → `key (`, `delay(`, `raw(`;
   - `backticked` removed → `` `select` ``;
   - `given`'s inner `table` rule removed → `T` in `given table T`.

### 6.2 Snapshot tests: `test/fixtures/**/*.cep` (v2)

There are 19 fixtures (10 examples, 2 torture, 7 invalid), copied by `sync-upstream.mjs`. The first `npm run test:snap:update` writes a `.cep.snap` next to each. `check-fixtures.mjs` (§5.5.4) then requires each snapshot to be present and tracked, so `test:snap` can never pass by writing one. **Review every snapshot by hand** against §5.3 v2 before committing it. Check at least:

- **`torture/lexical.cep`:**
  - every string, escape, number, duration, param ref and backticked name has its §5.3 scope;
  - `'''wire\s+transfer'''` has no escape scope;
  - `` `agent-events` `` where it is declared has the stream-name scope.
- **`torture/comments.cep`:**
  - nothing after `--` or inside `/* */` carries a non-comment scope;
  - text that looks like a comment, inside a string or inside the triple-quoted intent, is string.
  - (Its CRLF lines tokenize like LF lines by construction, because the test tool splits on `\r\n|\n`. That is not a test; plan check card line 4, the byte check, is the CRLF proof.)
- **`examples/01-agent-kill-switch.cep` and `07-consent-gate.cep`:** `SensitiveResources` and `RegisteredApps` after `given table` carry no table-declaration scope (5 lines in all).
- **`invalid/e-kw-002-uppercase-keyword.cep`:** `RULE`, `INTENT`, `FROM`, `SELECT`, `INSERT` and `INTO` carry `invalid.illegal.keyword-case.cep`.
- **`invalid/e-res-001-group-by.cep`:** `group` carries `invalid.illegal.reserved.cep`, and `sum` carries `support.function.cep`.
- **`invalid/e-str-001-newline-in-single-quoted.cep`:**
  - on line 6, `'this intent` carries `invalid.illegal.newline.cep` from the quote to the end of the line;
  - line 7's final `'` carries it too;
  - on line 8, `from` is `keyword.control.clause.cep` and `'x'` is a closed string with begin and end punctuation.
- **`invalid/e-cmt-001-unterminated-comment.cep`:** lines 4–5 are `comment.block.cep` to the end of the file.
- **`invalid/e-txt-001-unsuffixed-text-operator.cep`:** `has` carries no keyword scope.
- **`invalid/e-kw-001-*.cep`** (v2, architecture D-A4): `select` carries `keyword.control.clause.cep`, not a stream name, and `SeleCT` carries `invalid.illegal.keyword-case.cep`.

**Red first, for the snapshot layer.** Rename `constant.numeric.cep` in the grammar. Expect `npm run test:snap` to exit 255 with all 19 fixtures failing, because every fixture has a number. Record it, then revert the rename. (Renaming a scope that no fixture uses, such as `invalid.illegal.escape.cep`, would exit 0.)

After the review, a snapshot changes only with a diff that has been read and explained in the commit message.

### 6.3 Checker tests: `test/checker.test.mjs` (`node:test`, no dependencies) (v2)

Each test copies the real grammar JSON into a temporary directory (`fs.mkdtempSync(path.join(os.tmpdir(), 'cep-'))`), makes one change in memory, writes it, and runs `node scripts/check-keywords.mjs --grammar <tmp> [--keywords <path>]` with `spawnSync`. It then asserts the exit status, that the output has a line starting with `check-keywords:`, and that the output names the word, rule or path involved. Test names, verbatim:

1. `passes on the real grammar and the vendored table`: status 0; the output contains `115 keywords, 17 reserved, 11 categories, 5 name exclusions`.
2. `fails when a keyword is in no category`: remove `ms` from `keywords-unit` → 1, naming `ms`.
3. `fails when a keyword is in two categories`: add `ms` to `keywords-clause` → 1, naming `ms`.
4. `fails when the reserved category differs from reservedFuture`: move `join` from `keywords-reserved` to `keywords-clause` → 1, naming `join`.
5. `fails when the wrong-case list differs from keywordList`: remove `week` from `keywords-wrong-case` → 1, naming `week`.
6. `fails when a keywords match uses the old word-boundary form`: set `keywords-unit.match` to `\b(?:ms|sec|min|hour|day|week)\b` → 1, naming `keywords-unit`.
7. `fails when a keywords match has no word edges`: set `keywords-unit.match` to `(?:ms|sec|min|hour|day|week)` → 1, naming `keywords-unit`.
8. `fails when the first two patterns are swapped` → 1, naming `comments`.
9. `fails when function-call moves before the keyword rules`: move `#function-call` to just before `#keywords-window` → 1, naming `function-call`.
10. `fails when a top-level entry is missing`: drop `#number` → 1, naming `number`.
11. `fails when the keyword table is missing`: `--keywords <tmp>/absent.go` → 1, naming `absent.go`.
12. `fails when the grammar is missing`: `--grammar <tmp>/absent.json` → 1, naming `absent.json`.
13. `fails when a category word is not in keywordList`: add `month` to `keywords-unit` → 1, naming `month` (rule d; `month` is SPEC §2.4's calendar trap).
14. `fails when the keyword table has no keywordList block` → 1, with exactly one `check-keywords:` line, naming `keywordList`.
15. `fails when the keyword table has no reservedFuture block` → 1, naming `reservedFuture`.
16. `fails when the grammar is not JSON`: a file holding `{` → 1, naming the grammar's path.
17. `fails when a name exclusion misses a word`: remove `week` from the `stream` region's exclusion → 1, naming `week` and `declarations` (rule h).
18. `fails when a name exclusion is missing`: remove the `rule` region's exclusion (its end becomes `([A-Za-z_][A-Za-z0-9_]*)|(BT)|(?=\S)`) → 1, saying 4 of 5 (rule h).
19. `fails when a word list is out of keywordList order`: swap `ms` and `sec` in `keywords-unit` → 1, naming `keywords-unit` (rule i).

**Red first.** This runs after the real grammar exists (PLAN §7 step 4); before that, the grammar-editing tests fail in setup.
1. Run the tests once against a stub `check-keywords.mjs` that always exits 0. Every test except 1 must fail with an assertion, not a `TypeError`.
2. Then remove each rule (a)–(i) and the empty-list stop, one at a time, and record which test goes red.

### 6.4 Tooling tests: `test/tools.test.mjs` (`node:test`, no dependencies) (v2)

**Each test owns its world.**
- A temporary directory, and where git is involved, a throwaway repo made with `git init -b main`.
- Every `git` call in a test runs with `GIT_CONFIG_GLOBAL` pointing at an empty file, `GIT_CONFIG_NOSYSTEM=1`, and `-c user.name=t -c user.email=t@t`, so the machine's own git settings (default branch, signing, hooks, autocrlf) never reach the tests.
- No test reads `../cep`, uses the network beyond `127.0.0.1`, or writes into this repo.
- Each test asserts the script's own message, as well as its exit status.

**`sync-upstream`** (§5.5.1), against a throwaway "cep" repo with the cep paths:
- **A pass:**
  - the source's `examples/` also holds a `README.md` and a `torture/` folder → exit 0; the `next:` line is printed;
  - exactly the expected `.cep` files, `keywords.go`, `lexer.go` and `SOURCE` are written under `--out`;
  - `SOURCE` is exactly `VORSAR/cep <sha> <date>` and one LF;
  - only a run like this one counts as a first run for the second-run test.
- **The ref, not the working tree** (QA D-Q5):
  - commit on `main` a `keywords.go`, a `lexer.go`, one example with CRLF line endings and no final newline, and the 7 invalid names;
  - then check out a branch `other` that changes those bytes, and leave one more uncommitted edit;
  - run with `--ref main` → exit 0, and every written file is byte-equal to `git cat-file blob main:<path>`.
- **The default ref:** one test on a `-b main` repo omits `--ref` and expects `main`'s bytes.
- **A second run** after a passing first run → every file is unchanged, byte for byte.
- **Failures:**
  - no path → 1;
  - an unknown `--ref` → 1, naming it;
  - a missing invalid fixture in the source → 1, naming it.
- **A stale fixture:** a stale `.cep` already under `--out` → 1, naming it. The stale `.cep`, and a `.cep.snap` beside a current fixture, are still on disk afterwards.
- **`--check`:** after a sync → 0, with the `21 files match` line; after one byte is flipped in a written file → 1, naming it; nothing is written in either run.

**`check-upstream`** (§5.5.3):
- both files the same, as `data:` URLs → 0;
- a changed `keywords.go` → 1, naming `keywords.go`;
- a changed `lexer.go` → 1, naming `lexer.go`;
- the same bytes plus a final newline → 1;
- a refused connection → 1;
- a 404 from a local `node:http` server → 1, naming the status;
- a missing local file or `SOURCE` → 1, naming it.

**`check-fixtures`** (§5.5.4):
- 10 + 2 + 7 tracked pairs → 0;
- a committed `.cep.snap` removed with a plain `rm` → 1, naming it;
- an untracked `.snap` → 1;
- an orphan `.snap` → 1;
- 18 fixtures → 1;
- 11 + 1 + 7 → 1, naming `examples`;
- an extra file → 1;
- an ignored `.DS_Store` in a fixture folder → 0;
- a directory that is not a git repo → 1.

**`check-vsix`** (§5.5.5):
- the S4 set → 0;
- the S4 set with an archive comment → 0;
- an empty zip, an extra file, a missing file, or a non-zip → 1, each naming the problem;
- a path that does not exist → 1, naming it;
- the default path: a temp `--root` whose `package.json` says `9.9.9` checks `cep-9.9.9.vsix`.

**`check-clean`** (§5.5.6): a clean repo → 0; an untracked or a changed file → 1, naming the path; a directory that is not a git repo → 1.

**`ci.yml`.** A line-based reader with no dependency reads `on:`, each job's `if:`, and each job's `steps[].run`. It fails on any line it cannot place. The test requires all of these:
- `on:` includes `push` (branches `[main]`), `pull_request`, `schedule` and `workflow_dispatch`;
- the test job has no `if:`, and its `run:` steps are exactly `npm ci` then `npm run gate`;
- the `upstream` job's `if:` is the schedule-or-dispatch condition, and its only `run:` step is `node scripts/check-upstream.mjs`.

Red first: the test runs against PLAN v1's §5.6 file and against three mutations of the real one: `pull_request` dropped, an `if:` added to the test job, and the upstream step removed. Each must go red.

`test/toolchain.test.mjs` (built) covers `check-toolchain` (§5.5.7).

### 6.5 Grammar tests: `test/grammar.test.mjs` (`node:test`, no dependencies) (v2)

The scope lint uses the test runner's own parser, `parseGrammarTestCase` from `vscode-tmgrammar-test/dist/unit/parsing.js` (already a dev dependency), so it reads required and excluded scopes exactly as the runner does. The grammar's emitted scopes are every space-separated name in `name`, `contentName`, `captures`, `beginCaptures` and `endCaptures`, at every depth.

1. `every scope a unit test names is one the grammar emits`.
2. `every scope the grammar emits is required by some unit test`.
3. `the lint reads assertions that only exclude a scope`: a temporary test file whose only assertion is `-- <------ - keyword.other.units.cep` makes the lint fail, naming `keyword.other.units.cep`.
4. `the language configuration loads`:
   - `language-configuration.json` parses as JSON;
   - `wordPattern` compiles as a JS `RegExp` and does not match `""`;
   - `comments`, `brackets` and the auto-closing pairs equal §5.2.

Red first: tests 1 and 2 fail on the placeholder grammar, and test 4 fails before the file exists.

## 7. Build steps, in order

### 7.0 The release ladder (owner, 2026-11-09)

The owner wants a working product as early as possible, then iteration towards the finish line, and several released versions are fine. So v1 ships as a ladder of releases. Each release comes from a tag on `main` that the owner makes, with the `.vsix` that CI built attached to a GitHub Release (D3).

| Version | What it adds | When |
|---|---|---|
| **v0.0.1** (preview) | The design-reviewed reference grammar (the architect's candidate for §5.3 v2), PLAN §5.2's editor configuration, §6.1's verbatim `literals.test.cep` (run red first), and the release job (§5.6.1), released by CI from the owner's tag (owner, 2026-11-09: "an immediate release from CI"). **Its gate is what exists at that rung**: the toolchain check, the literals test, the release tests and packaging. `.vsix` content was checked by hand (8 files). The full gate comes with v0.1.0. | 2026-11-09 |
| **v0.1.0** (sprint S1) | The repo-built extension: lane B's test-first grammar and configuration, and lane A's tooling and CI. Then the 19 snapshots generated and reviewed, T3 (`npm ci && npm run gate`), CI green on the owner's PR, the owner's quick check (Dark 2026 and Light 2026, the editor basics, typing `'''`), merge and tag. | target 2026-11-09 |
| **v0.1.1** (S1.1) | The review and break-it of the combined build (architect, QA, the-fool), moved here from S1 by the owner (≠ R). Then one fix round, the owner's feedback from the preview and v0.1.0, and the full owner's check in four themes. | after v0.1.0 |
| **v0.1.x** | The lockfile re-resolved with `--before` (today − 14 days), so the `@azure/identity` 4.14.1 fix is in; `npm audit` recorded (plan check card line 10). Moved here from before T3 by the owner, amending G0 Q3. It folds into v0.1.1 if that ships on or after the 13th. | on or after 2026-11-13 |
| **later** | §9's items (snippets, store publishing, the language server) as the owner picks them, one release each. | — |

Every release still runs the gate (`npm ci && npm run gate`) and CI before its merge, and every snapshot change is reviewed.

### 7.1 The steps

Commit after each step. Commit messages say what changed and why, with no AI attribution. The owner pushes; agents do not.

*v2 note: S1 runs these steps inside cep's full loop. Steps 0–1 are done (G0, the scaffold). Steps 2 and 8 are lane A, steps 3–4 are lane B, and steps 5–7 are the coordinator's after combine (plan check §1, §4). Where a step below and §5–§6 v2 differ, §5–§6 v2 win:*
- *step 2 also vendors `lexer.go`;*
- *step 3 writes 7 unit files and runs them red against the placeholder and the named mutants (§6.1);*
- *the checker's stub run comes after step 4 (§6.3);*
- *step 5 adds the snapshot red run (§6.2);*
- *step 6 is the owner's check, in Dark 2026, Light 2026, Dark Modern and Light Modern (G1-5), including typing `'''` and `"""` and recording what appears (G1-6);*
- *step 7's `.vsix` proof is `npm run test:vsix`, and the install uses a scratch `--extensions-dir`.*

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

*For v0.1.0 (S1), the owner's check is the quick check of the §7.0 ladder; the four-theme check and the review of the combined build come in v0.1.1. The list below is v1 as a whole, reached across the ladder.*

- [ ] `npm test` exits 0 on a clean checkout after `npm ci`; the exit code was read, not assumed.
- [ ] All 19 snapshots were reviewed by hand per §6.2.
- [ ] The step 6 manual check (the owner's check) passed in all four themes: Dark 2026, Light 2026, Dark Modern and Light Modern.
- [ ] `cep-0.1.0.vsix` builds with no `WARNING` line, `npm run test:vsix` passes, and the package installs and colours `.cep` files.
- [ ] Both CI jobs are green on the PR.
- [ ] No commit contains AI attribution.
- [ ] The status line at the top of this file says what shipped.

## 9. Later (not v1)

- **Snippets** (if D1 is not (b)): `contributes.snippets` with one snippet per declaration and one per rule shape (plain, pattern, windowed), with clauses in the fixed order: intent, partition, body, expect/todo, select, rate, insert.
- **Language server.** Error squiggles carrying cep's E-codes, hover, go-to-definition for streams, tables and params, and formatting through cep's printer.
  - The server MUST live in the cep repo, because it needs `internal/parser`, and Go forbids importing an `internal/` package from another module. That makes it cep engine work, planned through cep's own process, for example as a `cmd/` binary that speaks LSP over stdio.
  - This repo then gains `src/extension.ts`, a build step and the `vscode-languageclient` dependency, which needs owner approval. The TextMate grammar stays for fast colouring.
- **Store publishing** (D3). The Marketplace needs a `vorsar` publisher and a `VSCE_PAT` secret for `vsce publish`. Open VSX needs the `vorsar` namespace and an `OVSX_PAT` secret for `npx ovsx publish`, which is another dependency.
