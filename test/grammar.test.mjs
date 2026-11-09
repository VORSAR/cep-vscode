// Grammar tests (PLAN §6.5): the scope lint between the unit tests and the grammar, and the language configuration.
// The lint reads the unit tests with the test runner's own parser, so it sees required and excluded scopes exactly as
// the runner does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const { parseGrammarTestCase } = require('vscode-tmgrammar-test/dist/unit/parsing.js');

const grammarPath = path.join(root, 'syntaxes', 'cep.tmLanguage.json');
const unitDir = path.join(root, 'test', 'unit');
const configPath = path.join(root, 'language-configuration.json');

// Every space-separated name in name, contentName and the capture maps, at every depth of the rules. The grammar's
// own top-level keys (scopeName, any display name) are not rules and emit nothing.
function emittedScopes(grammar) {
  const scopes = new Set();
  const add = (value) => {
    if (typeof value !== 'string') return;
    for (const s of value.split(/\s+/)) if (s) scopes.add(s);
  };
  const visit = (rule) => {
    if (!rule || typeof rule !== 'object') return;
    add(rule.name);
    add(rule.contentName);
    for (const key of ['captures', 'beginCaptures', 'endCaptures', 'whileCaptures']) {
      if (rule[key] && typeof rule[key] === 'object') Object.values(rule[key]).forEach(visit);
    }
    if (Array.isArray(rule.patterns)) rule.patterns.forEach(visit);
    if (rule.repository && typeof rule.repository === 'object') Object.values(rule.repository).forEach(visit);
  };
  if (Array.isArray(grammar.patterns)) grammar.patterns.forEach(visit);
  if (grammar.repository && typeof grammar.repository === 'object') Object.values(grammar.repository).forEach(visit);
  return scopes;
}

function loadGrammar() {
  return JSON.parse(fs.readFileSync(grammarPath, 'utf8'));
}

function unitFiles() {
  const files = fs.readdirSync(unitDir).filter((f) => f.endsWith('.test.cep')).sort();
  assert.ok(files.length > 0, `no unit tests in ${unitDir}`);
  return files.map((f) => path.join(unitDir, f));
}

// Each scope a test file names, with where: required (before the " - ") and excluded (after it).
function namedScopes(files) {
  const named = [];
  for (const file of files) {
    const tc = parseGrammarTestCase(fs.readFileSync(file, 'utf8'));
    for (const line of tc.assertions) {
      for (const a of line.scopeAssertions) {
        const where = `${path.basename(file)}:${line.testCaseLineNumber + 1}`;
        for (const scope of a.scopes) named.push({ scope, required: true, where });
        for (const scope of a.exclude) named.push({ scope, required: false, where });
      }
    }
  }
  return named;
}

// The lint: one problem per named scope the grammar does not emit.
function lint(files, emitted) {
  return namedScopes(files)
    .filter(({ scope }) => !emitted.has(scope))
    .map(({ scope, required, where }) => `${where}: ${required ? 'requires' : 'excludes'} ${scope}, which the grammar never emits`);
}

test('every scope a unit test names is one the grammar emits', () => {
  const problems = lint(unitFiles(), emittedScopes(loadGrammar()));
  assert.deepEqual(problems, []);
});

test('every scope the grammar emits is required by some unit test', () => {
  const emitted = emittedScopes(loadGrammar());
  assert.ok(emitted.size > 0, `${grammarPath} emits no scope at all`);
  const required = new Set(namedScopes(unitFiles()).filter((n) => n.required).map((n) => n.scope));
  const unrequired = [...emitted].filter((s) => !required.has(s)).sort();
  assert.deepEqual(unrequired, [], `scopes the grammar emits that no unit test requires: ${unrequired.join(', ')}`);
});

test('the lint reads assertions that only exclude a scope', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cep-'));
  const probe = path.join(dir, 'probe.test.cep');
  fs.writeFileSync(probe, '-- SYNTAX TEST "source.cep" "lint probe"\nminute\n-- <------ - keyword.other.units.cep\n');
  const problems = lint([probe], emittedScopes(loadGrammar()));
  assert.equal(problems.length, 1, problems.join('\n'));
  assert.match(problems[0], /keyword\.other\.units\.cep/);
  assert.match(problems[0], /excludes/);
});

test('the language configuration loads', () => {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  assert.equal(typeof config.wordPattern, 'string');
  const word = new RegExp(config.wordPattern);
  assert.equal(word.test(''), false, 'wordPattern must not match the empty string');
  assert.deepEqual(config.comments, { lineComment: '--', blockComment: ['/*', '*/'] });
  assert.deepEqual(config.brackets, [['(', ')'], ['[', ']'], ['{', '}']]);
  assert.deepEqual(config.autoClosingPairs, [
    { open: '(', close: ')' },
    { open: '[', close: ']' },
    { open: '{', close: '}' },
    { open: "'", close: "'", notIn: ['string', 'comment'] },
    { open: '"', close: '"', notIn: ['string', 'comment'] },
    { open: '`', close: '`', notIn: ['string', 'comment'] },
    { open: '/*', close: ' */', notIn: ['string'] },
  ]);
});
