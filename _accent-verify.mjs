import fs from "node:fs";
import path from "node:path";

const cssFiles = ["shell.css", "activity.css", "workspaces.css", "entry.css", "components.css", "base.css", "tokens.css", "presence.css"]
  .map((name) => `v8/styles/${name}`)
  .filter((f) => fs.existsSync(f));
const cssText = cssFiles.map((f) => fs.readFileSync(f, "utf8")).join("\n");

// Every class name literally declared in CSS (the ground truth of what must match).
const cssClassNames = new Set();
const classRe = /\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g;
let m;
while ((m = classRe.exec(cssText))) cssClassNames.add(m[1]);

function stripAccents(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

const dirs = ["v8/pages", "v8/ui", "v8/core", "v8/services", "v8/command", "v8/entry", "v8/app", "v8/data", "v8/brain"];
const issues = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { walk(path.join(dir, entry.name)); continue; }
    if (!entry.name.endsWith(".mjs")) continue;
    const filePath = path.join(dir, entry.name);
    const text = fs.readFileSync(filePath, "utf8");

    // 1. className strings containing accented chars where the de-accented form IS a real CSS class.
    const classNameRe = /className:\s*`?"?([^"`\n]*)/g;
    const stringLiteralRe = /"([^"\\]|\\.)*"/g;
    let sm;
    while ((sm = stringLiteralRe.exec(text))) {
      const raw = sm[0].slice(1, -1);
      if (!/[àâäéèêëïîôöùûüÿçœæÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒÆ]/.test(raw)) continue;
      // split into space-separated tokens (class name strings can have several classes)
      raw.split(/\s+/).forEach((token) => {
        if (!/^[-a-zA-Zàâäéèêëïîôöùûüÿçœæ0-9]+$/.test(token)) return;
        if (!/[àâäéèêëïîôöùûüÿçœæ]/.test(token)) return;
        const deaccented = stripAccents(token);
        if (cssClassNames.has(deaccented) && !cssClassNames.has(token)) {
          const line = text.slice(0, sm.index).split("\n").length;
          issues.push({ file: filePath, line, kind: "css-class", token, deaccented });
        }
      });
    }

    // 2. HTML tag names passed as element("tagname", ...) that contain accents (always invalid).
    const tagRe = /element\("([a-zàâäéèêëïîôöùûüÿçœæ]+)"/g;
    let tm;
    while ((tm = tagRe.exec(text))) {
      if (/[àâäéèêëïîôöùûüÿçœæ]/.test(tm[1])) {
        const line = text.slice(0, tm.index).split("\n").length;
        issues.push({ file: filePath, line, kind: "html-tag", token: tm[1], deaccented: stripAccents(tm[1]) });
      }
    }

    // 3. import specifiers still containing accents (should be none after the earlier fix).
    const importRe = /from\s+"([^"]*\.mjs)"/g;
    let im;
    while ((im = importRe.exec(text))) {
      if (/[àâäéèêëïîôöùûüÿçœæÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇŒÆ]/.test(im[1])) {
        const line = text.slice(0, im.index).split("\n").length;
        issues.push({ file: filePath, line, kind: "import-path", token: im[1], deaccented: stripAccents(im[1]) });
      }
    }

    // 4. data-* attribute selector strings with accents.
    const dataAttrRe = /\[data-([a-zàâäéèêëïîôöùûüÿçœæ-]+)/g;
    let dm;
    while ((dm = dataAttrRe.exec(text))) {
      if (/[àâäéèêëïîôöùûüÿçœæ]/.test(dm[1])) {
        const line = text.slice(0, dm.index).split("\n").length;
        issues.push({ file: filePath, line, kind: "data-attr", token: `data-${dm[1]}`, deaccented: `data-${stripAccents(dm[1])}` });
      }
    }

    // 5. setAttribute("role"/"aria-*"/other well-known attrs, corrupted)
    const setAttrRe = /setAttribute\("([a-zàâäéèêëïîôöùûüÿçœæ-]+)"/g;
    let sam;
    while ((sam = setAttrRe.exec(text))) {
      if (/[àâäéèêëïîôöùûüÿçœæ]/.test(sam[1])) {
        const line = text.slice(0, sam.index).split("\n").length;
        issues.push({ file: filePath, line, kind: "setAttribute-name", token: sam[1], deaccented: stripAccents(sam[1]) });
      }
    }
  }
}

dirs.forEach(walk);
issues.forEach((i) => console.log(`[${i.kind}] ${i.file}:${i.line}: "${i.token}" (should be "${i.deaccented}"?)`));
console.log(`\nTotal issues: ${issues.length}`);
