# ETHONE — passation (2026-10-21, version 1.78.5)

État du projet, règles et reste à faire. Le « comment travailler » détaillé (commandes, pièges, vérifications) est dans `HANDOFF-TUTORIAL.md`.

## Le projet

| Dossier | Quoi | Où ça tourne |
|---|---|---|
| `ethone-next/` | Site Next.js 16 en export statique (dashboard, mail, tracker, console Discord, vitrine `/bot`, docs) | Cloudflare Pages, déployé automatiquement à chaque push sur `main` (ethone.dev) |
| `discord-bot/` | Bot Discord « Etho » (discord.js) + API Express | VPS `ssh vps`, pm2 `ethone-bot`, dossier `~/dashboard`, exposé par Caddy sur `bot.ethone.dev` |
| `worker/` | Cloudflare Worker `raspy-fog-bf5b` (API du site : stats, Riot/HenrikDev, IA, mail…) | Cloudflare, `npx wrangler deploy` depuis `worker/` |
| `ios/` | App iOS native SwiftUI (iOS 26, Liquid Glass), dont le tracker VALORANT « E:VAL » | Compilée uniquement par GitHub Actions (`build-ios.yml`), IPA non signée |
| `android/` | App Android native (Kotlin) | GitHub Actions (`build-android.yml`) |
| `extension/` | Extension navigateur | Fiche Web Store dans `extension/store/` |
| `supabase/` | Migrations SQL | Projet Supabase `bvgifyzhpzkbrwdjrqsg` |
| `godot-game/` | Mini-jeu Godot | — |

Musique du bot : Lavalink tourne sur le NAS (`ssh nas`), relié au VPS par des tunnels SSH inverses (ports 2333 et 8765 en local sur le VPS).

## Règles de l'utilisateur (à respecter partout)

- **Aucune fausse donnée** : pas de démo, pas de valeur inventée ou codée en dur. Sans donnée : vide, `0` ou `—`.
- **Honnêteté** : ne dire « fait » que ce qui est vérifié ; dire clairement ce qui n'a pas été testé.
- **Français**, simple, sans jargon.
- **Chaque lot = nouvelle version + deux changelogs** (`CHANGELOG.md` et `ethone-next/data/changelog.ts` en fr/en/es/de), puis push direct sur `main`.
- **Commits** : auteur `Rub19 <rub19.mailpro@gmail.com>`, message « Migration Next.js : vX.Y.Z - description », **sans ligne de co-auteur IA**.
- **Zéro commentaire** dans le code source créé ou modifié.
- **Secrets** : ne jamais en demander ni en utiliser un collé dans le chat ; le faire régénérer et donner une commande où l'utilisateur le tape lui-même (voir le tutoriel).
- Ne jamais committer `discord-bot/scripts/etho-avatar-animated.gif` ni `.mcp.json`.
- Déploiements autorisés (« je te laisse tout faire ») : les annoncer ; sauvegarder `discord-bot/data` avant toute opération risquée sur le VPS.

## Ce qui a changé récemment (v1.75.109 → v1.78.3)

### App iOS — tracker E:VAL (v1.76 → v1.78)
- E:VAL s'ouvre comme une app à part, en plein écran, avec sa propre barre d'onglets Liquid Glass (Jeu, Profil, Hub, Paramètres) ; retour à Ethone depuis Paramètres ou en glissant depuis le bord gauche.
- Données réelles uniquement : matchs, rang et carrière via HenrikDev **à travers le Worker** (throttle par compte, matchs stockés une fois dans Supabase `ethone_valorant_matches`), images et catalogues via valorant-api.com, rang en direct et contenus perso via le compte Riot de l'utilisateur (connexion sur la page officielle Riot, jetons dans le Keychain).
- Onglet Jeu : boutique, portefeuille, équipement modifiable, groupe (prêt, public/privé, file, recherche, code, serveurs avec ping, invitation par Riot ID), contrats (missions, passe de combat avec projection, XP du compte, contrats d'agents), historique des achats lu sur la page support de Riot.
- Le rang actuel vient des serveurs Riot (HenrikDev s'arrête à la dernière partie) ; place au classement affichée.
- Thème Système/Sombre/Clair et couleur d'accentuation appliqués à tout E:VAL.
- Refusé volontairement : liste d'amis Riot en direct, présence et chat (protocole de chat Riot).

### Site
- 0 avertissement au lint (images `<img>` acceptées dans la config car l'export statique n'optimise pas les images), réglages synchronisés enregistrés dans le bon profil, notes de version manquantes rétablies.
- Mail : le contenu, l'objet et l'expéditeur se sélectionnent de nouveau.

### Sécurité (2026-10-21)
- Pas de PHP dans le projet ni sur le serveur.
- VPS : pare-feu ufw actif (seuls 22, 80, 443 ouverts), fail2ban sur SSH, mises à jour installées, redémarrage effectué. Cockpit (9090) et le bureau à distance (3389) ne sont plus joignables depuis Internet : passer par un tunnel SSH. Le bot redémarre seul au boot (`pm2-ubuntu`).
- Workflows GitHub en lecture seule. Ancien dashboard Vite du bot (`discord-bot/web`) et son Dockerfile supprimés : 0 alerte Dependabot.

## Qualité au 2026-10-21

- Site : TypeScript 0 erreur, lint 0 avertissement, 387/387 tests unitaires, build OK.
- Worker : 317/317 tests.
- iOS : compile sur la CI ; **jamais testé automatiquement sur un appareil** (les retours viennent des captures de l'utilisateur).

## Reste à faire

1. **E:VAL sur iPhone** : l'utilisateur teste et envoie des captures (souvent comparées à l'app VALPAW). Points jamais vérifiés sur appareil : actions du groupe (le nom du champ « code de groupe » dans la réponse Riot est supposé), XP du compte, contrats d'agents, cadrage des portraits d'agents autres que Jett, mode clair.
2. **SSH du VPS** : il accepte encore les mots de passe. À couper (`PasswordAuthentication no`) seulement avec l'accord de l'utilisateur.
3. **Supabase** : activer la protection contre les mots de passe divulgués (tableau de bord, Auth → Password security) ; l'utilisateur doit le faire.
4. **Commentaires** : du code Swift/TypeScript récent contient des commentaires, contraire à la règle zéro commentaire ; à retirer au fil des modifications.
5. **Pages Documentation du bot** (`/docs`, `/documentation`, `components/docs/DocumentationView.tsx`) : à recouper avec les vraies commandes du bot avant toute refonte.
