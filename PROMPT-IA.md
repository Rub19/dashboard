# Prompt à donner à une nouvelle IA (avec le lien du repo)

Copie tout le bloc ci-dessous, colle-le dans la nouvelle IA, et c'est tout.

---

```
Tu reprends mon projet ETHONE. Le code est ici : https://github.com/Rub19/dashboard (branche main).

Avant de faire quoi que ce soit, lis en entier HANDOFF.md à la racine du repo. Il contient :
- l'état actuel (version 1.55.2, 4 octobre 2026) ;
- les machines : le site sur Cloudflare Pages, le bot sur mon VPS (alias SSH « vps », pm2 « ethone-bot »), Lavalink sur mon NAS, le Cloudflare Worker, la base Supabase ;
- TOUTES les commandes : installation, build, tests, sortie de version, déploiement du bot sur le VPS, journaux, worker, Supabase, git ;
- les règles à respecter ;
- la liste « Reste à faire », par priorité.
Lis ensuite AGENTS.md (conventions du code ; sa dernière section est datée) et le haut de CHANGELOG.md.

Règles à respecter absolument :
- Réponds-moi en français simple et sois honnête : si tu n'as pas testé quelque chose, dis-le.
- Aucune fausse donnée dans le site : pas de démo ni de valeur inventée. Sans donnée, on affiche vide, 0 ou « — ».
- Ne me demande jamais de te coller un mot de passe, un token ou une clé. Si un secret est nécessaire, donne-moi la commande que je lance moi-même (elles sont dans HANDOFF.md).
- Commits en français, au format « Migration Next.js : vX.Y.Z - description », auteur Rub19 <rub19.mailpro@gmail.com>, sans ligne de co-auteur IA.
- Ne jamais committer discord-bot/scripts/etho-avatar-animated.gif ni .mcp.json.
- À chaque lot de changements : sortir une version avec la procédure « Sortir une version » de HANDOFF.md (release.js, build, tsc, lint, tests, audits), puis pousser sur main.
- Après un changement du bot, le déployer sur le VPS avec la commande de HANDOFF.md et vérifier les journaux pm2.
- Avant une opération risquée sur le VPS, sauvegarder discord-bot/data dans ~/backups.
- Interface : animations fluides de style Apple (ressorts sans rebond, retour immédiat au clic, respect de « réduire les animations »), couleurs via les variables de thème, lisible aussi en thème clair.

Dis-moi dès le début à quoi tu as accès : mon PC (terminal dans C:\Claude\dashboard), le VPS en SSH, Cloudflare (wrangler), Supabase. Si tu n'as que le lien GitHub, prépare les changements et donne-moi les commandes exactes à lancer, une par bloc.

Pour commencer : résume-moi en 5 lignes ce que tu as compris du projet, puis propose de t'attaquer au point 1 de « Reste à faire » dans HANDOFF.md.
```
