// check-release: before CI creates a release, check the tag, the CHANGELOG section and the package, and write the notes.
// Usage: node scripts/check-release.mjs --ref <name> --ref-type <tag|branch> [--notes <path>] [--root <dir>]
// In the release workflow --ref and --ref-type are $GITHUB_REF_NAME and $GITHUB_REF_TYPE (PLAN §5.6.1).
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-release';
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

const ref = flag('--ref');
const refType = flag('--ref-type', 'tag');
const notesPath = flag('--notes');
const root = flag('--root', path.join(import.meta.dirname, '..'));
if (!ref) fail('--ref is required (the tag or branch name)');

let version;
try {
  version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
} catch (err) {
  fail(`cannot read ${path.join(root, 'package.json')}: ${err.code ?? err.message}`);
}
if (!version) fail(`${path.join(root, 'package.json')} has no version`);

if (refType === 'tag') {
  if (ref !== `v${version}`) fail(`tag ${ref} does not match package.json version ${version}; the tag must be v${version}`);
} else if (refType === 'branch') {
  if (ref !== 'main') fail(`a release can be dispatched only from main, not from branch ${ref}`);
} else {
  fail(`--ref-type must be tag or branch, not ${refType}`);
}

const changelogPath = path.join(root, 'CHANGELOG.md');
let changelog;
try {
  changelog = fs.readFileSync(changelogPath, 'utf8');
} catch (err) {
  fail(`cannot read ${changelogPath}: ${err.code ?? err.message}`);
}
const lines = changelog.split('\n');
const start = lines.findIndex((l) => l.trim() === `## ${version}` || l.startsWith(`## ${version} `));
if (start === -1) fail(`CHANGELOG.md has no "## ${version}" section`);
const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
const body = lines.slice(start + 1, end === -1 ? undefined : end).join('\n').trim();
if (body === '') fail(`CHANGELOG.md's "## ${version}" section is empty`);

const vsix = path.join(root, `cep-${version}.vsix`);
if (!fs.existsSync(vsix)) fail(`${vsix} does not exist; run npm run package first`);

const notes = `${body}\n`;
if (notesPath) fs.writeFileSync(notesPath, notes);
console.log(`${name}: ok (v${version}, notes ${body.split('\n').length} lines)`);
