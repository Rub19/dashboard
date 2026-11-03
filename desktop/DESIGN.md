# Ethone Desktop : design system

Tout le style vit dans `src/style.css` : les jetons en haut du fichier, l'habillage des composants dans la section « Design system » à la fin. L'installateur importe le même fichier.

## Jetons
- Couleurs : `--window`, `--sidebar`, `--row`, `--control`, `--fg`, `--muted`, `--faint`, `--line`, `--accent`, `--accent-text`, `--success`, `--warning`, `--danger`. Valeurs sombre et clair définies une seule fois. Les couleurs d'accent sont dans `ACCENTS` de `src/settings.ts`.
- Rayons : `--r-xs` 6, `--r-s` 8, `--r-m` 12, `--r-l` 16. Espacements : `--gap-1` à `--gap-5`. Contrôles : `--control-h` 30.
- Matière : `--glass` et `--popup` pour la barre latérale, les menus, le panneau latéral, la recherche, les notifications et les infobulles. Ombres : `--shadow`, `--shadow-float`, `--shadow-control`.
- Mouvement : `--ease`, ressorts dans `src/motion.ts`. Pas d'animation de plus de 300 ms. Réduction des animations, de la transparence et contraste élevé respectés.
- Préférences : `src/settings.ts` valide et applique la densité, la taille du texte, la réduction du mouvement et les surfaces opaques. Les choix agissent immédiatement et sont restaurés avant le premier rendu.

## Composants communs
- `src/kit.tsx` : `PageHead`, `Tabs`, `SideNav`, `Drawer`, `Status`, `Skeletons`, `Empty`, `ErrorBox`, `Field`, `Stat`.
- `src/ui.tsx` : `Button`, `WindowControls`.
- `src/generic.tsx` : `ConfigForm`, `JsonList`, `JsonFields`, `ColorField`.
- `src/qol.tsx` : `usePersisted` (mémorise un onglet), `toast`, `undoable`, `contextMenu`, `copyText`, infobulles.

## Raccourcis
Ctrl+K recherche, Ctrl+1 à 9 pages, Ctrl+, réglages, Ctrl+B barre latérale, Ctrl+F champ de recherche de la page, F5 actualiser, Alt+Gauche ou bouton Précédent de la souris pour revenir, Échap pour fermer.
