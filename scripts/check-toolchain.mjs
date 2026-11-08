// check-toolchain: fail unless the running Node is exactly the version pinned in .nvmrc.
// Usage: node scripts/check-toolchain.mjs [--nvmrc <path>] [--node <version>]
// The defaults are the repo's .nvmrc and the running Node; the flags exist for the tests.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-toolchain';
const fail = (message) => {
  console.error(`${name}: ${message}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const flag = (key, fallback) => {
  const i = args.indexOf(key);
  if (i === -1) return fallback;
  if (i + 1 >= args.length) fail(`${key} needs a value`);
  return args[i + 1];
};

const nvmrcPath = flag('--nvmrc', path.join(import.meta.dirname, '..', '.nvmrc'));
const node = flag('--node', process.versions.node).replace(/^v/, '');

let pinned;
try {
  pinned = fs.readFileSync(nvmrcPath, 'utf8').trim().replace(/^v/, '');
} catch (err) {
  fail(`cannot read ${nvmrcPath}: ${err.code ?? err.message}`);
}
if (!/^\d+\.\d+\.\d+$/.test(pinned)) {
  fail(`${nvmrcPath} must hold one exact version like 26.13.0, found ${JSON.stringify(pinned)}`);
}
if (node !== pinned) {
  fail(`node is ${node}, but ${nvmrcPath} pins ${pinned}; switch Node before running the gate`);
}
console.log(`${name}: ok (node ${node})`);
