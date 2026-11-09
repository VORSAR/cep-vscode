// check-upstream: fail when cep main's keywords.go or lexer.go differs from the vendored copy.
// Usage: node scripts/check-upstream.mjs [--url-keywords <url>] [--url-lexer <url>] [--local <dir>]
// CI's scheduled job runs it; it is not part of npm test, so local test runs stay offline.
// The defaults are cep main's raw files and this repo's test/upstream; the flags exist for the tests.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-upstream';
const fail = (...lines) => {
  for (const line of lines) console.error(`${name}: ${line}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const opts = {};
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (!['--url-keywords', '--url-lexer', '--local'].includes(a)) fail(`unknown argument ${a}`);
  if (i + 1 >= args.length) fail(`${a} needs a value`);
  opts[a] = args[++i];
}

const repoRoot = path.join(import.meta.dirname, '..');
const raw = 'https://raw.githubusercontent.com/VORSAR/cep/main/internal/parser';
const local = opts['--local'] ?? path.join(repoRoot, 'test', 'upstream');
const files = [
  { file: 'keywords.go', url: opts['--url-keywords'] ?? `${raw}/keywords.go` },
  { file: 'lexer.go', url: opts['--url-lexer'] ?? `${raw}/lexer.go` },
];

// 1–2. Fetch both. A network error, a timeout or any status but 200 is a failure.
async function get(url) {
  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  } catch (err) {
    const reason = err.name === 'TimeoutError' ? 'timed out after 30 s' : (err.cause?.code ?? err.cause?.message ?? err.message);
    throw new Error(`could not fetch ${url}: ${reason}`);
  }
  if (res.status !== 200) throw new Error(`could not fetch ${url}: ${res.status} ${res.statusText}`.trimEnd());
  return Buffer.from(await res.arrayBuffer());
}
const fetched = await Promise.allSettled(files.map((f) => get(f.url)));
const problems = fetched.filter((r) => r.status === 'rejected').map((r) => r.reason.message);

// 3. Read the local copies and SOURCE. A missing or unparsable one is a failure, naming it.
const readLocal = (file) => {
  try {
    return fs.readFileSync(file);
  } catch (err) {
    problems.push(`cannot read ${file}: ${err.code ?? err.message}`);
    return null;
  }
};
for (const f of files) f.local = readLocal(path.join(local, f.file));
const sourcePath = path.join(local, 'SOURCE');
const sourceBytes = readLocal(sourcePath);
let source = null;
if (sourceBytes !== null) {
  const m = /^(VORSAR\/cep [0-9a-f]{40} \d{4}-\d{2}-\d{2})\n$/.exec(sourceBytes.toString('utf8'));
  if (m) source = m[1];
  else problems.push(`${sourcePath} is not one line "VORSAR/cep <sha> <date>"`);
}
if (problems.length > 0) fail(...problems);

// Compare bytes. The default local dir prints as test/upstream.
const rel = path.relative(repoRoot, local);
const shown = rel === '' || rel.startsWith('..') || path.isAbsolute(rel) ? local : rel.split(path.sep).join('/');
const differ = files.filter((f, i) => !fetched[i].value.equals(f.local));
if (differ.length > 0) {
  fail(...differ.map((f) =>
    `cep main's ${f.file} differs from ${shown} (synced at ${source}); run sync-upstream, update the grammar, review the snapshots`));
}
console.log(`${name}: ok (keywords.go and lexer.go match ${source})`);
