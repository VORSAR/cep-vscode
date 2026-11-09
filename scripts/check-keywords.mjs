// check-keywords: fail unless the grammar's keyword rules match cep's keyword table (PLAN §5.5.2).
// Usage: node scripts/check-keywords.mjs [--grammar <path>] [--keywords <path>]
// The defaults are the repo's syntaxes/cep.tmLanguage.json and test/upstream/keywords.go.
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const name = 'check-keywords';
const fail = (lines) => {
  for (const line of [].concat(lines)) console.error(`${name}: ${line}`);
  process.exit(1);
};

// PLAN §5.3's top-level skeleton, in its order.
const SKELETON = [
  'comments', 'strings', 'param-ref', 'backticked', 'declarations', 'annotation', 'number',
  'keywords-declaration', 'keywords-type', 'keywords-modifier', 'keywords-clause', 'keywords-window', 'keywords-unit',
  'keywords-logical', 'keywords-constant', 'keywords-builtin', 'keywords-text', 'keywords-reserved', 'keywords-wrong-case',
  'function-call', 'identifier', 'operators', 'punctuation',
];
const EXCLUSIONS = 5; // the stream, table, rule, param and into regions
const CATEGORY = /^\(\?<!\[A-Za-z_\]\)\(\?:([a-z_|]+)\)\(\?!\[A-Za-z0-9_\]\)$/;
const WRONG_CASE = /^\(\?i\)\(\?<!\[A-Za-z_\]\)\(\?:([a-z_|]+)\)\(\?!\[A-Za-z0-9_\]\)$/;
const EXCLUSION = /\(\?!\(\?i:([a-z_|]+)\)\(\?!\[A-Za-z0-9_\]\)\)/;

const root = path.join(import.meta.dirname, '..');
const paths = {
  '--grammar': path.join(root, 'syntaxes', 'cep.tmLanguage.json'),
  '--keywords': path.join(root, 'test', 'upstream', 'keywords.go'),
};
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 2) {
  if (!(args[i] in paths)) fail(`unknown argument ${args[i]}; usage: check-keywords.mjs [--grammar <path>] [--keywords <path>]`);
  if (i + 1 >= args.length) fail(`${args[i]} needs a value`);
  paths[args[i]] = args[i + 1];
}
const grammarPath = paths['--grammar'];
const keywordsPath = paths['--keywords'];

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (err) {
    return fail(`cannot read ${file}: ${err.code ?? err.message}`);
  }
};

// 1. The keyword table: the "…" strings between an opener line and the next line that is exactly "}".
const goLines = read(keywordsPath).split(/\r?\n/);
const block = (opener, item) => {
  const start = goLines.findIndex((line) => line.includes(opener));
  if (start === -1) return [];
  const end = goLines.findIndex((line, i) => i > start && line === '}');
  if (end === -1) return [];
  return goLines.slice(start + 1, end).flatMap((line) => [...line.matchAll(item)].map((m) => m[1]));
};
const keywordList = block('keywordList = []string{', /"([^"]*)"/g);
const reservedFuture = block('reservedFuture = map[string]bool{', /"([^"]*)"\s*:/g);
if (keywordList.length === 0) fail(`${keywordsPath}: the keywordList block is missing or empty`);
if (reservedFuture.length === 0) fail(`${keywordsPath}: the reservedFuture block is missing or empty`);
const order = new Map(keywordList.map((word, i) => [word, i]));

// 2. The grammar and its three kinds of word list.
let grammar;
try {
  grammar = JSON.parse(read(grammarPath));
} catch (err) {
  fail(`${grammarPath} is not valid JSON: ${err.message}`);
}
if (!grammar || typeof grammar !== 'object' || !grammar.repository || typeof grammar.repository !== 'object') {
  fail(`${grammarPath} has no repository object`);
}
const repo = grammar.repository;

const problems = [];
const problem = (rule, message) => problems.push(message);

const categories = new Map();
for (const [key, entry] of Object.entries(repo)) {
  if (!key.startsWith('keywords-') || key === 'keywords-wrong-case') continue;
  const m = CATEGORY.exec(typeof entry?.match === 'string' ? entry.match : '');
  if (!m) {
    problem('a', `${key}: match is not the canonical (?<![A-Za-z_])(?:w1|w2|…)(?![A-Za-z0-9_]): ${JSON.stringify(entry?.match)}`);
    continue;
  }
  categories.set(key, m[1].split('|'));
}

let wrongCase = null;
if (!('keywords-wrong-case' in repo)) {
  problem('a', 'keywords-wrong-case: missing from the repository');
} else {
  const m = WRONG_CASE.exec(typeof repo['keywords-wrong-case']?.match === 'string' ? repo['keywords-wrong-case'].match : '');
  if (m) wrongCase = m[1].split('|');
  else problem('a', `keywords-wrong-case: match is not the canonical (?i)(?<![A-Za-z_])(?:…)(?![A-Za-z0-9_]): ${JSON.stringify(repo['keywords-wrong-case']?.match)}`);
}

