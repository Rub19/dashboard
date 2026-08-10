# ETHONE — Dashboard Next.js

Client dashboard Next.js pour le projet ETHONE.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router, export statique)
- [React](https://react.dev/) 19 + TypeScript
- [Tailwind CSS](https://tailwindcss.com/) 4
- [Framer Motion](https://www.framer.com/motion/) pour les animations
- [Supabase](https://supabase.com/) Auth
- Worker Cloudflare (API externe) configuré via `NEXT_PUBLIC_WORKER_URL`

## Structure

- `app/` : pages et layouts
- `components/` : composants réutilisables
- `lib/` : API, hooks, OAuth, i18n, settings
- `public/` : PWA (manifest, service worker, icônes)

## Scripts

```bash
npm run dev      # lance le serveur de développement
npm run build    # génère l'export statique dans dist/
npm run start    # sert le build
npm run lint     # ESLint
npm run test     # typecheck + lint + build
```

## Variables d'environnement

Crée un fichier `.env.local` à la racine d'`ethone-next` :

```env
NEXT_PUBLIC_WORKER_URL=https://<worker>.workers.dev
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

## Déploiement

Le build est exporté statiquement dans `dist/` (`output: "export"` dans `next.config.ts`).

- Développement : `npm run dev` sur <http://localhost:3000>
- Production : `npm run build` puis héberge le dossier `dist/` (ex. Vercel, Netlify, Cloudflare Pages, GitHub Pages)

## PWA

Le manifeste et le service worker se trouvent dans `public/`. Le cache du service worker est versionné dans `public/sw.js`.
