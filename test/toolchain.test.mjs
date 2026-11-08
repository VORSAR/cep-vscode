// Tests for scripts/check-toolchain.mjs: Node must equal the version pinned in .nvmrc.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const script = path.join(import.meta.dirname, '..', 'scripts', 'check-toolchain.mjs');

function run(args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
}

function nvmrc(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cep-toolchain-'));
  const file = path.join(dir, '.nvmrc');
  fs.writeFileSync(file, content);
  return file;
}

test('passes when node equals .nvmrc', () => {
  const r = run(['--nvmrc', nvmrc('26.13.0\n'), '--node', '26.13.0']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^check-toolchain: ok \(node 26\.13\.0\)/m);
});

test('accepts a leading v in .nvmrc and in --node', () => {
  const r = run(['--nvmrc', nvmrc('v26.13.0'), '--node', 'v26.13.0']);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^check-toolchain: ok/m);
});

test('fails when node differs from .nvmrc, naming both versions', () => {
  const r = run(['--nvmrc', nvmrc('26.13.0\n'), '--node', '26.12.1']);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-toolchain: .*26\.12\.1.*26\.13\.0/m);
});

test('fails when .nvmrc is missing, naming the path', () => {
  const missing = path.join(os.tmpdir(), 'cep-toolchain-absent', '.nvmrc');
  const r = run(['--nvmrc', missing, '--node', '26.13.0']);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-toolchain: .*cep-toolchain-absent/m);
});

test('fails when .nvmrc is not an exact version', () => {
  for (const bad of ['26', 'lts/*', '26.13', '']) {
    const r = run(['--nvmrc', nvmrc(bad), '--node', '26.13.0']);
    assert.equal(r.status, 1, `${JSON.stringify(bad)}: ${r.out}`);
    assert.match(r.out, /^check-toolchain: /m, JSON.stringify(bad));
  }
});
