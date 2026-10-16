import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const ATTRS = new Set(["label", "hint", "title", "placeholder", "description", "subtitle", "aria-label", "confirmLabel", "cancelLabel", "emptyText", "emptyLabel", "tooltip", "help", "caption", "heading", "text", "alt", "unit", "suffix", "prefix", "badge", "message", "actionLabel", "empty"]);
const PROPS = new Set(["label", "hint", "title", "placeholder", "description", "subtitle", "confirmLabel", "cancelLabel", "emptyText", "tooltip", "help", "caption", "text", "message", "desc", "unit"]);
const CALLS = new Set(["success", "error", "warning", "info", "toast", "confirmDialog", "setError", "setMsg", "setMessage", "notify", "showError", "showToast", "alertError", "setStatus", "setNotice", "setFeedback"]);
const HAS_TEXT = /[A-Za-zÀ-ÿ]{2}/;
const NOT_TEXT = /^([a-z0-9_:\-./#]+|https?:.*|#?[0-9a-f]{3,8}|[A-Z0-9_]+)$/;

const q = (s) => JSON.stringify(s);

function inFunction(node) {
  for (let n = node.parent; n; n = n.parent) if (ts.isFunctionLike(n)) return true;
  return false;
}

function alreadyWrapped(node) {
  for (let n = node.parent; n; n = n.parent) {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && ["tx", "t", "i18n", "txNode"].includes(n.expression.text)) return true;
    if (ts.isFunctionLike(n)) return false;
  }
  return false;
}

function convert(lit, sf) {
  if (ts.isStringLiteral(lit) || ts.isNoSubstitutionTemplateLiteral(lit)) {
    const s = lit.text;
    if (!HAS_TEXT.test(s) || NOT_TEXT.test(s)) return null;
    return `tx(${q(s)})`;
  }
  if (ts.isTemplateExpression(lit)) {
    let key = lit.head.text;
    const vars = [];
    const used = new Set();
    for (const span of lit.templateSpans) {
      const e = span.expression;
      let name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : `v${vars.length}`;
      while (used.has(name)) name = `${name}${vars.length}`;
      used.add(name);
      vars.push([name, e.getText(sf)]);
      key += `{${name}}` + span.literal.text;
    }
    if (!HAS_TEXT.test(key.replace(/\{\w+\}/g, " "))) return null;
    return `tx(${q(key)}, { ${vars.map(([n, e]) => (n === e ? n : `${n}: ${e}`)).join(", ")} })`;
  }
  return null;
}

function jsxTextValue(raw) {
  const lines = raw.split(/\r?\n/);
  const out = [];
  lines.forEach((line, i) => {
    let l = line.replace(/\t/g, " ");
    if (i > 0) l = l.replace(/^\s+/, "");
    if (i < lines.length - 1) l = l.replace(/\s+$/, "");
    if (l) out.push(l);
  });
  return out.join(" ");
}

export function wrapFile(file) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const edits = [];
  const wrapExpr = (expr) => {
    if (!expr || alreadyWrapped(expr) || !inFunction(expr)) return;
    if (ts.isConditionalExpression(expr)) return void (wrapExpr(expr.whenTrue), wrapExpr(expr.whenFalse));
    if (ts.isParenthesizedExpression(expr)) return void wrapExpr(expr.expression);
    if (ts.isBinaryExpression(expr) && (expr.operatorToken.kind === ts.SyntaxKind.BarBarToken || expr.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)) return void wrapExpr(expr.right);
    const r = convert(expr, sf);
    if (r) edits.push([expr.getStart(sf), expr.getEnd(), r]);
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && inFunction(node)) {
      const val = jsxTextValue(node.getFullText(sf));
      const core = val.trim();
      if (core && HAS_TEXT.test(core) && !/[{}<>]/.test(core)) {
        const lead = /^\s/.test(val) ? '{" "}' : "";
        const trail = /\s$/.test(val) ? '{" "}' : "";
        const raw = node.getFullText(sf);
        const start = node.getFullStart() + raw.indexOf(raw.trimStart()[0]);
        const end = node.getEnd() - (raw.length - raw.trimEnd().length);
        const decoded = core.replace(/&nbsp;/g, " ").replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&ldquo;/g, "“").replace(/&rdquo;/g, "”").replace(/&amp;/g, "&");
        edits.push([start, end, `${lead}{tx(${q(decoded)})}${trail}`]);
      }
    } else if (ts.isJsxExpression(node) && node.expression && ts.isJsxElement(node.parent) | ts.isJsxFragment(node.parent)) {
      if (ts.isStringLiteral(node.expression) && /^\s+$/.test(node.expression.text)) {
      } else wrapExpr(node.expression);
    } else if (ts.isJsxAttribute(node) && ATTRS.has(node.name.getText(sf)) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) {
        const r = convert(init, sf);
        if (r && inFunction(node)) edits.push([init.getStart(sf), init.getEnd(), `{${r}}`]);
      } else if (ts.isJsxExpression(init)) wrapExpr(init.expression);
    } else if (ts.isPropertyAssignment(node) && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) && PROPS.has(node.name.text)) {
      wrapExpr(node.initializer);
    } else if (ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : "";
      if (CALLS.has(name)) for (const a of node.arguments) wrapExpr(a);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  if (!edits.length) return 0;
  edits.sort((a, b) => b[0] - a[0]);
  const kept = [];
  let lastStart = Infinity;
  for (const e of edits) if (e[1] <= lastStart) { kept.push(e); lastStart = e[0]; }
  let out = src;
  for (const [a, b, r] of kept) out = out.slice(0, a) + r + out.slice(b);
  if (!/import \{[^}]*\btx\b[^}]*\} from "@\/lib\/tx"/.test(out)) {
    const lines = out.split("\n");
    let last = -1;
    for (let i = 0; i < lines.length; i++) if (/^import .* from ['"]|^import ['"]|^\} from ['"]/.test(lines[i])) last = i;
    lines.splice(last + 1, 0, 'import { tx } from "@/lib/tx";');
    out = lines.join("\n");
  }
  fs.writeFileSync(file, out);
  return kept.length;
}

let total = 0;
for (const t of process.argv.slice(2)) {
  const abs = path.resolve(root, t);
  const files = fs.statSync(abs).isDirectory() ? fs.readdirSync(abs, { recursive: true }).filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")).map((f) => path.join(abs, f)) : [abs];
  for (const f of files) {
    const n = wrapFile(f);
    if (n) console.log(n, path.relative(root, f));
    total += n;
  }
}
console.log("total", total);
