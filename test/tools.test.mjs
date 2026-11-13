// Tests for the lane A tooling (PLAN §6.4): sync-upstream, check-upstream, check-fixtures,
// check-vsix, check-clean and the ci.yml workflow.
//
// Each test owns its world: temporary directories under one base, and throwaway repos made with
// `git init -b main`. Every git call, the tests' own and the scripts', runs with an empty global
// config, no system config, an empty XDG config home and a ceiling at the base, so the machine's
// git settings never reach the tests. No test reads ../cep, uses the network beyond 127.0.0.1,
// or writes into this repo. Each test asserts the script's own message, not only its exit status.
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const repoRoot = path.join(import.meta.dirname, '..');
const scriptPath = (name) => path.join(repoRoot, 'scripts', `${name}.mjs`);

const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cep-tools-')));
after(() => fs.rmSync(base, { recursive: true, force: true }));

const emptyConfig = path.join(base, 'empty.gitconfig');
fs.writeFileSync(emptyConfig, '');
fs.mkdirSync(path.join(base, 'xdg'));
const ENV = {
  ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('GIT_'))),
  GIT_CONFIG_GLOBAL: emptyConfig,
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: base,
  XDG_CONFIG_HOME: path.join(base, 'xdg'),
};

function run(script, args) {
  const r = spawnSync(process.execPath, [scriptPath(script), ...args], { encoding: 'utf8', env: ENV, cwd: base });
  return { status: r.status, out: r.stdout + r.stderr };
}

// For check-upstream: a local HTTP server must keep answering while the script runs.
function runAsync(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath(script), ...args], { env: ENV, cwd: base });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { out += d; });
    child.on('error', reject);
    child.on('close', (status) => resolve({ status, out }));
  });
}

