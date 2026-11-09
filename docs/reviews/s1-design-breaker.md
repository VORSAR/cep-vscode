# S1 — design panel: breaker (2026-11-08)

*Filed by the coordinator from the breaker's returned report, 2026-11-09: the harness stops subagents from writing report files. The breaker's grammar, cases and expected results were in the session scratchpad (`s1/breaker/`); they become test material in design v2. The coordinator's diff against the plan's grammar is at the end.*

I built a TextMate grammar for CEP from cep's own sources at `main`, read only through git: `internal/parser/lexer.go`, `keywords.go`, `grammar.go`, `parse.go`, `lower.go`, `docs/language/SPEC.md`, `grammar.lark`, `grammar.ebnf`, `errors.md`, and the valid and invalid corpus. I worked blind. I did not read the planned grammar, its tests, cep-vscode's `docs/` or `syntaxes/`, or the scratchpad folders that hold the plan.

## Results

- `grammar.json`: 115 keywords, each in exactly one of 11 classes. `build.mjs` reads the keyword table from a verbatim copy of `keywords.go` and fails if a keyword has no class, has two, or is not in the table.
- `cases.txt`: **85 cases**, built by `cases.mjs`. Every backslash is built from its character code, and `grep` confirms the bytes.
- **Fixtures:** all **12 of 12** valid example files tokenize with no `invalid.*` scope. That holds under both the probe and the comparator.
- **cep's lexer against the grammar:** `compare.mjs` lexes each input with cep's rules table, then checks every cep token against the grammar's scopes over the same span.
  - All 36 corpus files: **0 disagreements**.
  - The 85 cases: 8 disagreements, all in four cases I mark as gaps (cases 4, 5, 35 and 36).
  - A sabotage run (keyword edges changed to `\b`, keyword-case rule removed) made the comparator flag both faults, so it does catch errors.
- **Lexical-error files:** the invalid files for the four lexical errors (E-KW-001 in mixed case, E-KW-002, E-RES-001, E-STR-001) each get their mark. The other 20 invalid files get none, as their errors are parse or static errors with no scope in the vocabulary.
- **cep's real parser:** built from a `git archive` of cep `main`. It parses all 12 examples and gives every invalid file its expected code. I used it for 20 targeted programs.

## Keyword-to-class table

Every line number is in `docs/language/grammar.lark` at cep `main`, except where SPEC is named.