const exclusions = [];
const regions = Array.isArray(repo.declarations?.patterns) ? repo.declarations.patterns : [];
regions.forEach((region, i) => {
  if (typeof region?.end !== 'string' || !region.end.includes('(?!(?i:')) return;
  const keyword = /\(([a-z]+)\)/.exec(typeof region.begin === 'string' ? region.begin : '')?.[1];
  const label = `declarations (${keyword ?? `entry ${i + 1}`})`;
  const m = EXCLUSION.exec(region.end);
  if (m) exclusions.push({ label, words: m[1].split('|') });
  else problem('h', `${label}: the name exclusion is not (?!(?i:w1|w2|…)(?![A-Za-z0-9_]))`);
});

// 3. The rules.
const homes = new Map();
for (const [key, words] of categories) {
  for (const word of words) homes.set(word, new Set([...(homes.get(word) ?? []), key]));
}
for (const [word, keys] of homes) {
  if (keys.size > 1) problem('b', `${word} is in ${keys.size} categories: ${[...keys].join(', ')}`); // (b)
}
for (const word of keywordList) {
  if (!homes.has(word)) problem('c', `keyword ${word} is in no keywords-* category`); // (c)
}
for (const [key, words] of categories) {
  for (const word of words) if (!order.has(word)) problem('d', `${key}: ${word} is not in keywordList`); // (d)
}

if (categories.has('keywords-reserved')) { // (e)
  const reserved = new Set(categories.get('keywords-reserved'));
  for (const word of reservedFuture) if (!reserved.has(word)) problem('e', `keywords-reserved lacks ${word}, which reservedFuture lists`);
  for (const word of reserved) if (!reservedFuture.includes(word)) problem('e', `keywords-reserved has ${word}, which reservedFuture does not list`);
} else if (!('keywords-reserved' in repo)) {
  problem('e', 'keywords-reserved: missing; it must hold exactly the reservedFuture words');
}

if (wrongCase) { // (f)
  const listed = new Set(wrongCase);
  for (const word of keywordList) if (!listed.has(word)) problem('f', `keywords-wrong-case lacks ${word}, which keywordList lists`);
  for (const word of listed) if (!order.has(word)) problem('f', `keywords-wrong-case has ${word}, which is not in keywordList`);
}

const top = Array.isArray(grammar.patterns) // (g)
  ? grammar.patterns.map((p) => (p && typeof p.include === 'string' && Object.keys(p).length === 1 ? p.include : JSON.stringify(p)))
  : null;
if (!top) {
  problem('g', `patterns: missing; the top level must be PLAN §5.3's ${SKELETON.length}-entry skeleton`);
} else {
  const want = SKELETON.map((key) => `#${key}`);
  for (let i = 0; i < Math.max(top.length, want.length); i++) {
    if (top[i] === want[i]) continue;
    problem('g', `patterns: entry ${i + 1} is ${top[i] ?? '(none)'}, where PLAN §5.3's ${SKELETON.length}-entry skeleton has ${want[i] ?? '(none)'}`);
    break;
  }
}

if (exclusions.length !== EXCLUSIONS) { // (h)
  problem('h', `declarations: ${exclusions.length} of ${EXCLUSIONS} name exclusions found (stream, table, rule, param and into each need one)`);
}
for (const { label, words } of exclusions) {
  const listed = new Set(words);
  for (const word of keywordList) if (!listed.has(word)) problem('h', `${label}: the name exclusion lacks ${word}`);
  for (const word of listed) if (!order.has(word)) problem('h', `${label}: the name exclusion has ${word}, which is not in keywordList`);
}

const lists = [ // (i)
  ...categories,
  ...(wrongCase ? [['keywords-wrong-case', wrongCase]] : []),
  ...exclusions.map(({ label, words }) => [`${label} name exclusion`, words]),
];
for (const [label, words] of lists) {
  const known = words.filter((word) => order.has(word));
  for (let i = 1; i < known.length; i++) {
    if (order.get(known[i]) > order.get(known[i - 1])) continue;
    problem('i', known[i] === known[i - 1]
      ? `${label}: ${known[i]} appears twice`
      : `${label}: not in keywordList order (${known[i - 1]} before ${known[i]})`);
    break;
  }
}

// 4. The verdict.
if (problems.length > 0) fail(problems);
console.log(`${name}: ok (${keywordList.length} keywords, ${reservedFuture.length} reserved, ${categories.size} categories, ${exclusions.length} name exclusions)`);