const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t'];
function git(cwd, ...args) {
  return execFileSync('git', [...GIT_ID, ...args], { cwd, env: ENV, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function gitBytes(cwd, ...args) {
  return execFileSync('git', [...GIT_ID, ...args], { cwd, env: ENV, stdio: ['ignore', 'pipe', 'pipe'] });
}

const newDir = (prefix) => fs.mkdtempSync(path.join(base, `${prefix}-`));
function newRepo(prefix) {
  const dir = newDir(prefix);
  git(dir, 'init', '-q', '-b', 'main');
  return dir;
}
function write(root, rel, content) {
  const file = path.join(root, ...rel.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
const read = (root, rel) => fs.readFileSync(path.join(root, ...rel.split('/')));
const exists = (root, rel) => fs.existsSync(path.join(root, ...rel.split('/')));
function commitAll(dir, message = 'commit') {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', message);
}
// Every file under dir, as sorted posix paths relative to it.
function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.relative(dir, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    .sort();
}
// Bytes and modification time of every file, to prove a run wrote nothing.
function snapshot(dir) {
  return Object.fromEntries(listFiles(dir).map((rel) => {
    const file = path.join(dir, ...rel.split('/'));
    return [rel, `${fs.readFileSync(file).toString('base64')} ${fs.statSync(file, { bigint: true }).mtimeNs}`];
  }));
}
const re = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// ---------------------------------------------------------------------------------------------
// A throwaway "cep" with the paths sync-upstream reads.

const EXAMPLES = Array.from({ length: 10 }, (_, i) => `${String(i + 1).padStart(2, '0')}-example.cep`);
const TORTURE = ['comments.cep', 'lexical.cep'];
const INVALID = [
  'e-cmt-001-unterminated-comment.cep',
  'e-kw-001-keyword-as-identifier.cep',
  'e-kw-001-mixedcase-identifier.cep',
  'e-kw-002-uppercase-keyword.cep',
  'e-res-001-group-by.cep',
  'e-syn-001-malformed-backticked-name.cep',
  'e-str-001-newline-in-single-quoted.cep',
  'e-txt-001-unsuffixed-text-operator.cep',
];

function cepFiles() {
  const files = {
    'internal/parser/keywords.go': 'package parser\n\nvar keywordList = []string{\n\t"select",\n}\n',
    'internal/parser/lexer.go': 'package parser\n\n// the rules table\n',
    'docs/language/SPEC.md': '# spec\n',
    'docs/language/examples/README.md': '# examples\n',
    // CRLF line endings and no final newline, as cep's own comments.cep.
    'docs/language/examples/torture/comments.cep': 'language cep/0.1;\r\n-- a comment\r\nstream A (x string);',
    'docs/language/examples/torture/lexical.cep': "language cep/0.1;\nstream B (s string);\n",
    'docs/language/invalid/README.md': '# invalid\n',
    'docs/language/invalid/e-dur-001-bare-integer-duration.cep': '-- not one of the seven\n',
  };
  for (const n of EXAMPLES) files[`docs/language/examples/${n}`] = `language cep/0.1;\n-- ${n}\n`;
  for (const n of INVALID) files[`docs/language/invalid/${n}`] = `language cep/0.1;\n-- ${n}\n`;
  return files;
}
function makeCep(files = cepFiles()) {
  const dir = newRepo('cep');
  for (const [rel, content] of Object.entries(files)) write(dir, rel, content);
  commitAll(dir, 'cep');
  return dir;
}
// The cep path each output path is copied from.
function sourceOf(dest) {
  const [, kind, name] = /^test\/(upstream|fixtures\/[a-z]+)\/([^/]+)$/.exec(dest);
  return {
    upstream: `internal/parser/${name}`,
    'fixtures/examples': `docs/language/examples/${name}`,
    'fixtures/torture': `docs/language/examples/torture/${name}`,
    'fixtures/invalid': `docs/language/invalid/${name}`,
  }[kind];
}
const EXPECTED_OUT = [
  'test/upstream/keywords.go',
  'test/upstream/lexer.go',
  'test/upstream/SOURCE',
  ...EXAMPLES.map((n) => `test/fixtures/examples/${n}`),
  ...TORTURE.map((n) => `test/fixtures/torture/${n}`),
  ...INVALID.map((n) => `test/fixtures/invalid/${n}`),
].sort();
const sourceLine = (cep, ref) =>
  `VORSAR/cep ${git(cep, 'rev-parse', `${ref}^{commit}`).trim()} ${git(cep, 'log', '-1', '--format=%cs', ref).trim()}\n`;
// Every file under out, other than SOURCE, equals the blob it was copied from at ref.
function assertCopiedFrom(out, cep, ref) {
  for (const rel of listFiles(out).filter((f) => f !== 'test/upstream/SOURCE')) {
    assert.ok(read(out, rel).equals(gitBytes(cep, 'cat-file', 'blob', `${ref}:${sourceOf(rel)}`)), `${rel} differs from ${ref}:${sourceOf(rel)}`);
  }
  assert.equal(read(out, 'test/upstream/SOURCE').toString(), sourceLine(cep, ref));
}
const NEXT = /^sync-upstream: next: npm test, then review every snapshot diff$/m;

describe('sync-upstream', () => {
  test('passes, writing exactly the copy set, SOURCE and the next line', () => {
    const cep = makeCep();
    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, NEXT);
    assert.deepEqual(listFiles(out), EXPECTED_OUT);
    for (const rel of EXPECTED_OUT) assert.match(r.out, new RegExp(`^sync-upstream: wrote ${re(rel)}$`, 'm'));
    assert.equal(read(out, 'test/upstream/SOURCE').toString(), sourceLine(cep, 'main'));
    assert.match(read(out, 'test/upstream/SOURCE').toString(), /^VORSAR\/cep [0-9a-f]{40} \d{4}-\d{2}-\d{2}\n$/);
    assertCopiedFrom(out, cep, 'main');
  });

  test('reads the ref, not the working tree or the checked-out branch', () => {
    const cep = newRepo('cep');
    const files = {
      'internal/parser/keywords.go': 'package parser // main\n',
      'internal/parser/lexer.go': 'package parser // main lexer\n',
      'docs/language/examples/01-crlf.cep': 'language cep/0.1;\r\n-- crlf\r\nstream A (x string);',
    };
    for (const n of INVALID) files[`docs/language/invalid/${n}`] = `-- ${n} on main\n`;
    for (const [rel, content] of Object.entries(files)) write(cep, rel, content);
    commitAll(cep, 'main');
    git(cep, 'checkout', '-q', '-b', 'other');
    for (const rel of Object.keys(files)) write(cep, rel, `${files[rel]}changed on other\n`);
    commitAll(cep, 'other');
    write(cep, 'internal/parser/keywords.go', 'uncommitted\n');
    write(cep, 'docs/language/examples/99-untracked.cep', 'untracked\n');

    const crlf = gitBytes(cep, 'cat-file', 'blob', 'main:docs/language/examples/01-crlf.cep');
    assert.ok(crlf.includes('\r\n') && !crlf.toString().endsWith('\n'), 'the world has a CRLF fixture with no final newline');

    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, NEXT);
    assert.deepEqual(listFiles(out), [
      'test/fixtures/examples/01-crlf.cep',
      ...INVALID.map((n) => `test/fixtures/invalid/${n}`),
      'test/upstream/SOURCE',
      'test/upstream/keywords.go',
      'test/upstream/lexer.go',
    ].sort());
    assertCopiedFrom(out, cep, 'main');
  });

  test('uses main when --ref is omitted', () => {
    const cep = makeCep();
    git(cep, 'checkout', '-q', '-b', 'other');
    write(cep, 'internal/parser/keywords.go', 'package parser // other\n');
    write(cep, `docs/language/examples/${EXAMPLES[0]}`, '-- other\n');
    commitAll(cep, 'other');
    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--out', out]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, NEXT);
    assert.deepEqual(listFiles(out), EXPECTED_OUT);
    assertCopiedFrom(out, cep, 'main');
    assert.notEqual(read(out, 'test/upstream/keywords.go').toString(), 'package parser // other\n');
  });

  test('a second run after a passing first run changes nothing', () => {
    const cep = makeCep();
    const out = newDir('out');
    const first = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(first.status, 0, first.out);
    assert.match(first.out, NEXT);
    const before = Object.fromEntries(listFiles(out).map((f) => [f, read(out, f).toString('base64')]));
    const second = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(second.status, 0, second.out);
    assert.match(second.out, NEXT);
    assert.doesNotMatch(second.out, /^sync-upstream: wrote /m);
    const afterRun = Object.fromEntries(listFiles(out).map((f) => [f, read(out, f).toString('base64')]));
    assert.deepEqual(afterRun, before);
  });

  test('fails with no cep path', () => {
    const r = run('sync-upstream', []);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*cep clone/m);
  });

  test('fails on an unknown --ref, naming it', () => {
    const cep = makeCep();
    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--ref', 'no-such-ref', '--out', out]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*no-such-ref/m);
    assert.deepEqual(listFiles(out), []);
  });

  test('fails when an invalid fixture is missing upstream, naming it', () => {
    const files = cepFiles();
    delete files['docs/language/invalid/e-txt-001-unsuffixed-text-operator.cep'];
    const cep = makeCep(files);
    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*e-txt-001-unsuffixed-text-operator\.cep/m);
  });

  test('fails on an invalid file upstream that is neither vendored nor reviewed, naming only it, and writes nothing', () => {
    const files = cepFiles();
    files['docs/language/invalid/e-new-001-unreviewed.cep'] = 'language cep/0.1;\n-- new\n';
    const cep = makeCep(files);
    const out = newDir('out');
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*docs\/language\/invalid\/e-new-001-unreviewed\.cep/m);
    assert.doesNotMatch(r.out, /e-dur-001/);
    assert.deepEqual(listFiles(out), []);
  });

  test('--check fails on a new invalid file upstream that is neither vendored nor reviewed, naming it', () => {
    const cep = makeCep();
    const out = newDir('out');
    assert.equal(run('sync-upstream', [cep, '--ref', 'main', '--out', out]).status, 0);
    write(cep, 'docs/language/invalid/e-new-001-unreviewed.cep', 'language cep/0.1;\n-- new\n');
    commitAll(cep, 'a new invalid example');
    const clean = snapshot(out);
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out, '--check']);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*docs\/language\/invalid\/e-new-001-unreviewed\.cep/m);
    assert.deepEqual(snapshot(out), clean);
  });

  test('fails on a stale fixture, naming it, and deletes nothing', () => {
    const cep = makeCep();
    const out = newDir('out');
    write(out, 'test/fixtures/examples/99-stale.cep', 'stale\n');
    write(out, `test/fixtures/examples/${EXAMPLES[0]}.snap`, 'a snapshot\n');
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*test\/fixtures\/examples\/99-stale\.cep/m);
    assert.doesNotMatch(r.out, /\.cep\.snap/);
    assert.equal(read(out, 'test/fixtures/examples/99-stale.cep').toString(), 'stale\n');
    assert.equal(read(out, `test/fixtures/examples/${EXAMPLES[0]}.snap`).toString(), 'a snapshot\n');
  });

  test('--check passes after a sync, fails on one flipped byte, and writes nothing', () => {
    const cep = makeCep();
    const out = newDir('out');
    const sync = run('sync-upstream', [cep, '--ref', 'main', '--out', out]);
    assert.equal(sync.status, 0, sync.out);
    const sha = git(cep, 'rev-parse', 'main').trim();

    const clean = snapshot(out);
    const ok = run('sync-upstream', [cep, '--ref', 'main', '--out', out, '--check']);
    assert.equal(ok.status, 0, ok.out);
    assert.match(ok.out, new RegExp(`^sync-upstream: ok \\(22 files match ${sha}\\)$`, 'm'));
    assert.deepEqual(snapshot(out), clean);

    const flipped = read(out, 'test/fixtures/torture/comments.cep');
    flipped[0] ^= 1;
    write(out, 'test/fixtures/torture/comments.cep', flipped);
    const dirty = snapshot(out);
    const bad = run('sync-upstream', [cep, '--ref', 'main', '--out', out, '--check']);
    assert.equal(bad.status, 1, bad.out);
    assert.match(bad.out, /^sync-upstream: .*test\/fixtures\/torture\/comments\.cep/m);
    assert.doesNotMatch(bad.out, /files match/);
    assert.deepEqual(snapshot(out), dirty);
  });

  test('--check names a missing file and does not restore it', () => {
    const cep = makeCep();
    const out = newDir('out');
    assert.equal(run('sync-upstream', [cep, '--ref', 'main', '--out', out]).status, 0);
    fs.rmSync(path.join(out, 'test', 'upstream', 'lexer.go'));
    const r = run('sync-upstream', [cep, '--ref', 'main', '--out', out, '--check']);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^sync-upstream: .*test\/upstream\/lexer\.go/m);
    assert.equal(exists(out, 'test/upstream/lexer.go'), false);
  });
});

