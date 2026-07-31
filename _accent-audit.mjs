import fs from "node:fs";
import path from "node:path";
import { V8_SOURCE_KEYS } from "./v8/i18n/catalog.mjs";

const registered = new Set(V8_SOURCE_KEYS.map((s) => s.replace(/\s+/g, " ").trim()));

const DYNAMIC_PATTERNS = [
  /^\d+\s+(note|notes|priorite|priorites|evenement|evenements|mot|mots|commande|commandes|signal|signaux|element|elements)$/iu,
  /^\d+\s+a faire$/u,
  /^(Bonjour|Bon apres-midi|Bonsoir|Encore eveille),\s+.+/u,
  /^\d{4}-\d{2}-\d{2},\s+\d+\s+(evenement|evenements)$/u,
  /^Profil\s+.+,\s+reponses\s+.+,\s+automatisation\s+.+\.$/u,
  /^Les donnees du profil\s+.+\s+seront supprimees.+irreversible\.$/u,
  /^Actualise a\s+\d{2}:\d{2}$/u,
  /^A l'ouverture de\s+.+$/u,
  /^Au passage vers\s+.+$/u,
  /^Chaque jour a\s+\d{2}:\d{2}$/u,
  /^->\s+.+$/u,
  /^Niveau actuel\s*:\s*.+$/u,
  /^.+\s+-\s+systeme$/u,
  /^Retirer\s+.+\s+du Dock$/u,
  /^Ajouter\s+.+\s+au Dock$/u,
  /^Deplacer\s+.+\s+a gauche$/u,
  /^Deplacer\s+.+\s+a droite$/u,
  /^Deplacer\s+.+$/u,
  /^Selectionner\s+.+$/u,
  /^Actions pour\s+.+$/u,
  /^Autoriser\s+.+$/u,
  /^Memoriser\s+.+$/u,
  /^Retirer\s+.+\s+des favoris$/u,
  /^Epingler\s+.+$/u,
  /^Gerer\s+.+$/u,
  /^Supprimer\s+.+$/u,
  /^Terminer\s+.+$/u,
  /^Rouvrir\s+.+$/u,
  /^Modifier\s+.+$/u,
  /^.+,\s+verrouille$/u,
  /^Profil\s+.+\s+selectionne\.$/u,
  /^Profil\s+.+\s+cree\.$/u,
  /^Profil\s+.+\s+mis a jour\.$/u,
  /^Profil\s+.+\s+supprime\.$/u,
  /^Connexion\s+.+\s+impossible\.$/u,
  /^Ouverture de\s+.+\.$/u,
  /^Accent\s+.+\s+applique$/u,
  /^.+\s+sera disponible dans ETHONE$/u,
  /^Ouvrir\s+.+$/u,
  /^.+\s+rejoint ETHONE\.$/u,
  /^.+\s+ajoute\.$/u,
  /^.+\s+ouvert$/u,
  /^.+\s+·\s+.+$/u
];

function isDynamic(text) {
  return DYNAMIC_PATTERNS.some((re) => re.test(text));
}

const ACCENT_TELLS = [
  "personnalise", "personnalisee", "preference", "preferences", "parametre", "parametres",
  "connecte", "connectee", "deconnecte", "deconnectee", "actualise", "actualisee",
  "evenement", "evenements", "necessaire", "necessaires", "cree", "creee", "creer",
  "modifie", "modifiee", "supprime", "supprimee", "genere", "generee", "recupere", "recuperee",
  "termine", "terminee", "preparee", "prepare", "reussi", "reussie", "echoue", "echouee",
  "indisponible", "selectionne", "selectionnee", "reference", "derniere", "premiere",
  "entiere", "complete", "securise", "securisee", "activite", "activites", "priorite",
  "priorites", "operation", "operations", "recente", "recentes", "annee",
  "annees", "donnee", "donnees", "reseau", "systeme", "utilisateur", "utilisateurs",
  "categorie", "categories", "resultat", "resultats", "erreur", "erreurs", "reponse",
  "reponses", "acces", "verifie", "verifiee", "verification", "identifie", "identifiee",
  "specifie", "specifiee", "detaille", "detaillee", "integre", "integree", "importe",
  "importee", "exporte", "exportee", "programme", "programmee", "traite", "traitee"
];

const tellPattern = new RegExp(`\\b(${ACCENT_TELLS.join("|")})\\b`, "i");

const dirs = ["v8/pages", "v8/ui", "v8/core", "v8/services", "v8/command", "v8/entry", "v8/app", "v8/data"];
const results = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { walk(path.join(dir, entry.name)); continue; }
    if (!entry.name.endsWith(".mjs")) continue;
    const filePath = path.join(dir, entry.name);
    const text = fs.readFileSync(filePath, "utf8");
    const stringLiteralRe = /"([^"\\]|\\.)*"/g;
    let match;
    while ((match = stringLiteralRe.exec(text))) {
      const raw = match[0].slice(1, -1);
      if (!tellPattern.test(raw)) continue;
      const clean = raw.replace(/\s+/g, " ").trim();
      if (registered.has(clean)) continue;
      if (isDynamic(clean)) continue;
      const line = text.slice(0, match.index).split("\n").length;
      results.push({ file: filePath, line, text: raw });
    }
  }
}

dirs.forEach(walk);
results.forEach((r) => console.log(`${r.file}:${r.line}: "${r.text}"`));
console.log(`\nTotal: ${results.length}`);
