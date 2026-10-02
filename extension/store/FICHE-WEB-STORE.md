# Publication Chrome Web Store — ETHONE 1.1.0

Tout est prêt à copier-coller dans le tableau de bord développeur :
https://chrome.google.com/webstore/devconsole (compte développeur Google, 5 $ une fois).

## Fichiers à envoyer

| Champ du formulaire | Fichier |
|---|---|
| Package (« Ajouter un élément ») | `store/ethone-webstore.zip` (manifest à la racine, régénéré par `python extension/pack.py`) |
| Icône de la boutique 128×128 | `icons/icon-128.png` |
| Captures d'écran 1280×800 | `store/screenshot-1.png`, `store/screenshot-2.png` |
| Petite vignette promotionnelle 440×280 | `store/promo-tile-440x280.png` |

Les captures se régénèrent avec `node extension/store/shots.mjs` (vraie popup rendue par Playwright).

## Fiche « Store listing »

- **Nom** : ETHONE (repris du manifest)
- **Catégorie** : Productivité → Outils
- **Langue** : Français (ajouter l'anglais avec le texte plus bas si tu veux une 2ᵉ langue)
- **Site officiel** : https://ethone.dev/extension
- **Assistance** (facultatif) : https://ethone.dev/extension — les pages publiques sont /extension, /privacy et /terms

**Résumé** (repris du manifest, 132 caractères max) :
> Enregistre une page, un passage ou une note rapide dans tes notes et tâches ETHONE, et ouvre ton espace en un clic.

**Description (FR)** :

```
ETHONE dans ton navigateur : garde ce que tu trouves sur le web sans changer d'onglet.

• Enregistrer la page : le titre et le lien partent dans tes notes ETHONE.
• Enregistrer un passage : sélectionne du texte, il est joint à la note.
• Ajouter comme tâche : la même chose, mais dans tes tâches.
• Note rapide : une idée ou une chose à faire, tapée directement dans la popup.
• Clic droit sur une sélection : « Enregistrer dans ETHONE » ou « Ajouter comme tâche ».
• Barre d'adresse : tape « eth » puis ton texte pour créer une note, « eth tâche … » pour une tâche.
• Accès rapide : accueil, notes, tâches, Brain, calendrier et bot Discord (touches 1 à 6).
• Raccourcis : Alt+Maj+E ouvre la popup, Alt+Maj+S enregistre la page.

Respect de ta vie privée : l'extension ne lit la page que lorsque tu l'utilises, ne stocke ni mot de passe ni jeton (elle passe par ta session ethone.dev déjà ouverte), n'injecte rien dans les sites visités et ne suit pas ta navigation.

Nécessite un compte ETHONE (https://ethone.dev).
```

**Description (EN)** :

```
ETHONE in your browser: keep what you find on the web without switching tabs.

• Save the page: its title and link go to your ETHONE notes.
• Save a passage: select text and it is attached to the note.
• Add as a task: the same, but into your tasks.
• Quick note: type an idea or a to-do right in the popup.
• Right-click a selection: “Save to ETHONE” or “Add as task”.
• Address bar: type “eth” then your text to create a note, “eth tâche …” for a task.
• Quick access: home, notes, tasks, Brain, calendar and Discord bot (keys 1 to 6).
• Shortcuts: Alt+Shift+E opens the popup, Alt+Shift+S saves the page.

Privacy first: the extension only reads the page when you use it, stores no password or token (it relies on your existing ethone.dev session), injects nothing into the sites you visit and does not track your browsing.

Requires an ETHONE account (https://ethone.dev).
```

## Onglet « Pratiques de confidentialité »

**Objectif unique** :
> Enregistrer la page, le texte sélectionné ou une note rapide dans les notes et tâches de l'utilisateur sur ethone.dev, et ouvrir rapidement les pages d'ETHONE.

**Justification des autorisations** :

| Autorisation | Justification |
|---|---|
| `activeTab` | Lire le titre et l'adresse de l'onglet actif uniquement quand l'utilisateur clique sur l'extension, son raccourci ou le menu clic droit, pour les enregistrer dans ETHONE. |
| `scripting` | Lire le texte sélectionné dans l'onglet actif (un seul appel `getSelection()`), uniquement à la demande de l'utilisateur, pour l'ajouter à la note. Aucun script permanent n'est injecté. |
| `contextMenus` | Ajouter « Enregistrer dans ETHONE » et « Ajouter comme tâche » au clic droit sur une sélection. |
| Hôte `https://ethone.dev/*` | Afficher le statut du service (lecture de `https://ethone.dev/version.json`) et ouvrir la page d'enregistrement d'ETHONE. |
| Code distant | **Non**, tout le code est dans le package. |

**Données collectées** (cocher) :
- ☑ **Contenu du site Web** (titre, adresse, texte sélectionné) — uniquement quand l'utilisateur enregistre une page.
- Tout le reste : **non**.

**Certifications** (cocher les trois) :
- ☑ Je ne vends ni ne transfère les données des utilisateurs à des tiers, en dehors des cas d'utilisation approuvés.
- ☑ Je n'utilise ni ne transfère les données des utilisateurs à des fins sans rapport avec l'objectif unique de mon article.
- ☑ Je n'utilise ni ne transfère les données des utilisateurs pour déterminer leur solvabilité ou à des fins de prêt.

**Règles de confidentialité (URL)** : https://ethone.dev/privacy#extension

## Onglet « Distribution »

- Visibilité : **Public** (ou « Non répertorié » pour un lien privé d'abord).
- Pays : tous.

## Après l'acceptation

Remplacer le bouton de téléchargement de https://ethone.dev/extension par le lien du Web Store (me donner l'adresse de la fiche, je m'en occupe).