| Class (scope) | Keywords | Deciding source line |
|---|---|---|
| `storage.type.declaration.cep` | `language` | 13 `pragma: "language" PRAGMA_ID ";"` |
| | `param` | 22 `param_decl: "param" cname type "=" signed_literal ";"` |
| | `stream` | 26 `stream_decl: annotation* "stream" cname "(" attr_list ")" time_clause? ";"` |
| | `table` | 27 `table_decl: "table" cname "(" attr_list ")" "primary" "key" …` |
| | `rule` | 56 `rule_decl: "rule" cname intent_clause …` |
| `storage.type.primitive.cep` | `string int float bool timestamp duration object` | 32–38 `type: "string" … \| "object"`. For `timestamp` also 168 `"timestamp" STRING -> ts_lit` ("a type name used in a schema or literal") |
| `storage.modifier.cep` | `optional` | 31 `opt_marker: "optional"` (modifies a column) |
| | `primary key` | 27 `… "primary" "key" "(" name_list ")"` (the table's key) |
| `keyword.other.window.cep` | `sort cron delay batch` | 85–88 `window_kind: "sort" … \| "cron" … \| "delay" … \| "batch" "(" ")"` |
| `keyword.other.unit.cep` | `ms sec min hour day week` | 184 `DUR_UNIT: "ms" \| "sec" \| "min" \| "hour" \| "day" \| "week"` |
| `keyword.operator.logical.cep` | `or` | 120 `?or_expr: or_expr "or" and_expr` |
| | `and` | 122 `?and_expr: and_expr "and" not_expr` (also 76 absence, 78 and-group) |
| | `not` | 124 `?not_expr: "not" not_expr`, 127 `"not" "in"`, 131 `"is" "not" "null"` |
| | `in` | 126 `?membership: comparison "in" cname` |
| | `is` | 130 `sum "is" "null" -> is_null` (the null test) |
| `constant.language.cep` | `true false` | 166–167 `"true" -> true_lit`, `"false" -> false_lit` |
| | `null` | 115 `field_value: … \| "null" -> null_lit`. A literal; in 130 it is the operand of `is` |
| `support.function.builtin.cep` | `raw` | 149 `"raw" "(" attr_ref ")" -> raw_wrap`; SPEC §5.3 "raw \| `raw(attr) <op> …`" |
| `keyword.operator.text.cep` | the 8 `TEXT_OP`, 8 `SET_OP` and 4 `REGEX_OP` words | 185–189 `TEXT_OP:` / `SET_OP:` / `REGEX_OP:` |
| `invalid.illegal.reserved.cep` | `group having order limit offset join trigger aggregation sequence session tumbling hopping sliding processing route to punctuated` | SPEC §2.6 "Reserved for future versions (rejected with `E-RES-001`)"; `keywords.go` `reservedFuture` |
| `keyword.control.clause.cep` | `intent` | 58 `intent_clause: "intent" STRING` |
| | `partition by of ttl` | 59–60 `partition_clause: "partition" "by" part_key … "ttl" …`, `part_key: cname "of" cname` |
| | `from within` | 66 `body: "from" restart … "within" duration_or_param …` |
| | `every once` | 72–73 `restart: "every" \| "once"`; `every` also 104 |
| | `for` | 76 `"and" "not" source "for" duration_or_param -> absence` |
| | `after match skip past last` | 97 `after_match: "after" "match" "skip" "past" "last"` |
| | `late events drop allow` | 98–100 `late_clause: "late" "events" late_policy`, `"drop"`, `"allow"` |
| | `window` | 84 `window_clause: "window" window_kind` |
| | `asc desc` | 89–90 `sort_dir: "asc" \| "desc"` (part of the window clause) |
| | `emit on` | 91 `emit_clause: "emit" "on" emit_mode` |
| | `close change due end` | 92–95 `emit_mode: "close" \| "change" \| "due" \| "batch" "end"` |
| | `time arrival watermark bounded ascending` | 40–43 `time_clause: "time" cname "watermark" wm_strategy … \| "time" "arrival" …`, `wm_strategy: "bounded" … \| "ascending"` |
| | `idle` | 44 `idle_clause: "idle" "after" duration` |
| | `select as` | 102–103 `select_clause: "select" sel_item …`, `sel_item: expr ("as" cname)?` |
| | `output first` | 104 `rate_clause: "output" "first" "every" duration_or_param` |
| | `insert into` | 56 `… "insert" "into" cname ";"` |
| | `expect todo` | 63–64 `extra: "expect" expect_block \| "todo" STRING` |
| | `given then` | 109–111 `given_sec: "given" cname … \| "given" "table" cname …`, `then_sec: "then" cname …` |

Counts: declaration 5, primitive 7, modifier 3, window 4, unit 6, logical 5, constant 3, builtin 1, text 20, reserved 17, clause 44. That makes 115, equal to `keywordList`.

Any spelling of any of the 115 that is not all-lowercase gets `invalid.illegal.keyword-case.cep`, the reserved-for-later words included. That is what cep does. Its classifier makes such a word a `MixedKeyword`, and `parseError` gives E-RES-001 only to a lowercase `Keyword` in `reservedFuture`. A mixed-case word gets E-KW-002, or E-KW-001 in a name slot.

## Other scopes, and where each comes from

- **Version:** `constant.other.version.cep` covers `[a-z][a-z0-9_]*/[0-9]+\.[0-9]+` (lexer.go's `Pragma`) after a lowercase `language`. Whitespace, comments and line breaks may come between them.
- **Declared names:**
  - After `stream` the name gets `entity.name.type.stream.cep`; after `table`, `entity.name.type.table.cep`; after `rule`, `entity.name.function.rule.cep`; after `param`, `variable.other.constant.param.cep`; after `into`, `entity.name.type.stream.cep` (the insert target).
  - The name may sit after whitespace, comments or a line break, because cep treats those as trivia.
  - A name that spells a reserved word in any case does not take the entity scope; it keeps its keyword scope.
  - A backticked name keeps `variable.other.quoted.cep` (doubt D6).
- **Annotations:** `@` gets `punctuation.definition.annotation.cep`, and the name after it gets `storage.type.annotation.cep` (Go grammar `'@' @(Ident|Backticked)`; whitespace and comments are allowed between).
- **Calls:**
  - `name(` gets `support.function.cep`, and `ns:name(` gets `entity.name.namespace.cep`, `punctuation.separator.namespace.cep` and `support.function.cep` (grammar.lark 151–152 `func_call`).
  - Neither the namespace nor the name may be a reserved word, so `min(`, `raw(`, `sort(` and `has_any_ci(` keep their keyword class.
  - A call name never follows a `.`, because cep refuses `x.y(z)`.
- **Strings and escapes:**
  - One-line strings take begin and end punctuation.
  - Inside them, `\\ \' \" \n \t \r \uXXXX` get `constant.character.escape.cep` (SPEC §2.4). Any other backslash pair, or `\u` with fewer than four hex digits, gets `invalid.illegal.escape.cep`. This mirrors `lower.go`'s `str()`.
  - Triple-quoted strings are raw: no escapes and no punctuation scopes (doubt D7).
- **Operators and punctuation:** `->` arrow; `== != >= <= > <` comparison (lexer.go `Cmp`); `=` assignment; `+ - * / %` arithmetic. Then `;` terminator, `,` comma, `.` accessor, and `:` key-value (except in a namespaced call). Brackets take no scope, as the vocabulary has none for them.

## Rule order, and why

TextMate takes the leftmost match. Pattern order only breaks a tie between patterns that match at the same position. cep's lexer works the same way: an ordered table, tried at each position, first match wins. So I matched cep's whole tokens, and ordered the patterns only where two of them can start at the same character. The top-level order is:

1. **comments**: `/* … */` and `-- …`. They must beat `-`, `->` and `/` at the same position, as `Comment` is first in cep's table. `a--b` and `-->` are comments in both.
2. **strings**: `"""` and `'''` before one-line strings, as `RawString` comes before `String` in cep. Otherwise `'''` would read as `''` and then `'`.
   - An unclosed one-line string and a closed one exclude each other. The closed form's begin needs a closing quote on the line, by lookahead, so their order does not matter.
3. **param ref** `${name}`: cep lexes `ParamRef` before `Ident`. So `${select}` is a param ref, which cep accepts when the param is declared backticked.
4. **calls**: must come before backticked names, because a namespaced call can begin with a backtick (`` `math`:`round`( ``) and would tie with the backticked rule. Calls exclude reserved words, so they never tie with keyword rules.
5. **backticked names.**
6. **declarations** (`language`, `param`, `stream`, `table`, `rule`, `into`, `given`): each begins on the same text as its keyword rule, so it must come first to win the tie. `given` has its own region so that `given table X` does not start a table declaration, even across a line break.
7. **annotation** `@`.
8. **number**: lexer.go's `Number` exactly. A leading `-` is an operator, as in cep.
9. **keywords**: 11 lowercase rules over disjoint word sets, so their order among themselves does not matter.
10. **keyword case**: excludes the exact lowercase spellings by lookahead, so it is order-independent too.
11. **identifier**: `[A-Za-z_][A-Za-z0-9_]*` with no scope. It comes after every keyword rule, so it never beats a keyword at the same position. Because it consumes whole names, no keyword can match inside a name (`xselect`, `select_`, `has_ci_x`).
12. **operators**: `->` before `-`; the two-character comparisons before `=`.
13. **punctuation.**

**Word edges:**

- A keyword starts where the previous character is not `[A-Za-z_]`, and ends where the next is not `[A-Za-z0-9_]`.
- A digit before a keyword is allowed on purpose. cep lexes `5min` as `Number 5` then `Keyword min`, and parses it as a duration (checked: `ttl 1hour` and `within 5min` parse). A digit inside a name is already consumed by the identifier rule.
- I used no `\b` and no `(?i)`. Both are Unicode-aware in Oniguruma, and cep's edges and case rule are ASCII. A Kelvin sign, a long s and a sharp s must not fold into `key`, `select` and `processing` (case 45).

## The four lexical errors

- **E-KW-002** (and the case half of E-KW-001): `invalid.illegal.keyword-case.cep` on any non-lowercase spelling of the 115 words, by explicit `[sS][eE]…` classes.
- **E-RES-001**: `invalid.illegal.reserved.cep` on the 17 lowercase reserved-for-later words, wherever they stand, which is what the parser does.
- **E-STR-001**: an unclosed one-line string is matched whole, from its quote to the end of its line, and the whole span gets `invalid.illegal.newline.cep`. The quote also gets the begin punctuation. The mark is visible text, never a zero-width token, and the rule cannot reach past the end of its line, so the next line is tokenized afresh. The body pattern is cep's own (`[^'\\\n]|\\.`) plus an optional final backslash. So `'abc\` and `'abc\'` at the end of a line are unclosed, as in cep.
- **E-STR-002**: `invalid.illegal.escape.cep` on the bad escape itself. cep reports the error at the string token; the grammar marks the escape inside it.

## Known limitations

1. **An unclosed raw string** (`'''` that never closes) colours the rest of the file as a raw string. cep instead lexes `''` and then an unclosed `'` (E-STR-001 at the third quote; case 36). A TextMate begin rule cannot look past its line to see whether a `'''` ever comes.
2. **Four quotes** `''''`: cep sees two empty strings, while the grammar opens a raw string (case 35). The cause is the same as in limitation 1.
3. **A Pragma token outside the pragma.** cep's lexer reads `[a-z][a-z0-9_]*/[0-9]+\.[0-9]+` anywhere, so `risk/2.5` is one token and the rule fails to parse (checked). The grammar shows a division there (case 5), and leaves `cep/0.1` unscoped after `LANGUAGE` (case 4).
4. **After a cep lexer error** (a stray `#`, a `$` without `{`, `+` inside backticks, a non-ASCII letter outside a string), cep lexes nothing more. The grammar carries on with no mark on the bad character, as the vocabulary has no scope for it.
   - A stray backtick then pairs with the next backtick on the line (case 48).
   - An ASCII keyword right after a non-ASCII letter is still coloured (`éselect`, case 44).
5. **E-CMT-001 is unmarked.** An unclosed `/*` is shown as a comment to the end of the file, which is how cep lexes it (`BadComment`), but nothing says it is an error.
6. **Parse and static errors get no mark:** E-KW-001 for a lowercase keyword in a name slot, E-SYN-*, E-TXT-001, E-PRAG-001, E-LATE-002 and so on. The vocabulary has no scope for them, and most need a parser.
7. **One-line lookaheads.** A call is recognised only when its `(` is on the same line as the name (`coalesce\n(x)` is not shown as a call), and the same holds for a namespaced call. Declared names, the version and annotation names do cross lines.
8. **Function names are not checked against the catalogue.** Any name before `(` that is not a reserved word is `support.function.cep`, whether or not Appendix F lists it, as the closed catalogue is a deploy check (E-NAME-001).

## Doubts

- **D1, `null`:** I chose `constant.language.cep`, as a literal (115 `"null" -> null_lit`, like `true` and `false`). The vocabulary's "null-test operator word" could mean `null` in `is null` (130). One class per keyword forces a choice.
- **D2, `batch`:** window class everywhere, including `emit on batch end` (95), where it names an emit mode.
- **D3, `asc` and `desc`:** clause class. They are sort directions inside a window kind (89–90). "A window kind" does not fit them, and the modifier scope is for columns and keys.
- **D4, `timestamp`:** primitive class both as a type (36) and as the literal prefix `timestamp '…'` (168). The vocabulary's "used in a schema or literal" seems to mean exactly this.
- **D5, `table` after `given`:** declaration class (one class per keyword), but the name after `given table` takes no table-name scope, as it is a reference, not a declaration.
- **D6, backticked declared names:** they get only `variable.other.quoted.cep`, not the stream, table, rule or param scope. Nesting both is possible; themes would colour by the inner scope.
- **D7, punctuation on raw strings:** triple-quoted strings get no `punctuation.definition.string.*`, because the vocabulary limits those to one-line strings.
- **D8, the E-STR-001 span:** I mark the whole unclosed string, quote to end of line. Marking only the quote, or only the last character, would be quieter but harder to see.
- **D9, the backtick pattern:** cep disagrees with itself.
  - lexer.go allows `` ` `` + `[A-Za-z0-9_\-. ]*` + `` ` ``: empty, all spaces, or digit-first.
  - grammar.lark requires a letter or `_` first.
  - grammar.ebnf says "any-but-backtick", with a comment narrowing it to the class.
  - cep's parser accepts `` stream `1abc` ``, ``` stream `` ``` and `` stream ` ` `` (checked).
  - I followed lexer.go, since that is what the engine does.
- **D10, the version scope:** only after a lowercase `language`. Scoping every Pragma-shaped token would mirror cep's lexer, but the vocabulary says "the language version in the pragma".
- **D11, ASCII word edges:** a digit before a keyword is allowed (`5select` colours `select`, which is cep's tokenization), and so is a non-ASCII letter before one (limitation 4).
- **D12, annotation names:** any name after `@` gets the annotation scope (`@Sink`, `@whatever`), as the closed annotation vocabulary is checked later. A reserved word after `@` keeps its keyword class.
- **D13, unsuffixed operators and synonyms:** `has`, `contains`, `matches` and `followed` stay plain. cep raises E-TXT-001 or E-SYN-001 on them at parse, and the vocabulary has no scope for either.
- **D14, `raw` without a parenthesis:** it still gets the builtin scope, because the class goes with the word.
- **D15, CR:** in the probe a CR stays at the end of a line and lands inside a line comment or an unclosed string, as in cep. VS Code strips it from lines, so scopes do not change.

## Findings about cep itself (for the owner; nothing was changed in cep)

1. **`name/decimal` without spaces fails to parse.** `from S[risk/2.5 > 1.0]` gives E-SYN-001 "unexpected token "risk/2.5"", because lexer.go's `Pragma` rule matches before `Ident` everywhere. `risk / 2.5`, `Risk/2.5` and `risk/2` all parse. The SPEC does not say division needs spaces.
2. **The backtick rule differs between lexer.go, grammar.lark and grammar.ebnf** (D9). The engine accepts an empty and a space-only stream name.
3. **E-LATE-001's fix text** (errors.md line 31 and `errors.go`) offers `late events allow <duration>`. SPEC §6.3 rev 3 makes that form E-LATE-002 wherever it appears. The parser accepts `late events allow 5 min`, so the code comes later.
4. **The E-STR-001 message** "a single-quoted string does not end on its line" is also given for an unclosed double-quoted string (`parse.go` `lexError`).

---

## Coordinator's diff against the plan's grammar (2026-11-09)

A character-by-character diff, with `vscode-textmate` and `vscode-oniguruma` from the scratch install and lines split like the test runner. A is PLAN §5.3 v1 with the plan check's probed E-STR-001 fix (QA's `plan-fixed.json`); B is the breaker's grammar. The harness was first checked on plan v1 against plan-fixed: it gave exactly the 8 differing runs on `e-str-001` lines 7–8 that QA reported.

**The 19 fixtures: 12 differing runs, in 4 kinds.**

1. `expect given table X`: A gives `X` the table-declaration scope; B gives none (P3).
2. A backticked declared name: A gives the stream-name scope; B gives the quoted-name scope (D6).
3. `stream select` and `stream SeleCT` (the E-KW-001 files): A gives a stream name; B gives the keyword's own scope, and for `SeleCT` the keyword-case error.
4. E-STR-001: A marks the last visible character; B marks the whole unclosed string (P1, D8).

**The plan check's 42 counter-examples: 32 identical.** The other 10 are:
- the E-STR-001 span (as kind 4 above);
- `\u12`: B marks the whole `\u12`, A only `\u`;
- `2min`: B colours a number and a unit; A colours nothing (P2);
- `stream` with `Foo (` on the next line: B gives a stream name, A a function (P7);
- `given table T`: as kind 1 (P3);
- `stream SeleCT`: as kind 3;
- `language`, then `cep/0.1` on the next line: B gives the version scope, A gives `/` and a number (P8).

**The breaker's 85 cases: 91 differing runs.** Most are places where B follows cep's lexer more closely than A:
- number edges such as `1e`, `1.5.3` and `1e3e3`;
- an annotation with a space or a comment after `@`;
- `math : round (x)` as a call;
- `math:min(x)`, where B keeps `min` as a unit, as cep does;
- `param stream` and `stream rule`, where A gives a keyword a name scope;
- declaration names after a comment or a line break.

**The choices that are not a matter of following cep:**
- the E-STR-001 span;
- backticked declared names (D6);
- `@select` (D12);
- Unicode look-alikes (`Key` with a Kelvin sign, `ſelect`, `proceßing`), which A marks as a keyword-case error through `(?i)` folding and B leaves plain. cep rejects these characters at the lexer either way.

**Checked with cep's real parser** (a `git archive` copy; `lexer.go`, `parse.go`, `keywords.go` and `grammar.go` equal cep `1fa3a5b` by `git hash-object`):
- a rule with `within 5 min` parses;
- with `within 5min`, it parses;
- with `risk/2.5 > 1.0`, it fails: `E-SYN-001: unexpected token "risk/2.5"`;
- with `risk / 2.5 > 1.0`, it parses.
