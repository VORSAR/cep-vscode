// check-vsix: fail unless the .vsix holds exactly the 8 files of the S1 plan check's S4.
// Usage: node scripts/check-vsix.mjs [<file.vsix>] [--root <dir>]
// With no file, it checks cep-<version>.vsix in --root (default: this repo's root), with the
// version read from that root's package.json, so a stale package is never checked by mistake.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-vsix';
const fail = (...lines) => {
  for (const line of lines) console.error(`${name}: ${line}`);
  process.exit(1);
};

const args = process.argv.slice(2);
let root = path.join(import.meta.dirname, '..');
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--root') {
    if (i + 1 >= args.length) fail('--root needs a value');
    root = args[++i];
  } else if (a.startsWith('--')) {
    fail(`unknown option ${a}`);
  } else {
    positional.push(a);
  }
}
if (positional.length > 1) fail(`give at most one .vsix, not ${positional.length}`);

// The S4 set: what vsce packs from package.json's "files" list, with its renames.
const EXPECTED = [
  'extension.vsixmanifest',
  '[Content_Types].xml',
  'extension/package.json',
  'extension/readme.md',
  'extension/changelog.md',
  'extension/LICENSE.txt',
  'extension/language-configuration.json',
  'extension/syntaxes/cep.tmLanguage.json',
];

// 1. Which file.
let file = positional[0];
if (file === undefined) {
  const manifest = path.join(root, 'package.json');
  let version;
  try {
    version = JSON.parse(fs.readFileSync(manifest, 'utf8')).version;
  } catch (err) {
    fail(`cannot read the version from ${manifest}: ${err.code ?? err.message}`);
  }
  if (typeof version !== 'string' || version === '') fail(`${manifest} has no version`);
  file = path.join(root, `cep-${version}.vsix`);
}

// 2. Read the zip's central directory.
let zip;
try {
  zip = fs.readFileSync(file);
} catch (err) {
  fail(`cannot read ${file}: ${err.code ?? err.message}`);
}
const notZip = (why) => fail(`${file} is not a zip: ${why}`);

// The end-of-central-directory record is 22 bytes plus a comment of up to 65,535 bytes, so it
// starts within the last 65,557. The one whose comment length reaches exactly the end is the record.
const EOCD = 0x06054b50;
const CDH = 0x02014b50;
let end = -1;
for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
  if (zip.readUInt32LE(i) === EOCD && i + 22 + zip.readUInt16LE(i + 20) === zip.length) {
    end = i;
    break;
  }
}
if (end === -1) notZip('no end-of-central-directory record');
const count = zip.readUInt16LE(end + 10);
const offset = zip.readUInt32LE(end + 16);
if (count === 0xffff || offset === 0xffffffff) notZip('zip64 is not supported');

const names = [];
let p = offset;
for (let k = 0; k < count; k++) {
  if (p + 46 > end || zip.readUInt32LE(p) !== CDH) notZip(`central-directory entry ${k + 1} of ${count} is not where the record says`);
  const nameLength = zip.readUInt16LE(p + 28);
  const extraLength = zip.readUInt16LE(p + 30);
  const commentLength = zip.readUInt16LE(p + 32);
  if (p + 46 + nameLength > end) notZip(`central-directory entry ${k + 1} runs past the directory`);
  names.push(zip.toString('utf8', p + 46, p + 46 + nameLength));
  p += 46 + nameLength + extraLength + commentLength;
}

// 3. Compare the names, as a set, with S4.
const have = new Set(names);
const problems = [];
if (have.size === 0) problems.push(`${file} is empty (0 files)`);
for (const n of EXPECTED) if (!have.has(n)) problems.push(`${file} is missing ${n}`);
for (const n of [...have].sort()) if (!EXPECTED.includes(n)) problems.push(`${file} has an extra file ${n}`);
if (problems.length > 0) fail(...problems);

console.log(`${name}: ok (${EXPECTED.length} files)`);
