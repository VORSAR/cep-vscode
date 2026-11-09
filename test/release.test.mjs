// Tests for the release path: scripts/check-release.mjs and .github/workflows/release.yml (PLAN §5.6.1).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repo = path.join(import.meta.dirname, '..');
const script = path.join(repo, 'scripts', 'check-release.mjs');

function run(args) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  return { status: r.status, out: r.stdout + r.stderr };
}

// A temporary root with a package.json, a CHANGELOG and (optionally) the .vsix.
function root({ version = '1.2.3', changelog, vsix = true } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cep-release-'));
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'cep', version }));
  fs.writeFileSync(
    path.join(dir, 'CHANGELOG.md'),
    changelog ?? `# Changelog\n\n## ${version}\n\n- One change.\n- Another.\n\n## 0.0.1\n\n- Older.\n`,
  );
  if (vsix) fs.writeFileSync(path.join(dir, `cep-${version}.vsix`), 'zip');
  return dir;
}

test('a matching tag passes and writes the notes of that version only', () => {
  const dir = root();
  const notes = path.join(dir, 'notes.md');
  const r = run(['--ref', 'v1.2.3', '--ref-type', 'tag', '--notes', notes, '--root', dir]);
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /^check-release: ok \(v1\.2\.3, notes 2 lines\)/m);
  assert.equal(fs.readFileSync(notes, 'utf8'), '- One change.\n- Another.\n');
});

test('a tag that differs from package.json fails, naming both', () => {
  const r = run(['--ref', 'v1.2.4', '--ref-type', 'tag', '--notes', '/dev/null', '--root', root()]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-release: .*v1\.2\.4.*1\.2\.3/m);
});

test('a missing CHANGELOG section fails, naming the version', () => {
  const dir = root({ changelog: '# Changelog\n\n## 0.0.1\n\n- Older.\n' });
  const r = run(['--ref', 'v1.2.3', '--ref-type', 'tag', '--notes', '/dev/null', '--root', dir]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-release: .*CHANGELOG.*1\.2\.3/m);
});

test('an empty CHANGELOG section fails', () => {
  const dir = root({ changelog: '# Changelog\n\n## 1.2.3\n\n## 0.0.1\n\n- Older.\n' });
  const r = run(['--ref', 'v1.2.3', '--ref-type', 'tag', '--notes', '/dev/null', '--root', dir]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-release: .*1\.2\.3/m);
});

test('a missing .vsix fails, naming it', () => {
  const r = run(['--ref', 'v1.2.3', '--ref-type', 'tag', '--notes', '/dev/null', '--root', root({ vsix: false })]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-release: .*cep-1\.2\.3\.vsix/m);
});

