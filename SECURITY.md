# Politique de sécurité

## Signaler une faille

Ne publie pas de faille dans une issue publique. Utilise **Security → Report a vulnerability** sur ce dépôt GitHub (signalement privé). Indique la partie touchée (site ethone.dev, bot Etho, Worker, apps iOS/Android), les étapes pour reproduire et l'impact.

## Périmètre

| Partie | Hébergement |
|---|---|
| Site `ethone.dev` (Next.js, export statique) | Cloudflare Pages |
| API du site (Worker `raspy-fog-bf5b`) | Cloudflare Workers |
| Bot Etho et son API (`bot.ethone.dev`) | VPS derrière Caddy (HTTPS) |
| Données | Supabase (RLS activée) |
| Apps iOS et Android | Compilées par GitHub Actions |

## Mesures en place

- En-têtes de sécurité sur le site, le Worker et le bot : HSTS, CSP, `X-Frame-Options: DENY`, `nosniff`.
- Aucun secret dans le dépôt : les clés vivent dans les secrets Cloudflare, le `.env` du VPS ou les secrets GitHub. Contrôle avant chaque commit : `node scripts/precommit-upload-check.mjs` et `node scripts/audit-security.mjs`.
- VPS : pare-feu limité à SSH, HTTP et HTTPS, fail2ban sur SSH, services internes joignables uniquement en local.
- Workflows GitHub en lecture seule sur le dépôt.
- E-mails reçus affichés dans une iframe isolée, après assainissement du HTML.