// ---------------------------------------------------------------------------------------------

describe('check-upstream', () => {
  const KEYWORDS = Buffer.from('package parser\n\nvar keywordList = []string{\n\t"select",\n}\n');
  const LEXER = Buffer.from('package parser\n\n// the rules table\n');
  const SOURCE = `VORSAR/cep ${'a'.repeat(40)} 2026-11-08`;
  const dataUrl = (buf) => `data:application/octet-stream;base64,${buf.toString('base64')}`;
  function localDir({ keywords = KEYWORDS, lexer = LEXER, source = `${SOURCE}\n` } = {}) {
    const dir = newDir('upstream');
    if (keywords !== null) write(dir, 'keywords.go', keywords);
    if (lexer !== null) write(dir, 'lexer.go', lexer);
    if (source !== null) write(dir, 'SOURCE', source);
    return dir;
  }
  const check = (local, keywordsUrl, lexerUrl) =>
    runAsync('check-upstream', ['--local', local, '--url-keywords', keywordsUrl, '--url-lexer', lexerUrl]);
  const differs = (file) =>
    new RegExp(`^check-upstream: cep main's ${re(file)} differs from .* \\(synced at ${re(SOURCE)}\\); run sync-upstream, update the grammar, review the snapshots$`, 'm');

  test('passes when both files are the same bytes', async () => {
    const r = await check(localDir(), dataUrl(KEYWORDS), dataUrl(LEXER));
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`^check-upstream: ok \\(keywords\\.go and lexer\\.go match ${re(SOURCE)}\\)$`, 'm'));
  });

  test('fails on a changed keywords.go, naming it', async () => {
    const r = await check(localDir(), dataUrl(Buffer.from('package parser // changed\n')), dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, differs('keywords.go'));
    assert.doesNotMatch(r.out, /lexer\.go differs/);
  });

  test('fails on a changed lexer.go, naming it', async () => {
    const r = await check(localDir(), dataUrl(KEYWORDS), dataUrl(Buffer.from('package parser // changed\n')));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, differs('lexer.go'));
    assert.doesNotMatch(r.out, /keywords\.go differs/);
  });

  test('fails on the same bytes plus a final newline', async () => {
    const r = await check(localDir(), dataUrl(Buffer.concat([KEYWORDS, Buffer.from('\n')])), dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, differs('keywords.go'));
  });

  test('fails on a refused connection, naming the url', async () => {
    const probe = net.createServer();
    await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
    const { port } = probe.address();
    await new Promise((resolve) => probe.close(resolve));
    const url = `http://127.0.0.1:${port}/keywords.go`;
    const r = await check(localDir(), url, dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-upstream: could not fetch ${re(url)}: .+`, 'm'));
  });

  test('fails on a 404, naming the status', async () => {
    const server = http.createServer((req, res) => {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found\n');
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const url = `http://127.0.0.1:${server.address().port}/lexer.go`;
      const r = await check(localDir(), dataUrl(KEYWORDS), url);
      assert.equal(r.status, 1, r.out);
      assert.match(r.out, new RegExp(`^check-upstream: could not fetch ${re(url)}: .*404`, 'm'));
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  });

  test('fails when a local file is missing, naming it', async () => {
    const dir = localDir({ lexer: null });
    const r = await check(dir, dataUrl(KEYWORDS), dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-upstream: .*${re(path.join(dir, 'lexer.go'))}`, 'm'));
  });

  test('fails when SOURCE is missing, naming it', async () => {
    const dir = localDir({ source: null });
    const r = await check(dir, dataUrl(KEYWORDS), dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-upstream: .*${re(path.join(dir, 'SOURCE'))}`, 'm'));
  });

  test('fails when SOURCE is not one "VORSAR/cep <sha> <date>" line, naming it', async () => {
    const dir = localDir({ source: 'VORSAR/cep main\n' });
    const r = await check(dir, dataUrl(KEYWORDS), dataUrl(LEXER));
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-upstream: .*${re(path.join(dir, 'SOURCE'))}`, 'm'));
  });
});

// ---------------------------------------------------------------------------------------------

describe('check-fixtures', () => {
  function fixturesRepo() {
    const dir = newRepo('fixtures');
    write(dir, '.gitignore', '.DS_Store\n');
    for (const [folder, names] of [['examples', EXAMPLES], ['torture', TORTURE], ['invalid', INVALID]]) {
      for (const n of names) {
        write(dir, `test/fixtures/${folder}/${n}`, `-- ${n}\n`);
        write(dir, `test/fixtures/${folder}/${n}.snap`, `>-- ${n}\n`);
      }
    }
    commitAll(dir, 'fixtures');
    return dir;
  }
  const check = (root) => run('check-fixtures', ['--root', root]);
  const OK = /^check-fixtures: ok \(20 fixtures, 20 tracked snapshots\)$/m;

  test('passes on 10 + 2 + 8 tracked pairs', () => {
    const r = check(fixturesRepo());
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, OK);
  });

  test('fails when a committed snapshot is removed with a plain rm, naming it', () => {
    const dir = fixturesRepo();
    fs.rmSync(path.join(dir, 'test', 'fixtures', 'examples', `${EXAMPLES[0]}.snap`));
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-fixtures: .*test/fixtures/examples/${re(EXAMPLES[0])}\\.snap`, 'm'));
  });

  test('fails on an untracked snapshot, naming it', () => {
    const dir = fixturesRepo();
    git(dir, 'rm', '-q', '--cached', 'test/fixtures/torture/lexical.cep.snap');
    assert.ok(exists(dir, 'test/fixtures/torture/lexical.cep.snap'));
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-fixtures: .*test\/fixtures\/torture\/lexical\.cep\.snap.*not tracked/m);
  });

  test('fails on an orphan snapshot, naming it', () => {
    const dir = fixturesRepo();
    write(dir, 'test/fixtures/invalid/zz-orphan.cep.snap', '>orphan\n');
    commitAll(dir, 'orphan');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-fixtures: .*test\/fixtures\/invalid\/zz-orphan\.cep\.snap/m);
  });

  test('fails on 19 fixtures, naming the short folder', () => {
    const dir = fixturesRepo();
    git(dir, 'rm', '-q', 'test/fixtures/invalid/e-res-001-group-by.cep', 'test/fixtures/invalid/e-res-001-group-by.cep.snap');
    commitAll(dir, 'drop one');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-fixtures: .*test\/fixtures\/invalid has 7 \.cep files, expected 8/m);
  });

  test('fails on 11 + 1 + 8, naming examples', () => {
    const dir = fixturesRepo();
    git(dir, 'mv', 'test/fixtures/torture/lexical.cep', 'test/fixtures/examples/lexical.cep');
    git(dir, 'mv', 'test/fixtures/torture/lexical.cep.snap', 'test/fixtures/examples/lexical.cep.snap');
    commitAll(dir, 'move one');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-fixtures: .*test\/fixtures\/examples has 11 \.cep files, expected 10/m);
  });

  test('fails on an extra file, naming it', () => {
    const dir = fixturesRepo();
    write(dir, 'test/fixtures/examples/notes.txt', 'notes\n');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-fixtures: .*test\/fixtures\/examples\/notes\.txt/m);
  });

  test('passes with an ignored .DS_Store in a fixture folder', () => {
    const dir = fixturesRepo();
    write(dir, 'test/fixtures/examples/.DS_Store', 'finder\n');
    const r = check(dir);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, OK);
  });

  test('fails in a directory that is not a git repo, naming it', () => {
    const dir = newDir('plain');
    write(dir, `test/fixtures/examples/${EXAMPLES[0]}`, '-- x\n');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-fixtures: .*${re(dir)}`, 'm'));
  });
});

// ---------------------------------------------------------------------------------------------

describe('check-vsix', () => {
  const S4 = [
    'extension.vsixmanifest',
    '[Content_Types].xml',
    'extension/package.json',
    'extension/readme.md',
    'extension/changelog.md',
    'extension/LICENSE.txt',
    'extension/language-configuration.json',
    'extension/syntaxes/cep.tmLanguage.json',
  ];
  // A minimal stored (uncompressed) zip with the given names, built here so the test needs no tool.
  function zip(names, comment = '') {
    const parts = [];
    const central = [];
    let offset = 0;
    for (const name of names) {
      const nameBytes = Buffer.from(name, 'utf8');
      const data = Buffer.from(`content of ${name}\n`);
      const crc = zlib.crc32(data);
      const local = Buffer.alloc(30);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0x0800, 6);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(data.length, 18);
      local.writeUInt32LE(data.length, 22);
      local.writeUInt16LE(nameBytes.length, 26);
      parts.push(local, nameBytes, data);
      const entry = Buffer.alloc(46);
      entry.writeUInt32LE(0x02014b50, 0);
      entry.writeUInt16LE(20, 4);
      entry.writeUInt16LE(20, 6);
      entry.writeUInt16LE(0x0800, 8);
      entry.writeUInt32LE(crc, 16);
      entry.writeUInt32LE(data.length, 20);
      entry.writeUInt32LE(data.length, 24);
      entry.writeUInt16LE(nameBytes.length, 28);
      entry.writeUInt32LE(offset, 42);
      central.push(entry, nameBytes);
      offset += 30 + nameBytes.length + data.length;
    }
    const directory = Buffer.concat(central);
    const commentBytes = Buffer.from(comment, 'utf8');
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(names.length, 8);
    end.writeUInt16LE(names.length, 10);
    end.writeUInt32LE(directory.length, 12);
    end.writeUInt32LE(offset, 16);
    end.writeUInt16LE(commentBytes.length, 20);
    return Buffer.concat([...parts, directory, end, commentBytes]);
  }
  function vsix(bytes, name = 'cep-0.1.0.vsix') {
    const file = path.join(newDir('vsix'), name);
    fs.writeFileSync(file, bytes);
    return file;
  }
  const OK = /^check-vsix: ok \(8 files\)$/m;

  test('passes on the S4 set', () => {
    const r = run('check-vsix', [vsix(zip(S4))]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, OK);
  });

  test('passes on the S4 set with an archive comment', () => {
    const r = run('check-vsix', [vsix(zip(S4, 'an archive comment, '.repeat(50)))]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, OK);
  });

  test('fails on an empty zip, naming the problem', () => {
    const file = vsix(zip([]));
    const r = run('check-vsix', [file]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-vsix: ${re(file)} is empty`, 'm'));
    assert.match(r.out, new RegExp(`^check-vsix: ${re(file)} is missing extension/package\\.json$`, 'm'));
  });

  test('fails on an extra file, naming it', () => {
    const file = vsix(zip([...S4, 'extension/test/fixtures/examples/01-example.cep']));
    const r = run('check-vsix', [file]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-vsix: ${re(file)} has an extra file extension/test/fixtures/examples/01-example\\.cep$`, 'm'));
  });

  test('fails on a missing file, naming it', () => {
    const file = vsix(zip(S4.filter((n) => n !== 'extension/LICENSE.txt')));
    const r = run('check-vsix', [file]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-vsix: ${re(file)} is missing extension/LICENSE\\.txt$`, 'm'));
  });

  test('fails on a file that is not a zip, naming it', () => {
    const file = vsix(Buffer.from('this is not a zip file\n'));
    const r = run('check-vsix', [file]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-vsix: ${re(file)} is not a zip`, 'm'));
  });

  test('fails on a path that does not exist, naming it', () => {
    const file = path.join(base, 'absent', 'cep-0.1.0.vsix');
    const r = run('check-vsix', [file]);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-vsix: .*${re(file)}`, 'm'));
  });

  test('defaults to cep-<version>.vsix in --root, with the version from its package.json', () => {
    const root = newDir('root');
    write(root, 'package.json', JSON.stringify({ name: 'cep', version: '9.9.9' }));
    write(root, 'cep-0.1.0.vsix', zip(S4));
    const stale = run('check-vsix', ['--root', root]);
    assert.equal(stale.status, 1, stale.out);
    assert.match(stale.out, new RegExp(`^check-vsix: .*${re(path.join(root, 'cep-9.9.9.vsix'))}`, 'm'));
    write(root, 'cep-9.9.9.vsix', zip(S4));
    const r = run('check-vsix', ['--root', root]);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, OK);
  });
});

