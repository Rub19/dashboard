import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../src');
const keys = new Set();

const literals = (node, out) => {
  if (!node) return;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) out.push(node.text);
  else if (ts.isConditionalExpression(node)) {
    literals(node.whenTrue, out);
    literals(node.whenFalse, out);
  } else if (ts.isParenthesizedExpression(node)) literals(node.expression, out);
};

for (const rel of fs.readdirSync(root, { recursive: true })) {
  if (!rel.endsWith('.ts')) continue;
  const file = path.join(root, rel);
  const src = fs.readFileSync(file, 'utf8');
  if (!/utils\/tr\.js'|from '\.\/tr\.js'/.test(src) && !rel.endsWith(path.join('utils', 'tr.ts'))) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
      const name = n.expression.text;
      const idx = name === 't' || name === 'trq' || name === 'trs' ? 0 : name === 'tr' || name === 'trg' ? 1 : -1;
      if (idx >= 0) {
        const out = [];
        literals(n.arguments[idx], out);
        for (const s of out) if (/[A-Za-zÀ-ÿ]{2}/.test(s)) keys.add(s);
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
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
  console.log(JSON.stringify(sorted.filter((k) => !(k in existing)), null, 1));
} else console.log(JSON.stringify(sorted, null, 1));
