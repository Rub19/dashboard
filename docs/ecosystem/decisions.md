# Décisions techniques

Validées par Rub19 le 2 novembre 2026, sauf mention contraire.

## 1. Chaque application garde son dépôt

Le code de Kairo, HDV Tracker, Nova PC Suite, Interior OS et Ethone Breach reste dans son dépôt. `dashboard` contient Ethone Desktop, le catalogue et l'intégration. Une amélioration de Kairo se fait dans `Rub19/ethra`, sans toucher `dashboard`.

## 2. Ethone Desktop en Tauri 2

Les quatre applications Windows sont déjà en Tauri 2. Leurs flux utilisent minisign, que Rust vérifie directement. Electron n'apporterait qu'un rendu identique partout, au prix d'un Chromium embarqué.

## 3. Ethone orchestre, il ne remplace pas

Un module est un programme Windows séparé. Ethone lit le registre pour connaître l'état réel, lit le flux du module pour connaître la version, puis lance l'installeur signé du module. Une application installée sans Ethone est donc détectée.

## 4. Pas de conflit entre updaters

- Une seule source par module : son flux.
- Même paquet signé, donc même résultat, quel que soit celui qui installe.
- Ethone n'installe rien si le module tourne. Il revérifie juste avant de lancer l'installeur, car l'installeur de Kairo utilise `taskkill /F`.
- Interior Studio se met à jour lui-même, car sa sauvegarde des données a lieu dans l'application avant l'installation.
- Nova PC Suite n'est pas installé directement tant qu'il n'a pas de flux signé.

## 5. Le catalogue est embarqué pour l'instant

Limite connue : ajouter un module ou changer une compatibilité demande une nouvelle version d'Ethone. Une nouvelle version d'un module, elle, n'en demande pas. Un catalogue distant signé viendra avec les releases d'Ethone.

## 6. Le web n'est pas déplacé

`ethone-next/` reste à sa place, car tout push sur `main` déploie le site par Cloudflare Pages. Le travail se fait sur `feature/ethone-ecosystem`, dans un worktree séparé, et n'ajoute que `desktop/`, `docs/ecosystem/` et `.github/workflows/desktop.yml`.

## 7. Le mobile existant est conservé

`ios/` et `android/` restent natifs. Un module ne s'installe pas sur mobile : les règles d'Apple l'excluent et Kairo a besoin du client Riot local.

## 8. Ethone Desktop passe par le compte Ethone

Décision de Rub19 le 2 novembre 2026. L'application s'ouvre sur un écran de connexion repris d'ethone.dev/login, sur le même Supabase que le site et l'app iOS : mot de passe, code OTP, Google, GitHub, Discord (PKCE avec `ethone://auth-callback`) et double authentification par le Worker.

- Les échanges se font en Rust. La page n'a pas accès au réseau (CSP) ni au jeton de rafraîchissement.
- Le jeton est dans le Gestionnaire d'identifiants Windows, jamais dans `localStorage`.
- Sans connexion, les commandes de modules sont refusées côté Rust, pas seulement masquées.
- Une session déjà ouverte reste utilisable hors ligne.
- L'inscription et la récupération de mot de passe s'ouvrent sur ethone.dev, car elles passent par Turnstile.
- Pas de passkey : WebAuthn est lié au domaine ethone.dev.
- Interior, HDV et les autres gardent leurs propres comptes. Aucune fusion. Les applications continuent de fonctionner sans Ethone.

## 9. Isolation réaliste

Des processus séparés sous le même compte Windows peuvent lire les fichiers les uns des autres. Seuls des modules officiels signés sont acceptés, chaque clé ne vaut que pour son module, Ethone ne tourne jamais en administrateur. Les modules tiers restent fermés.

## 10. Direction visuelle

Application Windows, pas page web : Mica, Segoe UI Variable, navigation latérale repliable, couche de contenu arrondie, lignes dépliables, vraies icônes des applications. La connexion est une petite fenêtre de 440×660, tracée par la bordure de lumière d'Ethone, qui s'agrandit en application une fois connecté. Le motion reprend les courbes et ressorts d'ethone.dev (`src/motion.ts`), sans animation pour la palette `Ctrl+K`. Réduction des animations, de la transparence, contraste élevé et couleurs forcées respectés.

Limite connue : la fenêtre étant sans bordure système, le menu Snap Layouts au survol du bouton Agrandir n'apparaît pas. Glisser vers les bords et double-cliquer sur la barre de titre sont pris en charge par Tauri, mais n'ont pas été testés.

## 11. Pas de SDK pour l'instant