// ---------------------------------------------------------------------------------------------

describe('check-clean', () => {
  function cleanRepo() {
    const dir = newRepo('clean');
    write(dir, '.gitignore', '*.vsix\n.DS_Store\n');
    write(dir, 'a.txt', 'a\n');
    commitAll(dir, 'clean');
    return dir;
  }
  const check = (root) => run('check-clean', ['--root', root]);

  test('passes on a clean repo, ignoring ignored files', () => {
    const dir = cleanRepo();
    write(dir, 'cep-0.1.0.vsix', 'ignored\n');
    const r = check(dir);
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, /^check-clean: ok$/m);
  });

  test('fails on an untracked file, naming it', () => {
    const dir = cleanRepo();
    write(dir, 'test/fixtures/examples/new.cep.snap', 'written by a run\n');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-clean: .*test\/fixtures\/examples\/new\.cep\.snap/m);
  });

  test('fails on a changed file, naming it', () => {
    const dir = cleanRepo();
    write(dir, 'a.txt', 'changed\n');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, /^check-clean: .*a\.txt/m);
  });

  test('fails in a directory that is not a git repo, naming it', () => {
    const dir = newDir('plain');
    const r = check(dir);
    assert.equal(r.status, 1, r.out);
    assert.match(r.out, new RegExp(`^check-clean: .*${re(dir)}`, 'm'));
  });
});

