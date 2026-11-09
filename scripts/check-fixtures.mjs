// check-fixtures: fail unless test/fixtures holds exactly the 20 fixtures, each with a tracked snapshot.
// Usage: node scripts/check-fixtures.mjs [--root <dir>]
// The snapshot tool writes a missing .cep.snap and passes; this is the guard it lacks. --root
// (default: this repo's root) exists for the tests.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-fixtures';
const fail = (...lines) => {
  for (const line of lines) console.error(`${name}: ${line}`);
  process.exit(1);
};

const args = process.argv.slice(2);
let root = path.join(import.meta.dirname, '..');
for (let i = 0; i < args.length; i++) {
  if (args[i] !== '--root') fail(`unknown argument ${args[i]}`);
  if (i + 1 >= args.length) fail('--root needs a value');
  root = args[++i];
}

// The .cep count each folder must hold. A total of 20 is not enough.
const COUNTS = { examples: 10, torture: 2, invalid: 8 };

function lsFiles(gitArgs) {
  try {
    const out = execFileSync('git', ['-C', root, 'ls-files', '-z', ...gitArgs, '--', 'test/fixtures'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
    return out.split('\0').filter(Boolean);
  } catch (err) {
    const detail = err.stderr?.trim() || (err.status == null ? err.message : `git exited ${err.status}`);
    return fail(`git ls-files failed in ${root}: ${detail}`);
  }
}

// Candidates: tracked or untracked and not ignored, and on disk (ls-files still lists a deleted tracked file).
const present = new Set(lsFiles(['--cached', '--others', '--exclude-standard']).filter((p) => fs.existsSync(path.join(root, p))));
// Tracked: in the index, staged or committed.
const tracked = new Set(lsFiles(['--cached']));

const FIXTURE = /^test\/fixtures\/(examples|torture|invalid)\/[^/]+\.cep$/;
const SNAPSHOT = /^test\/fixtures\/(examples|torture|invalid)\/[^/]+\.cep\.snap$/;
const problems = [];
const counts = { examples: 0, torture: 0, invalid: 0 };
let fixtures = 0;
let snapshots = 0;

for (const p of [...present].sort()) {
  const fixture = FIXTURE.exec(p);
  const snapshot = SNAPSHOT.exec(p);
  if (fixture) {
    counts[fixture[1]] += 1;
    fixtures += 1;
    const snap = `${p}.snap`;
    if (!present.has(snap)) problems.push(`${p} has no snapshot ${snap}`);
    else if (!tracked.has(snap)) problems.push(`${snap} is not tracked; review it, then git add it`);
    else snapshots += 1;
  } else if (snapshot) {
    const cep = p.slice(0, -'.snap'.length);
    if (!present.has(cep)) problems.push(`${p} has no ${path.posix.basename(cep)} beside it`);
  } else {
    problems.push(`unexpected file ${p}`);
  }
}
const countProblems = Object.entries(COUNTS)
  .filter(([folder, expected]) => counts[folder] !== expected)
  .map(([folder, expected]) => `test/fixtures/${folder} has ${counts[folder]} .cep files, expected ${expected}`);

if (countProblems.length + problems.length > 0) fail(...countProblems, ...problems);
console.log(`${name}: ok (${fixtures} fixtures, ${snapshots} tracked snapshots)`);
