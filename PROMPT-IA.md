# Prompt à donner à une nouvelle IA (avec le lien du repo)

Copie tout le bloc ci-dessous, colle-le dans la nouvelle IA, et c'est tout.

---

```
Tu reprends mon projet ETHONE. Le code est ici : https://github.com/Rub19/dashboard (branche main).

Avant de faire quoi que ce soit, lis ces fichiers du repo, dans cet ordre :
1. HANDOFF.md : l'état actuel (version 1.55.2, 4 octobre 2026), l'architecture, les règles et la liste « Reste à faire ».
2. AGENTS.md : les conventions du code.
3. Le haut de CHANGELOG.md : les dernières versions.
Si besoin d'historique : HANDOFF-TUTORIAL.md et docs/archive/HANDOFF-2026-09.md (en partie dépassés).

Le projet en bref :
- ethone-next/ : le site https://ethone.dev (Next.js en export statique, Cloudflare Pages ; un push sur main le déploie).
- discord-bot/ : le bot Discord « Etho » (discord.js + API Express, sur un VPS avec pm2, exposé sur bot.ethone.dev).
- worker/ : un Cloudflare Worker (stats Riot/Valorant, OAuth, proxys).
- supabase/ : les migrations de la base Supabase (comptes, profils, synchronisation entre appareils).
- ios/ : une app iOS SwiftUI compilée uniquement par GitHub Actions.

Règles à respecter absolument :
- Réponds-moi en français simple et sois honnête : si tu n'as pas testé quelque chose, dis-le.
- Aucune fausse donnée dans le site : pas de démo ni de valeur inventée. Sans donnée, on affiche vide, 0 ou « — ».
- Ne me demande jamais de te coller un mot de passe, un token ou une clé. Si un secret est nécessaire, donne-moi une commande que je lance moi-même.
- Commits en français, au format « Migration Next.js : vX.Y.Z - description », auteur Rub19 <rub19.mailpro@gmail.com>, sans ligne de co-auteur IA.
- Ne jamais committer discord-bot/scripts/etho-avatar-animated.gif ni .mcp.json.
- À chaque lot de changements : monter la version et les deux changelogs avec `node ethone-next/scripts/release.js` (mode d'emploi dans HANDOFF.md), puis lancer build, tsc, lint et tests avant de pousser.
- Interface : animations fluides de style Apple (ressorts sans rebond, retour immédiat au clic, respect de « réduire les animations »), couleurs via les variables de thème, lisible aussi en thème clair.

Si tu n'as pas accès à mon PC (terminal, VPS, Cloudflare, Supabase), dis-le-moi dès le début. Dans ce cas, prépare les changements et donne-moi les commandes exactes à lancer.

Pour commencer : résume-moi en 5 lignes ce que tu as compris du projet, puis propose de t'attaquer au point 1 de « Reste à faire » dans HANDOFF.md.
```