// ---------------------------------------------------------------------------------------------
// ci.yml: a line-based reader for the block-YAML subset the workflow uses. It reads every line
// into a tree of maps, lists and scalars, and throws on any line it cannot place, so a construct
// it does not understand (a `run: |` block, an anchor, odd indentation) fails instead of hiding.

function readWorkflow(text) {
  const cannot = (n, line) => new Error(`ci.yml: cannot place line ${n}: ${line.trim()}`);
  function scalar(s, n, line) {
    if (s.startsWith('"')) {
      const m = /^("(?:[^"\\]|\\.)*")(?:\s+#.*)?$/.exec(s);
      if (!m) throw cannot(n, line);
      return JSON.parse(m[1]);
    }
    if (s.startsWith("'")) {
      const m = /^'((?:[^']|'')*)'(?:\s+#.*)?$/.exec(s);
      if (!m) throw cannot(n, line);
      return m[1].replaceAll("''", "'");
    }
    const plain = s.replace(/\s+#.*$/, '').trim();
    if (plain === '' || plain.startsWith('#')) return null;
    if (plain.startsWith('[')) {
      const m = /^\[([^[\]{}]*)\]$/.exec(plain);
      if (!m) throw cannot(n, line);
      return m[1].split(',').map((x) => x.trim()).filter((x) => x !== '').map((x) => scalar(x, n, line));
    }
    if (/^[{|>&*!%@`]/.test(plain) || /:(\s|$)/.test(plain)) throw cannot(n, line);
    return plain;
  }

  const tokens = [];
  text.split('\n').forEach((raw, i) => {
    const n = i + 1;
    const line = raw.replace(/\r$/, '');
    if (/^\s*(#.*)?$/.test(line)) return;
    if (/^ *\t/.test(line)) throw cannot(n, line);
    let indent = /^ */.exec(line)[0].length;
    let rest = line.slice(indent);
    let dashed = false;
    if (/^-( |$)/.test(rest)) {
      tokens.push({ n, line, indent, dash: true });
      const after = rest.slice(1);
      rest = after.trimStart();
      indent += 1 + after.length - rest.length;
      dashed = true;
      if (rest === '') throw cannot(n, line);
    }
    const m = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/.exec(rest);
    if (m) tokens.push({ n, line, indent, key: m[1], value: m[2] === undefined ? null : scalar(m[2], n, line) });
    else if (dashed) tokens.push({ n, line, indent, scalar: scalar(rest, n, line) });
    else throw cannot(n, line);
  });

  let pos = 0;
  function block() {
    return tokens[pos].dash ? list(tokens[pos].indent) : map(tokens[pos].indent);
  }
  function map(indent) {
    const out = {};
    while (pos < tokens.length && tokens[pos].indent >= indent) {
      const t = tokens[pos];
      if (t.indent > indent || t.dash || t.key === undefined || Object.hasOwn(out, t.key)) throw cannot(t.n, t.line);
      pos += 1;
      if (t.value !== null) out[t.key] = t.value;
      else if (pos < tokens.length && tokens[pos].indent > indent) out[t.key] = block();
      else out[t.key] = null;
    }
    return out;
  }
  function list(indent) {
    const out = [];
    while (pos < tokens.length && tokens[pos].indent >= indent) {
      const t = tokens[pos];
      if (t.indent > indent || !t.dash) throw cannot(t.n, t.line);
      pos += 1;
      const item = tokens[pos];
      if (item.scalar !== undefined) {
        out.push(item.scalar);
        pos += 1;
      } else {
        out.push(map(item.indent));
      }
    }
    return out;
  }
  if (tokens.length === 0) throw new Error('ci.yml: empty');
  const tree = map(0);
  if (pos !== tokens.length) throw cannot(tokens[pos].n, tokens[pos].line);
  return tree;
}

const UPSTREAM_IF = "github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'";
const isMap = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const runSteps = (job) => (Array.isArray(job?.steps) ? job.steps : []).filter((s) => isMap(s) && Object.hasOwn(s, 'run')).map((s) => s.run);

// Every way the workflow departs from PLAN §5.6's contract, as one line each; [] when it holds.
function workflowProblems(text) {
  let wf;
  try {
    wf = readWorkflow(text);
  } catch (err) {
    return [err.message];
  }
  const problems = [];
  const on = wf.on;
  if (!isMap(on)) {
    problems.push('ci.yml: on: is missing or not a map');
  } else {
    for (const key of ['push', 'pull_request', 'schedule', 'workflow_dispatch']) {
      if (!Object.hasOwn(on, key)) problems.push(`ci.yml: on: has no ${key}`);
    }
    if (JSON.stringify(on.push?.branches) !== JSON.stringify(['main'])) problems.push('ci.yml: on.push.branches is not [main]');
  }
  const test = wf.jobs?.test;
  if (!isMap(test)) {
    problems.push('ci.yml: there is no test job');
  } else {
    if (Object.hasOwn(test, 'if')) problems.push(`ci.yml: the test job has an if: ${test.if}`);
    const runs = runSteps(test);
    if (JSON.stringify(runs) !== JSON.stringify(['npm ci', 'npm run gate'])) {
      problems.push(`ci.yml: the test job runs ${JSON.stringify(runs)}, not ["npm ci","npm run gate"]`);
    }
  }
  const upstream = wf.jobs?.upstream;
  if (!isMap(upstream)) {
    problems.push('ci.yml: there is no upstream job');
  } else {
    if (upstream.if !== UPSTREAM_IF) problems.push(`ci.yml: the upstream job's if: is ${JSON.stringify(upstream.if ?? null)}, not the schedule-or-dispatch condition`);
    const runs = runSteps(upstream);
    if (JSON.stringify(runs) !== JSON.stringify(['node scripts/check-upstream.mjs'])) {
      problems.push(`ci.yml: the upstream job runs ${JSON.stringify(runs)}, not ["node scripts/check-upstream.mjs"]`);
    }
  }
  return problems;
}

// PLAN v1's §5.6 workflow (commit 1c6143d), the red-first input of PLAN §6.4.
const PLAN_V1_WORKFLOW = `name: ci
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
      - run: npm test
      - run: npm run package
      - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9  # v7.0.2
        with:
          name: vsix
          path: "*.vsix"
  upstream:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
      - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1  # v7.1.0
        with:
          node-version-file: .nvmrc
      - run: node scripts/check-upstream.mjs
`;

describe('ci.yml', () => {
  const realWorkflow = () => fs.readFileSync(path.join(repoRoot, '.github', 'workflows', 'ci.yml'), 'utf8');
  function mutate(text, from, to) {
    const out = text.replace(from, to);
    assert.notEqual(out, text, `the mutation found ${from}`);
    return out;
  }

  test('the test job runs npm ci then npm run gate, and upstream runs only on schedule or by hand', () => {
    assert.deepEqual(workflowProblems(realWorkflow()), []);
  });

  test('every action is pinned to a full commit SHA', () => {
    const wf = readWorkflow(realWorkflow());
    const uses = Object.values(wf.jobs).flatMap((job) => job.steps.filter((s) => Object.hasOwn(s, 'uses')).map((s) => s.uses));
    assert.ok(uses.length > 0);
    for (const u of uses) assert.match(u, /^[\w.-]+\/[\w.-]+@[0-9a-f]{40}$/, u);
  });

  test("the contract rejects PLAN v1's workflow", () => {
    const problems = workflowProblems(PLAN_V1_WORKFLOW);
    assert.ok(problems.some((p) => /test job runs \["npm ci","npm test","npm run package"\]/.test(p)), problems.join('\n'));
    assert.ok(problems.some((p) => /upstream job's if:/.test(p)), problems.join('\n'));
  });

  test('the contract rejects the workflow with pull_request dropped', () => {
    const problems = workflowProblems(mutate(realWorkflow(), /^ {2}pull_request:\n/m, ''));
    assert.ok(problems.some((p) => /on: has no pull_request/.test(p)), problems.join('\n'));
  });

  test('the contract rejects an if: on the test job', () => {
    const problems = workflowProblems(mutate(realWorkflow(), /^( {2}test:\n)/m, "$1    if: github.event_name == 'push'\n"));
    assert.ok(problems.some((p) => /test job has an if:/.test(p)), problems.join('\n'));
  });

  test('the contract rejects the workflow with the upstream step removed', () => {
    const problems = workflowProblems(mutate(realWorkflow(), /^ {6}- run: node scripts\/check-upstream\.mjs\n/m, ''));
    assert.ok(problems.some((p) => /upstream job runs \[\]/.test(p)), problems.join('\n'));
  });

  test('the reader fails on a line it cannot place', () => {
    const block = mutate(realWorkflow(), /^( {6})- run: npm run gate\n/m, '$1- run: |\n$1    npm run gate\n');
    assert.ok(workflowProblems(block).some((p) => /cannot place line \d+/.test(p)), 'a run: | block');
    const indented = mutate(realWorkflow(), /^( {2})pull_request:\n/m, '$1 pull_request:\n');
    assert.ok(workflowProblems(indented).some((p) => /cannot place line \d+/.test(p)), 'an odd indent');
  });
});
