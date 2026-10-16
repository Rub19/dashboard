import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const DIRS = ["components/discord", "app/discord"];
const HAS_TEXT = /[A-Za-zÀ-ÿ]{2}/;
const NOT_TEXT = /^([a-z0-9_:\-./#]+|https?:.*|#?[0-9a-f]{3,8}|[A-Z0-9_]+)$/;
const PROPS = new Set(["label", "hint", "title", "description", "desc", "placeholder"]);
const keys = new Set();

const lits = (n, out) => {
  if (!n) return;
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(n.text);
  else if (ts.isConditionalExpression(n)) (lits(n.whenTrue, out), lits(n.whenFalse, out));
  else if (ts.isParenthesizedExpression(n)) lits(n.expression, out);
};
const inFunction = (node) => {
  for (let n = node.parent; n; n = n.parent) if (ts.isFunctionLike(n)) return true;
  return false;
};
const add = (s) => {
  if (HAS_TEXT.test(s) && !NOT_TEXT.test(s)) keys.add(s);
};

for (const dir of DIRS) {
  for (const rel of fs.readdirSync(path.join(root, dir), { recursive: true })) {
    if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue;
    if (rel.includes(".test.")) continue;
    const file = path.join(root, dir, rel);
    const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = (n) => {
      if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "tx") {
        const out = [];
        lits(n.arguments[0], out);
        out.forEach(add);
      }
      if (!inFunction(n)) {
        if (ts.isPropertyAssignment(n) && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name)) && PROPS.has(n.name.text)) {
          const out = [];
          lits(n.initializer, out);
          out.forEach(add);
        }
        if (ts.isArrayLiteralExpression(n) && n.elements.length >= 2 && n.elements.length <= 3 && ts.isArrayLiteralExpression(n.parent)) {
          for (const el of n.elements.slice(1)) {
            const out = [];
            lits(el, out);
            out.forEach((s) => /\s|[À-ÿ]/.test(s) || /^[A-ZÀ-Ý]/.test(s) ? add(s) : null);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
}

const out = process.argv[2];
const sorted = [...keys].sort();
if (out) {
  const existing = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : {};
  console.log(JSON.stringify(sorted.filter((k) => !(k in existing)), null, 1));
} else console.log(JSON.stringify(sorted, null, 1));
