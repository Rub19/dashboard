# ETHONE Performance Benchmark

Date: 11 juillet 2026  
Environnement: Chromium, serveur local `http://127.0.0.1:4173/`, cache desactive pour les mesures a froid.

## Resultat executif

| Metrique | Avant | Apres | Gain |
| --- | ---: | ---: | ---: |
| Landing `load` | 1 162 ms | 588 ms | 49,4 % |
| First Contentful Paint | 300 ms | 72 ms | 76,0 % |
| Largest Contentful Paint | 1 356 ms | 768 ms | 43,4 % |
| Dashboard utilisable apres auth | 1 975 ms | 532 ms | 73,0 % |
| Long tasks du montage dashboard | 1 336 ms | 583 ms | 56,4 % |
| Settings | 1 299 ms | 547 ms | 57,9 % |
| ETHONE AI | 1 475 ms | 427 ms | 71,1 % |
| Marketplace | 1 316 ms | 162 ms | 87,7 % |
| Files | 1 057 ms | 469 ms | 55,6 % |
| Notes | 1 369 ms | 223 ms | 83,7 % |

La borne haute sequentielle landing + montage dashboard est de **1,12 s**, sous l'objectif de 2 s. Le TTI est represente ici par le premier dashboard actif dont le groupe lazy est completement charge.

## Fluidite et memoire

- 598 frames observees sur 2,5 s dans le renderer de test.
- Intervalle median: 4,2 ms; p95: 4,3 ms; p99: 4,4 ms.
- 0 frame au-dessus du budget 16,7 ms apres stabilisation.
- 0 long task et 0 ms de layout pendant la mesure stabilisee.
- Heap utilise stabilise autour de 9,3 MB sur le dashboard chaud.
- 12 changements de page a chaud: 0 listener, 0 interval et 0 noeud DOM supplementaire.
- Le heap du stress test redescend de 16,1 MB a 13,9 MB sans collecte forcee.

Le compteur FPS du navigateur de test peut fonctionner au-dessus de 60 Hz. Le critere pertinent est donc l'absence de frame superieure a 16,7 ms, pas le nombre brut de callbacks `requestAnimationFrame`.

## Causes principales corrigees

1. Les scripts et feuilles de style lazy etaient charges en serie. Ils sont maintenant recuperes en parallele, avec ordre d'execution JS deterministe et deduplication des chargements concurrents.
2. Le systeme d'accessibilite rescannait le document entier a chaque mutation. Il traite maintenant uniquement les sous-arbres modifies.
3. Plusieurs tests de visibilite utilisaient `getComputedStyle`, `getBoundingClientRect` ou des proprietes de layout dans les chemins de navigation. Ils utilisent des etats structurels sans forcer de reflow.
4. Le moteur de fond dynamique forcait un calcul de style pour detecter Spotify. Il lit maintenant l'etat possede par le composant.
5. L'ecran d'authentification mesurait ses formulaires meme lorsqu'il etait masque. Les mesures sont suspendues hors de l'ecran login.
6. Le moteur d'icones et l'isolation UI rescannaient trop largement le DOM. Les mutations sont coalescees et filtrees.
7. Le personnalisateur de sidebar recreait 40 handlers de drag a chaque rendu. Il utilise maintenant cinq handlers delegues uniques; 12 navigations n'ajoutent plus aucun listener.
8. L'horloge remplacait quatre noeuds texte chaque seconde. Seule la valeur réellement modifiee est desormais ecrite, soit 75 % de churn DOM en moins.

## Poids des ressources

| Groupe | Requetes | Poids non compresse |
| --- | ---: | ---: |
| JS eager | 95 | 962,0 KB |
| CSS eager | 40 | 1 140,7 KB |
| JS lazy | 136 | 2 225,4 KB |
| CSS lazy | 47 | 705,1 KB |

Le chargement par page reste strictement lazy. Le montage du dashboard demande 18 ressources et 292 925 octets decodes; les pages lourdes ne sont pas telechargees au boot. Les correctifs ajoutent environ 5 KB de garde-fous JS non compresses mais divisent fortement le travail d'execution.

Les 95 scripts et 40 feuilles de style eager restent une dette de packaging. Leur fusion necessite une vraie chaine de build et de tree-shaking; elle n'a pas ete simulee par une concatenation risquee. Des budgets automatiques empechent desormais toute croissance silencieuse.

## Reproduction

Inventaire statique:

```powershell
& 'C:\Users\storm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' tests/performance-inventory.js artifacts/performance-benchmark/bundle-inventory-after.json
```

Budgets et contrats runtime:

```powershell
& 'C:\Users\storm\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --test tests/performance-budget.test.js tests/performance-runtime-contract.test.js
```

Les donnees completes sont disponibles dans `benchmark-results.json`, `bundle-inventory-before.json` et `bundle-inventory-after.json`.

## Limites de la mesure

- Les temps reseau correspondent au serveur local, sans latence CDN ni API distante.
- Le chemin Supabase reel n'a pas ete sollicite; le montage post-auth utilise un profil synthetique isole.
- La consommation CPU est mesuree via le temps de tache du renderer Chromium, pas via un compteur OS global.
- Les valeurs sont des mesures de laboratoire reproductibles, pas des promesses absolues sur chaque machine.