Le contrat est le format du catalogue, versionné par `schemaVersion`. Une bibliothèque partagée attendra un premier consommateur réel.

## 12. Ethone Setup réutilise Ethone

`setup/` embarque le paquet NSIS d'Ethone, ce qui garde la désinstallation Windows et le chemin de mise à jour. Le catalogue, les flux, les signatures et les règles d'installation viennent de `src-tauri/src`, sans copie. Un module qui échoue n'annule pas les autres : ce qui a réussi reste installé et le reste peut être réessayé. Désinstaller Ethone ne touche pas aux applications et ferme la session.

Limite connue : la session n'est effacée que par Ethone Setup, pas par la désinstallation depuis les Paramètres de Windows.

## 13. Ethone a sa propre clé de mise à jour

`~/.tauri/ethone-updater.key`, distincte de celles des modules. Les releases d'Ethone seront dans `Rub19/dashboard` avec le tag `desktop-vX.Y.Z`, ce qui ne déclenche aucun déploiement du site. Aucune publication sans l'accord de Rub19.

## 14. L'identité Ethone remplace celle du fournisseur de connexion

Le nom et l'avatar affichés dans Ethone Desktop viennent de `ethone_public_profiles`, comme sur le site et l'app iOS. La photo Discord, Google ou GitHub ne sert jamais de photo de profil Desktop.

Desktop lit d'abord `/api/profile` par le Worker après l'enregistrement de l'appareil, puis utilise Supabase en secours. Les avatars de bibliothèque sont servis avec `Cross-Origin-Resource-Policy: same-origin`, donc WebView2 ne peut pas les charger directement depuis `tauri.localhost`. Rust télécharge uniquement les chemins `/avatars/` d'ethone.dev ou le stockage public `profile-media` du projet Supabase, contrôle le type et la taille, puis transmet l'image en mémoire à l'interface. L'image n'est pas stockée dans le Gestionnaire d'identifiants Windows.

## 15. Accès aux services par une passerelle Rust

Décision du 2 novembre 2026, sur demande de Rub19 de brancher tout le dashboard. L'interface appelle `api_call`, `rest_call`, `bot_call`, `riot_call` et `catalog_get`. Rust garde tous les jetons et n'accepte que les chemins prévus dans `gateway.rs` et `bot.rs`.

Limite connue : une faille de script dans l'interface pourrait appeler toutes les routes du Worker avec la session de l'utilisateur, comme sur le site. La CSP stricte et l'absence de page distante réduisent ce risque.

## 16. Connexion Riot d'E:VAL

Comme sur iOS, la connexion passe par la page officielle de Riot et une API non officielle, que Riot peut bloquer. Deux parcours : fenêtre Ethone (cookies dans un dossier séparé, reconnexion silencieuse) ou navigateur par défaut (l'utilisateur colle l'adresse de retour, session d'environ une heure). Riot n'accepte que la redirection vers playvalorant.com : aucun retour automatique n'est possible depuis le navigateur sans identifiant officiel. Les jetons de jeu restent en mémoire, seule l'identité est dans le Gestionnaire d'identifiants.

## 17. Connexion Discord

Même mécanisme qu'iOS : navigateur, retour `ethone://discord-auth?code=`, échange du code contre un jeton gardé dans le Gestionnaire d'identifiants. Les modules du bot sont décrits par `discordSpecs.ts`, généré depuis `AdminSpecs.swift`, et affichés par un moteur commun.

## 18. Barre latérale et pages en mémoire

Décision du 2 novembre 2026, après refus par Rub19 des tuiles colorées. Barre à lignes (icône et nom), sections groupées, réductible en icônes. La couleur reste sur l'icône. Une page visitée reste en mémoire pour revenir tout de suite avec son état, et les rafraîchissements automatiques s'arrêtent quand elle est cachée.

## 19. Français par défaut

L'application démarre en français sauf choix contraire dans les Réglages. Des contenus restent français en anglais : noms de rangs et modules Discord.

## 20. Chat Riot en lecture ponctuelle

Les amis sont lus par une connexion XMPP courte, ouverte puis fermée à chaque actualisation, avec la présence hors ligne. Dépendances ajoutées : `tokio-rustls` et `webpki-roots`. Aucune connexion permanente ni messagerie.

## Applications intégrées à Ethone (demande de Rub19, 3 novembre 2026, à faire après avoir fini Kairo et les autres applications)

- Une application peut être installée à part, via Ethone ou via GitHub : Ethone doit détecter les deux cas.
- Option au choix : télécharger Kairo pour qu'Ethone « devienne » Kairo dans la même fenêtre, avec un bouton pour revenir. Une seule application ouverte au lieu de plusieurs.
