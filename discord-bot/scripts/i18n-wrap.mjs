import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve(import.meta.dirname, '../src');
const CALLS = new Set(['setDescription', 'setTitle', 'setLabel', 'setPlaceholder', 'reply', 'editReply', 'followUp', 'send', 'setContent']);
const PROPS = new Set(['content', 'error', 'text', 'name', 'value', 'label', 'description', 'placeholder', 'title']);
const PROP_PARENTS = new Set(['addFields', 'setFooter', 'setAuthor', 'reply', 'editReply', 'followUp', 'send', 'update', 'addOptions', 'setOptions']);
const SCOPE = ['guildId', 'ctx', 'interaction', 'guild', 'message', 'msg', 'member', 'newState', 'oldState', 'reaction', 'i'];

const relImport = (file) => {
  let rel = path.relative(path.dirname(file), path.join(root, 'utils', 'tr.js')).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
};

function scopeNames(node) {
  const names = new Set();
  for (let n = node; n; n = n.parent) {
    if (ts.isFunctionLike(n)) for (const p of n.parameters ?? []) if (ts.isIdentifier(p.name)) names.add(p.name.text);
    if (ts.isBlock(n) || ts.isSourceFile(n)) {
      for (const st of n.statements) {
        if (st.end > node.getStart()) break;
        if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) names.add(d.name.text);
      }
    }
    if (ts.isClassDeclaration(n)) break;
  }
  return names;
}

function inSlashData(node) {
  for (let n = node; n; n = n.parent) {
    if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name) && ['slashData', 'data', 'contextData'].includes(n.name.text)) return true;
    if (ts.isNewExpression(n) && /CommandBuilder|ContextMenuCommandBuilder/.test(n.expression.getText())) return true;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && /^add(Sub)?(command|CommandGroup|StringOption|UserOption|IntegerOption|NumberOption|BooleanOption|ChannelOption|RoleOption|MentionableOption|AttachmentOption|Subcommand|SubcommandGroup)$/i.test(n.expression.name.text)) return true;
    if (ts.isCallExpression(n) && /^(logger|console)\./.test(n.expression.getText())) return true;
    if (ts.isCallExpression(n) && ['trg', 'tr', 't', 'formatString', 'getTranslation'].includes(n.expression.getText())) return true;
  }
  return false;
}

function convert(lit, sf) {
  if (ts.isStringLiteral(lit) || ts.isNoSubstitutionTemplateLiteral(lit)) {
    const s = lit.text;
    if (!/[A-Za-zÀ-ÿ]{2}/.test(s) || /^[a-z0-9_:\-.]+$/.test(s) || /^https?:/.test(s) || /^#?[0-9a-f]{6}$/i.test(s)) return null;
    return { key: s, vars: null };
  }
  if (ts.isTemplateExpression(lit)) {
    let key = lit.head.text;
    const vars = [];
    const used = new Set();
    for (const span of lit.templateSpans) {
      const expr = span.expression;
      let name = ts.isIdentifier(expr) ? expr.text : ts.isPropertyAccessExpression(expr) ? expr.name.text : `v${vars.length}`;
      while (used.has(name)) name = `${name}${vars.length}`;
      used.add(name);
      vars.push([name, expr.getText(sf)]);
      key += `{${name}}` + span.literal.text;
    }
    const plain = key.replace(/\{\w+\}/g, ' ');
    if (!/[A-Za-zÀ-ÿ]{2}/.test(plain)) return null;
    return { key, vars };
  }
  return null;
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;

const FN = process.env.FN || '';
const API_PROPS = process.env.PROPS ? new Set(process.env.PROPS.split(',')) : new Set(['reason', 'message', 'error', 'warning', 'details', 'summary', 'label', 'description', 'title', 'text', 'detail', 'hint', 'action', 'note']);
const SENTENCE = /[éèêàçùû]|[A-Za-z]{3,}\s+[A-Za-z]{2,}/;

export function wrapFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];
  const visit = (node) => {
    let target = null;
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && CALLS.has(node.expression.name.text) && node.arguments[0]) target = node.arguments[0];
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'noticeEmbed' && node.arguments[1]) target = node.arguments[1];
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && PROPS.has(node.name.text)) {
      let p = node.parent;
      while (p && !ts.isCallExpression(p) && !ts.isReturnStatement(p) && !ts.isFunctionLike(p)) p = p.parent;
      const ok = node.name.text === 'error' || (p && ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && PROP_PARENTS.has(p.expression.name.text));
      if (ok) target = node.initializer;
    }
    if (FN) {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'push') target = node.arguments[0];
      if (ts.isNewExpression(node) && node.expression.getText(sf) === 'Error' && node.arguments?.[0]) target = node.arguments[0];
      if (ts.isReturnStatement(node) && node.expression) target = node.expression;
      if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && API_PROPS.has(node.name.text)) target = node.initializer;
    }
    if (target && (ts.isConditionalExpression(target))) {
      for (const br of [target.whenTrue, target.whenFalse]) tryWrap(br);
    } else if (target) tryWrap(target);
    ts.forEachChild(node, visit);
  };
  const tryWrap = (lit) => {
    if (!lit || inSlashData(lit)) return;
    const c = convert(lit, sf);
    if (!c) return;
    const varsTxt = c.vars?.length ? `, { ${c.vars.map(([n, e]) => (n === e ? n : `${n}: ${e}`)).join(', ')} }` : '';
    if (FN) {
      if (!SENTENCE.test(c.key.replace(/\{\w+\}/g, ' '))) return;
      edits.push([lit.getStart(sf), lit.getEnd(), `${FN}(${q(c.key)}${varsTxt})`]);
      return;
    }
    const names = scopeNames(lit);
    const g = SCOPE.find((n) => names.has(n));
    if (!g) return;
    edits.push([lit.getStart(sf), lit.getEnd(), `trg(${g}, ${q(c.key)}${varsTxt})`]);
  };
  visit(sf);
  if (!edits.length) return 0;
  let out = src;
  for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  const fnName = FN || 'trg';
  if (!new RegExp(`import \\{[^}]*\\b${fnName}\\b[^}]*\\} from '[^']*utils/tr\\.js'`).test(out)) {
    const lines = out.split('\n');
    let last = -1;
    for (let i = 0; i < lines.length; i++) if (/^import .* from ['"]|^import ['"]|^\} from ['"]/.test(lines[i])) last = i;
    lines.splice(last + 1, 0, `import { ${fnName} } from '${relImport(file)}';`);
    out = lines.join('\n');
  }
  fs.writeFileSync(file, out);
  return edits.length;
}

const targets = process.argv.slice(2);
let total = 0;
for (const t of targets) {
  const abs = path.resolve(root, t);
  const files = fs.statSync(abs).isDirectory() ? fs.readdirSync(abs, { recursive: true }).filter((f) => f.endsWith('.ts')).map((f) => path.join(abs, f)) : [abs];
  for (const f of files) {
    const n = wrapFile(f);
    if (n) console.log(n, path.relative(root, f));
    total += n;
  }
}
console.log('total', total);
