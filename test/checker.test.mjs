// Checker tests (PLAN §6.3): each test copies the real grammar into a temporary directory, makes one change in
// memory, writes it, runs scripts/check-keywords.mjs on the copy, and asserts the exit status and the message.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const script = path.join(root, 'scripts', 'check-keywords.mjs');
const realGrammar = path.join(root, 'syntaxes', 'cep.tmLanguage.json');
const realKeywords = path.join(root, 'test', 'upstream', 'keywords.go');

const LEAD = '(?<![A-Za-z_])(?:';
const TAIL = ')(?![A-Za-z0-9_])';
const EXCLUSION = /\(\?!\(\?i:[a-z_|]+\)\(\?!\[A-Za-z0-9_\]\)\)/;

function tmpdir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cep-'));
}

function run(args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
}

// Copy the real grammar, apply one change, and run the checker on the copy.
function runOnGrammar(change = () => {}, extraArgs = []) {
  const dir = tmpdir();
  const grammar = JSON.parse(fs.readFileSync(realGrammar, 'utf8'));
  change(grammar, dir);
  const file = path.join(dir, 'cep.tmLanguage.json');
  fs.writeFileSync(file, JSON.stringify(grammar, null, 2));
  return run(['--grammar', file, ...extraArgs]);
}

// Run the checker on the real grammar's copy with a changed keyword table.
function runOnKeywords(changeText) {
  const dir = tmpdir();
  const file = path.join(dir, 'keywords.go');
  fs.writeFileSync(file, changeText(fs.readFileSync(realKeywords, 'utf8')));
  return runOnGrammar(() => {}, ['--keywords', file]);
}

function expectFailure(r, ...named) {
  assert.equal(r.status, 1, `exit status\n${r.out}`);
  assert.match(r.out, /^check-keywords:/m, `no check-keywords: line\n${r.out}`);
  for (const n of named) assert.ok(r.out.includes(n), `the output does not name ${n}\n${r.out}`);
}

// The word list of a keywords-* entry, in its canonical form (with (?i) in front for keywords-wrong-case).
function getWords(grammar, key) {
  const match = grammar.repository[key].match;
  const prefix = key === 'keywords-wrong-case' ? `(?i)${LEAD}` : LEAD;
  assert.ok(match.startsWith(prefix) && match.endsWith(TAIL), `${key} is not canonical in the real grammar: ${match}`);
  return match.slice(prefix.length, -TAIL.length).split('|');
}

function setWords(grammar, key, words) {
  const prefix = key === 'keywords-wrong-case' ? `(?i)${LEAD}` : LEAD;
  grammar.repository[key].match = `${prefix}${words.join('|')}${TAIL}`;
}

function region(grammar, keyword) {
  const r = grammar.repository.declarations.patterns.find((p) => typeof p.begin === 'string' && p.begin.includes(`(${keyword})`));
  assert.ok(r, `no ${keyword} region in declarations`);
  return r;
}

function withoutBlock(text, opener) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => l.includes(opener));
  const end = lines.findIndex((l, i) => i > start && l === '}');
  assert.ok(start >= 0 && end > start, `no ${opener} block in ${realKeywords}`);
  lines.splice(start, end - start + 1);
  return lines.join('\n');
}

test('passes on the real grammar and the vendored table', () => {
  for (const r of [run([]), runOnGrammar()]) {
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^check-keywords: ok /m);
    assert.ok(r.out.includes('115 keywords, 17 reserved, 11 categories, 5 name exclusions'), r.out);
  }
});

test('fails when a keyword is in no category', () => {
  const r = runOnGrammar((g) => setWords(g, 'keywords-unit', getWords(g, 'keywords-unit').filter((w) => w !== 'ms')));
  expectFailure(r, 'ms');
});

test('fails when a keyword is in two categories', () => {
  const r = runOnGrammar((g) => setWords(g, 'keywords-clause', [...getWords(g, 'keywords-clause'), 'ms']));
  expectFailure(r, 'ms');
});

test('fails when the reserved category differs from reservedFuture', () => {
  const r = runOnGrammar((g) => {
    setWords(g, 'keywords-reserved', getWords(g, 'keywords-reserved').filter((w) => w !== 'join'));
    setWords(g, 'keywords-clause', [...getWords(g, 'keywords-clause'), 'join']);
  });
  expectFailure(r, 'join');
});

test('fails when the wrong-case list differs from keywordList', () => {
  const r = runOnGrammar((g) => setWords(g, 'keywords-wrong-case', getWords(g, 'keywords-wrong-case').filter((w) => w !== 'week')));
  expectFailure(r, 'week');
});

