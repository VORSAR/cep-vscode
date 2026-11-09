// check-clean: fail unless the working tree has no changed or untracked file.
// Usage: node scripts/check-clean.mjs [--root <dir>]
// npm run gate ends with it, to catch a snapshot or any other file written during the run.
// Ignored files (node_modules/, *.vsix, .DS_Store) are not listed. --root (default: this repo's
// root) exists for the tests.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const name = 'check-clean';
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

// Outside a repository git exits 128 with an empty stdout, which must not read as clean.
let status;
try {
  status = execFileSync('git', ['-C', root, 'status', '--porcelain', '--untracked-files=all'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
} catch (err) {
  const detail = err.stderr?.trim() || (err.status == null ? err.message : `git exited ${err.status}`);
  fail(`git status failed in ${root}: ${detail}`);
}

const lines = status.split('\n').filter(Boolean);
if (lines.length > 0) fail(...lines.map((line) => `not clean: ${line}`));
console.log(`${name}: ok`);
