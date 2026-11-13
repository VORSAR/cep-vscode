// sync-upstream: copy cep's keyword table, lexer and language fixtures into this repo, byte for byte.
// Usage: node scripts/sync-upstream.mjs <path-to-cep-clone> [--ref <git-ref>] [--out <dir>] [--check [--ignore-source]]
// It reads every file from <ref> (default main) through git's object store, never from cep's
// working tree. --out (default: this repo's root) is where test/upstream and test/fixtures go.
// --check writes nothing and only compares; --ignore-source leaves SOURCE out of that comparison
// (CI's weekly job). To sync with the remote: git -C <cep> fetch origin, then pass --ref origin/main.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'sync-upstream';
const usage = 'usage: node scripts/sync-upstream.mjs <path-to-cep-clone> [--ref <git-ref>] [--out <dir>] [--check [--ignore-source]]';
const fail = (...lines) => {
  for (const line of lines) console.error(`${name}: ${line}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const opts = { ref: 'main', out: path.join(import.meta.dirname, '..'), check: false, ignoreSource: false };
const positional = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--ref' || a === '--out') {
    if (i + 1 >= args.length) fail(`${a} needs a value`);
    opts[a.slice(2)] = args[++i];
  } else if (a === '--check') {
    opts.check = true;
  } else if (a === '--ignore-source') {
    opts.ignoreSource = true;
  } else if (a.startsWith('--')) {
    fail(`unknown option ${a}; ${usage}`);
  } else {
    positional.push(a);
  }
}
if (positional.length !== 1) fail(`give exactly one path, the cep clone; ${usage}`);
if (opts.ignoreSource && !opts.check) fail(`--ignore-source needs --check: a sync always writes SOURCE; ${usage}`);
const [cep] = positional;
const { ref, out, check, ignoreSource } = opts;

// Run git in the cep clone. Any exit code other than 0 is a failure, even with an empty stdout.
function git(gitArgs, what, encoding = 'utf8') {
  try {
    return execFileSync('git', ['-C', cep, ...gitArgs], {
      encoding,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch (err) {
    const detail = err.stderr?.toString().trim() || (err.status == null ? err.message : `git exited ${err.status}`);
    return fail(`${what}: ${detail}`);
  }
}

// 1. The ref must name a commit. Everything below reads that one commit, by its sha.
const sha = git(['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], `${ref} is not a commit in ${cep}`).trim();
if (!/^[0-9a-f]{40,64}$/.test(sha)) fail(`${ref} is not a commit in ${cep}`);
const at = ref === sha ? sha : `${ref} (${sha})`;

// 2. The copy set: cep path -> path under --out.
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
// cep's other invalid files, each reviewed and not vendored (PLAN §5.5.1, 2026-11-13). A file in
// cep's invalid/ that is on neither list is a failure, so a new one gets a decision.
const NOT_VENDORED = [
  // Parse and static errors: no highlighting scope (PLAN §5.3, known limitation 5).
  'e-dur-001-bare-integer-duration.cep',
  'e-emit-001-missing-emit.cep',
  'e-int-001-missing-intent.cep',
  'e-late-001-missing-late-clause.cep',
  'e-ord-001-reordered-clauses.cep',
  'e-pat-001-missing-within.cep',
  'e-pat-002-missing-after-match.cep',
  'e-pat-003-missing-restart-marker.cep',
  'e-pat-004-absence-without-for.cep',
  'e-pat-005-absence-only-pattern.cep',
  'e-pat-005-arrow-before-absence.cep',
  'e-prag-001-missing-pragma.cep',
  'e-syn-001-synonym-keyword.cep',
  'e-syn-002-sql-equality.cep',
  'e-syn-003-in-list.cep',
  'e-syn-004-select-star.cep',
  'e-ttl-001-partition-missing-ttl.cep',
  'e-win-001-cron-missing-timezone.cep',
  // A keyword glued to a name: covered by the glued lines in test/unit/names.test.cep.
  'e-prag-001-keyword-glued-to-pragma-id.cep',
  'e-syn-001-keyword-glued-to-name.cep',
  // A BOM after the start: unmarked (PLAN §5.3, known limitation 3).
  'e-syn-001-bom-after-start.cep',
];
const listCep = (dir) =>
  git(['ls-tree', '-z', '--name-only', sha, dir], `cannot list ${dir} at ${ref}`)
    .split('\0')
    .filter((p) => p.endsWith('.cep'));

const targets = [
  { src: 'internal/parser/keywords.go', dest: 'test/upstream/keywords.go' },
  { src: 'internal/parser/lexer.go', dest: 'test/upstream/lexer.go' },
  ...listCep('docs/language/examples/').map((src) => ({ src, dest: `test/fixtures/examples/${path.posix.basename(src)}` })),
  ...listCep('docs/language/examples/torture/').map((src) => ({ src, dest: `test/fixtures/torture/${path.posix.basename(src)}` })),
];
const invalidUpstream = new Set(listCep('docs/language/invalid/'));
const missing = INVALID.map((n) => `docs/language/invalid/${n}`).filter((src) => !invalidUpstream.has(src));
if (missing.length > 0) fail(...missing.map((src) => `${at} has no ${src}`));
const reviewed = new Set([...INVALID, ...NOT_VENDORED].map((n) => `docs/language/invalid/${n}`));
const unreviewed = [...invalidUpstream].filter((src) => !reviewed.has(src)).sort();
if (unreviewed.length > 0) {
  fail(...unreviewed.map((src) => `${at} has ${src}, which is neither vendored nor reviewed; add it to INVALID or NOT_VENDORED (PLAN §5.5.1)`));
}
for (const n of INVALID) targets.push({ src: `docs/language/invalid/${n}`, dest: `test/fixtures/invalid/${n}` });

// Read every blob first, as raw bytes with no line-ending conversion, so a failure writes nothing.
for (const t of targets) {
  t.bytes = git(['cat-file', 'blob', `${sha}:${t.src}`], `cannot read ${t.src} at ${at}`, 'buffer');
}

// 3. SOURCE names the commit the copy came from.
const stamp = git(['log', '-1', '--format=%H %cs', sha], `cannot read the commit date of ${sha}`).trim();
const files = [...targets, { dest: 'test/upstream/SOURCE', bytes: Buffer.from(`VORSAR/cep ${stamp}\n`) }];

const outPath = (dest) => path.join(out, ...dest.split('/'));
const readOrNull = (file) => {
  try {
    return fs.readFileSync(file);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    return fail(`cannot read ${file}: ${err.code ?? err.message}`);
  }
};

// 6. --check: compare the targets and SOURCE (not with --ignore-source) with what a sync would
// write, and write nothing.
if (check) {
  const problems = [];
  for (const f of ignoreSource ? targets : files) {
    const have = readOrNull(outPath(f.dest));
    if (have === null) problems.push(`${f.dest} is missing`);
    else if (!have.equals(f.bytes)) problems.push(`${f.dest} differs from ${at}`);
  }
  if (problems.length > 0) fail(...problems);
  console.log(`${name}: ok (${targets.length} files match ${sha})`);
  process.exit(0);
}

// 2–3, 5. Write each file whose bytes changed, and say so.
for (const f of files) {
  const file = outPath(f.dest);
  const have = readOrNull(file);
  if (have !== null && have.equals(f.bytes)) continue;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, f.bytes);
  } catch (err) {
    fail(`cannot write ${file}: ${err.code ?? err.message}`);
  }
  console.log(`${name}: wrote ${f.dest}`);
}

// 4. Never delete: a .cep under test/fixtures that is not in this copy set is stale, for a person to remove.
const copied = new Set(targets.map((t) => t.dest));
const fixturesDir = outPath('test/fixtures');
const stale = (fs.existsSync(fixturesDir) ? fs.readdirSync(fixturesDir, { recursive: true, withFileTypes: true }) : [])
  .filter((e) => e.isFile() && e.name.endsWith('.cep'))
  .map((e) => path.relative(out, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
  .filter((rel) => !copied.has(rel))
  .sort();
if (stale.length > 0) {
  fail(...stale.map((rel) => `stale fixture ${rel} is not in cep at ${at}; remove it and its snapshot by hand`));
}

console.log(`${name}: next: npm test, then review every snapshot diff`);