test('fails when a keywords match uses the old word-boundary form', () => {
  const r = runOnGrammar((g) => {
    g.repository['keywords-unit'].match = '\\b(?:ms|sec|min|hour|day|week)\\b';
  });
  expectFailure(r, 'keywords-unit');
});

test('fails when a keywords match has no word edges', () => {
  const r = runOnGrammar((g) => {
    g.repository['keywords-unit'].match = '(?:ms|sec|min|hour|day|week)';
  });
  expectFailure(r, 'keywords-unit');
});

test('fails when the first two patterns are swapped', () => {
  const r = runOnGrammar((g) => {
    [g.patterns[0], g.patterns[1]] = [g.patterns[1], g.patterns[0]];
  });
  expectFailure(r, 'comments');
});

test('fails when function-call moves before the keyword rules', () => {
  const r = runOnGrammar((g) => {
    const call = g.patterns.findIndex((p) => p.include === '#function-call');
    assert.ok(call >= 0, 'no #function-call entry');
    const [entry] = g.patterns.splice(call, 1);
    const windowAt = g.patterns.findIndex((p) => p.include === '#keywords-window');
    assert.ok(windowAt >= 0, 'no #keywords-window entry');
    g.patterns.splice(windowAt, 0, entry);
  });
  expectFailure(r, 'function-call');
});

test('fails when a top-level entry is missing', () => {
  const r = runOnGrammar((g) => {
    const before = g.patterns.length;
    g.patterns = g.patterns.filter((p) => p.include !== '#number');
    assert.equal(g.patterns.length, before - 1, 'no #number entry');
  });
  expectFailure(r, 'number');
});

test('fails when the keyword table is missing', () => {
  const r = runOnGrammar((g, dir) => {}, ['--keywords', path.join(tmpdir(), 'absent.go')]);
  expectFailure(r, 'absent.go');
});

test('fails when the grammar is missing', () => {
  const r = run(['--grammar', path.join(tmpdir(), 'absent.json')]);
  expectFailure(r, 'absent.json');
});

test('fails when a category word is not in keywordList', () => {
  const r = runOnGrammar((g) => setWords(g, 'keywords-unit', [...getWords(g, 'keywords-unit'), 'month']));
  expectFailure(r, 'month');
});

test('fails when the keyword table has no keywordList block', () => {
  const r = runOnKeywords((text) => withoutBlock(text, 'keywordList = []string{'));
  expectFailure(r, 'keywordList');
  const lines = r.out.split('\n').filter((l) => l.startsWith('check-keywords:'));
  assert.equal(lines.length, 1, `expected exactly one check-keywords: line\n${r.out}`);
});

test('fails when the keyword table has no reservedFuture block', () => {
  const r = runOnKeywords((text) => withoutBlock(text, 'reservedFuture = map[string]bool{'));
  expectFailure(r, 'reservedFuture');
});

test('fails when the grammar is not JSON', () => {
  const file = path.join(tmpdir(), 'broken.tmLanguage.json');
  fs.writeFileSync(file, '{');
  const r = run(['--grammar', file]);
  expectFailure(r, file);
});

test('fails when a name exclusion misses a word', () => {
  const r = runOnGrammar((g) => {
    const stream = region(g, 'stream');
    const end = stream.end.replace('|week|', '|');
    assert.notEqual(end, stream.end, 'the stream exclusion has no week');
    stream.end = end;
  });
  expectFailure(r, 'week', 'declarations');
});

test('fails when a name exclusion is missing', () => {
  const r = runOnGrammar((g) => {
    const rule = region(g, 'rule');
    const end = rule.end.replace(EXCLUSION, '');
    assert.ok(end.startsWith('([A-Za-z_][A-Za-z0-9_]*)|('), `unexpected rule end after the change: ${end}`);
    assert.ok(end.endsWith(')|(?=\\S)'), `unexpected rule end after the change: ${end}`);
    rule.end = end;
  });
  expectFailure(r, '4 of 5');
});

test('fails when a word list is out of keywordList order', () => {
  const r = runOnGrammar((g) => {
    const words = getWords(g, 'keywords-unit');
    const ms = words.indexOf('ms');
    const sec = words.indexOf('sec');
    assert.ok(ms >= 0 && sec >= 0, 'keywords-unit lacks ms or sec');
    [words[ms], words[sec]] = [words[sec], words[ms]];
    setWords(g, 'keywords-unit', words);
  });
  expectFailure(r, 'keywords-unit');
});
