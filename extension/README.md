# Extension Chrome ETHONE

Enregistre la page courante, un passage sélectionné ou un lien dans les notes/tâches ETHONE, et donne un accès rapide au dashboard.

## Fonctionnement

- L'extension ouvre `https://ethone.dev/clip#<clip>` ; le dashboard enregistre avec la session déjà ouverte. L'extension ne stocke aucun jeton, mot de passe ni compte.
- Le clip passe dans le `#hash`, qui n'est jamais envoyé au serveur. `lib/clip.ts` (dashboard) le borne et le valide.
- Permissions : `activeTab` + `scripting` (lire la sélection de l'onglet actif, uniquement sur action de l'utilisateur), `contextMenus` (clic droit), `https://ethone.dev/*` (statut via `/version.json`). Aucun script injecté sur les sites visités.
- Raccourcis : `Alt+Shift+E` ouvre la popup, `Alt+Shift+S` enregistre la page.

## Installer en local

`chrome://extensions` → Mode développeur → Charger l'extension non empaquetée → ce dossier.

## Publier sur le site

```bash
python extension/pack.py
```

Le zip part dans `ethone-next/public/downloads/ethone-extension.zip`, servi par la page `/extension`. Monter `version` dans `manifest.json` à chaque changement.
