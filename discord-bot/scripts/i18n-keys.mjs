import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../src');
const files = [];
const walk = (d) => {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (p.endsWith('.ts')) files.push(p);
  }
};
walk(root);

const LITERAL = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`/g;
const keys = new Set();

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  if (!/from '[./]*utils\/tr\.js'/.test(src)) continue;
  for (const m of src.matchAll(/\b(?:t|tr|trg)\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    while (i < src.length && depth > 0) {
      const ch = src[i];
      if (ch === "'" || ch === '"' || ch === '`') {
        const end = src.indexOf(ch, i + 1);
        i = end < 0 ? src.length : end + 1;
        continue;
      }
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      i++;
    }
    const args = src.slice(m.index + m[0].length, i - 1);
    const firstObj = args.indexOf('{ ');
    const head = firstObj > 0 ? args.slice(0, firstObj) : args;
    for (const l of head.matchAll(LITERAL)) {
      const s = (l[1] ?? l[2] ?? l[3]).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\n/g, '\n');
      if (/[A-Za-zÀ-ÿ]{2}/.test(s)) keys.add(s);
    }
  }
}

const maps = [
  ['modules/moderation/services/sanctionPipeline.ts', /export const ACTION_LABEL[\s\S]*?\n\};/],
  ['modules/moderation/sanctionConfig.ts', /export const SEVERITY_LABEL[^\n]*/],
  ['modules/moderation/utils/sanctionCard.ts', /export const SANCTION_META[\s\S]*?\n\};/],
  ['modules/moderation/services/appealService.ts', /const STATUS_LABEL[^\n]*/],
  ['modules/reports/services/reportsService.ts', /const SANCTIONS[\s\S]*?\n\};/],
];
for (const [f, re] of maps) {
  const block = fs.readFileSync(path.join(root, f), 'utf8').match(re)?.[0] ?? '';
  for (const l of block.matchAll(/(?:label|description|[A-Z_]+|light|medium|grave|pending|accepted|refused):\s*'([^']+)'/g)) keys.add(l[1]);
}
for (const extra of ['Ban temporaire', 'Softban']) keys.add(extra);

const out = process.argv[2];
const sorted = [...keys].sort();
if (out) {
  const existing = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};
  const missing = sorted.filter((k) => !(k in existing));
  console.log(JSON.stringify(missing, null, 1));
} else console.log(JSON.stringify(sorted, null, 1));