test('a dispatch from main passes; from another branch it fails', () => {
  const dir = root();
  const ok = run(['--ref', 'main', '--ref-type', 'branch', '--notes', path.join(dir, 'n.md'), '--root', dir]);
  assert.equal(ok.status, 0, ok.out);
  assert.match(ok.out, /^check-release: ok \(v1\.2\.3/m);
  const bad = run(['--ref', 'feature', '--ref-type', 'branch', '--notes', '/dev/null', '--root', dir]);
  assert.equal(bad.status, 1, bad.out);
  assert.match(bad.out, /^check-release: .*feature/m);
});

test('a missing --ref fails', () => {
  const r = run(['--notes', '/dev/null', '--root', root()]);
  assert.equal(r.status, 1, r.out);
  assert.match(r.out, /^check-release: .*--ref/m);
});

// A small reader for the subset of YAML that release.yml uses. It throws on any line it cannot place.
export function readYaml(text) {
  const out = { on: {}, permissions: {}, jobs: {} };
  const lines = text.split('\n');
  const path = [];
  let step = null;
  for (const [n, raw] of lines.entries()) {
    const line = raw.replace(/\s+#.*$/, '').replace(/\s+$/, '');
    if (line === '' || line.trimStart().startsWith('#')) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    while (path.length && path[path.length - 1].indent >= indent) path.pop();
    const keys = path.map((p) => p.key);
    const m = body.match(/^(- )?([A-Za-z_][\w-]*):(?: (.*))?$/);
    if (!m) throw new Error(`release.yml line ${n + 1}: cannot place ${JSON.stringify(raw)}`);
    const [, dash, key, value] = m;
    if (dash) {
      if (keys.at(-1) !== 'steps') throw new Error(`release.yml line ${n + 1}: list item outside steps`);
      step = {};
      out.jobs[keys[1]].steps.push(step);
    }
    if (keys[0] === 'jobs' && keys.length >= 3 && keys[2] === 'steps' && step) {
      if (value !== undefined) step[key] = value.replace(/^"(.*)"$/, '$1');
      path.push({ key: dash ? 'steps' : key, indent: dash ? indent + 1 : indent });
      continue;
    }
    if (keys.length === 0) {
      if (!['name', 'on', 'permissions', 'jobs'].includes(key)) throw new Error(`release.yml line ${n + 1}: unknown top-level key ${key}`);
    } else if (keys[0] === 'on') {
      if (keys.length === 1) out.on[key] = value ?? {};
      else if (keys[1] === 'push' && key === 'tags') out.on.push = { tags: value };
    } else if (keys[0] === 'permissions') {
      out.permissions[key] = value;
    } else if (keys[0] === 'jobs') {
      if (keys.length === 1) out.jobs[key] = { permissions: {}, steps: [], if: undefined };
      else if (keys.length === 2 && key === 'if') out.jobs[keys[1]].if = value;
      else if (keys.length === 3 && keys[2] === 'permissions') out.jobs[keys[1]].permissions[key] = value;
    }
    path.push({ key, indent });
  }
  return out;
}

function checkReleaseYaml(text) {
  const y = readYaml(text);
  const problems = [];
  if (!y.on.push || y.on.push.tags !== '["v*"]') problems.push('trigger: push tags ["v*"]');
  if (!('workflow_dispatch' in y.on)) problems.push('trigger: workflow_dispatch');
  if (Object.keys(y.on).some((k) => !['push', 'workflow_dispatch'].includes(k))) problems.push('no other trigger');
  if (JSON.stringify(y.permissions) !== JSON.stringify({ contents: 'read' })) problems.push('top-level permissions: contents read only');
  const job = y.jobs.release;
  if (!job) return [...problems, 'a job named release'];
  if (job.permissions.contents !== 'write') problems.push('release job: contents write');
  const runs = job.steps.filter((s) => s.run).map((s) => s.run);
  const want = [
    'npm ci',
    'npm run gate',
    'node scripts/check-release.mjs --ref "$GITHUB_REF_NAME" --ref-type "$GITHUB_REF_TYPE" --notes release-notes.md',
  ];
  for (const [i, w] of want.entries()) if (runs[i] !== w) problems.push(`run step ${i + 1}: ${w}`);
  const gh = job.steps.find((s) => s.run && s.run.startsWith('gh release create'));
  if (!gh) problems.push('a gh release create step');
  else if (gh.if !== "github.event_name == 'push'") problems.push("gh step guarded by github.event_name == 'push'");
  if (runs.length !== 4) problems.push('exactly four run steps');
  return problems;
}

const releaseYml = path.join(repo, '.github', 'workflows', 'release.yml');

test('release.yml has the triggers, permissions and steps of PLAN §5.6.1', () => {
  const problems = checkReleaseYaml(fs.readFileSync(releaseYml, 'utf8'));
  assert.deepEqual(problems, []);
});

test('the release.yml check goes red without the push guard or with write at the top', () => {
  const text = fs.readFileSync(releaseYml, 'utf8');
  const noGuard = text.replace(/^\s*- if: github\.event_name == 'push'\n\s*run:/m, '      - run:');
  assert.notEqual(noGuard, text, 'the guard line was found and removed');
  assert.ok(checkReleaseYaml(noGuard).some((p) => p.includes('guarded')));
  const topWrite = text.replace(/^permissions:\n {2}contents: read$/m, 'permissions:\n  contents: write');
  assert.notEqual(topWrite, text, 'the top-level permission was found and changed');
  assert.ok(checkReleaseYaml(topWrite).some((p) => p.includes('top-level')));
});

test('the YAML reader fails on a line it cannot place', () => {
  assert.throws(() => readYaml('name: release\n  ??? not yaml\n'), /cannot place/);
});
