/**
 * Génère components/icons/ph.tsx : un composant React (SVG en JSX) par icône Phosphor duotone, exporté
 * sous le NOM de l'icône Lucide qu'il remplace (Home, Trash2, CheckCircle2…). Les pages n'ont qu'à changer
 * leur import : `from "lucide-react"` -> `from "@/components/icons/ph"`.
 *
 * - Source : le paquet @iconify-json/ph (données Iconify, licence MIT) déjà installé : aucun réseau.
 * - Correspondance : scripts/lucide-to-ph.json (nom Lucide -> nom Phosphor ; "fill" = icônes avec variante pleine).
 * - Chaque icône est un composant séparé : le bundler n'embarque que celles utilisées (comme lucide-react).
 *
 * Usage (depuis ethone-next/) : node scripts/build-ph-icons.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const map = JSON.parse(await readFile(resolve(root, "scripts/lucide-to-ph.json"), "utf8"));
const ph = JSON.parse(await readFile(resolve(root, "node_modules/@iconify-json/ph/icons.json"), "utf8"));

const ATTR = {
  "fill-rule": "fillRule",
  "clip-rule": "clipRule",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-width": "strokeWidth",
  "stroke-miterlimit": "strokeMiterlimit",
};
const TAGS = new Set(["g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse"]);

/** Convertit le corps SVG d'Iconify (quelques balises simples) en JSX. */
function toJsx(body, label) {
  const out = body.replace(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g, (_, close, tag, attrs, self) => {
    if (!TAGS.has(tag)) throw new Error(`${label}: balise SVG non prévue <${tag}>`);
    if (close) return `</${tag}>`;
    const jsxAttrs = [...attrs.matchAll(/([\w:-]+)="([^"]*)"/g)]
      .map(([, k, v]) => `${ATTR[k] || k}="${v}"`)
      .join(" ");
    return `<${tag}${jsxAttrs ? " " + jsxAttrs : ""}${self ? " /" : ""}>`;
  });
  return out;
}

function resolveBody(name, style, label) {
  const key = `${name}-${style}`;
  let def = ph.icons[key];
  if (!def && ph.aliases?.[key]) {
    const a = ph.aliases[key];
    def = ph.icons[a.parent];
  }
  if (!def) throw new Error(`${label}: icône Phosphor introuvable : ${key}`);
  return toJsx(def.body, label);
}

const fillSet = new Set(map.fill);
const names = Object.keys(map.icons).sort();
let code = `// FICHIER GÉNÉRÉ par scripts/build-ph-icons.mjs — ne pas modifier à la main.
// Icônes Phosphor (duotone, licence MIT) exportées sous les noms des icônes Lucide qu'elles remplacent.
import { forwardRef, type ForwardRefExoticComponent, type ReactNode, type RefAttributes, type SVGProps } from "react";

export interface LucideProps extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  size?: number | string;
  /** Ignoré : les icônes duotone n'ont pas de trait réglable (présent pour la compatibilité). */
  strokeWidth?: number | string;
  absoluteStrokeWidth?: boolean;
}
export type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

function make(name: string, body: ReactNode, filled?: ReactNode): LucideIcon {
  const Icon = forwardRef<SVGSVGElement, LucideProps>(function PhIcon(
    { size = 24, strokeWidth: _strokeWidth, absoluteStrokeWidth: _absolute, fill, ...rest },
    ref
  ) {
    const useFilled = Boolean(filled) && fill !== undefined && fill !== "none";
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 256 256"
        width={size}
        height={size}
        fill="currentColor"
        aria-hidden="true"
        {...rest}
      >
        {useFilled ? filled : body}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

`;
for (const lucide of names) {
  const phName = map.icons[lucide];
  const body = resolveBody(phName, "duotone", lucide);
  const filled = fillSet.has(lucide) ? resolveBody(phName, "fill", lucide + " (fill)") : null;
  code += `export const ${lucide}: LucideIcon = /*#__PURE__*/ make(${JSON.stringify(lucide)}, <>${body}</>${filled ? `, <>${filled}</>` : ""});\n`;
}
await writeFile(resolve(root, "components/icons/ph.tsx"), code);
console.log(`components/icons/ph.tsx : ${names.length} icônes (${fillSet.size} avec variante pleine)`);
