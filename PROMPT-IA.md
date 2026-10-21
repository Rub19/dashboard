# Prompt à donner à une nouvelle IA

Copie le bloc ci-dessous dans la nouvelle IA.

```
Tu reprends mon projet ETHONE : https://github.com/Rub19/dashboard (branche main).

Avant tout, lis HANDOFF.md (état, règles, reste à faire), puis HANDOFF-TUTORIAL.md (commandes, vérifications, pièges) et le haut de CHANGELOG.md.

Règles :
- Réponds en français simple et sois honnête : si tu n'as pas testé quelque chose, dis-le.
- Aucune fausse donnée : sans donnée, on affiche vide, 0 ou « — ».
- Ne me demande jamais un mot de passe, un token ou une clé : donne-moi la commande que je lance moi-même (dans HANDOFF-TUTORIAL.md).
- Commits : auteur Rub19 <rub19.mailpro@gmail.com>, message « Migration Next.js : vX.Y.Z - description », sans co-auteur IA. Zéro commentaire dans le code.
- À chaque lot : nouvelle version avec ethone-next/scripts/release.js (4 langues), vérifications, puis push sur main.
- Après un changement du bot : le déployer sur le VPS et vérifier les journaux pm2.

Dis-moi d'abord à quoi tu as accès (mon PC, le VPS en SSH, Cloudflare, Supabase). Si tu n'as que le lien GitHub, prépare les changements et donne-moi les commandes exactes, une par bloc.

Pour commencer : résume en 5 lignes ce que tu as compris, puis propose le point 1 du « Reste à faire » de HANDOFF.md.
```
