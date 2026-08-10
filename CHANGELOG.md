# Changelog

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [v317] - 2026-08-18

**Mail : refonte premium Phase 3 — raccourcis clavier, palette de commandes, fils, pièces jointes et compose mobile**

### Ajoute
- Raccourcis clavier globaux dans Mail (C, R, A/E, Del/Backspace, /, ?, Esc, Ctrl/Cmd+K) avec une palette de commandes et une aide.
- Affichage des fils de conversation (`thread_id`) et des pièces jointes dans le détail d'un message, avec aperçu et téléchargement.
- Mode plein écran pour la composition sur mobile, avec une barre d'actions condensée.
- États vides et erreur contextuels par dossier et par recherche, plus une notification toast au retour en ligne.

### Version PWA
- `experience-v317`.

## [v316] - 2026-08-18

**Mail : refonte premium Phase 2 — barre d'outils contextuelle, infobulles, filtre/sort avancés**

### Ajoute
- Barre d'outils contextuelle : label "N sélectionné(s)", boutons Déplacer/Étiqueter en sélection, masquage d'Actualiser/Plus.
- Infobulles `data-tooltip` sur tous les boutons d'icône du Mail (menu, recherche, cloche, aide, profil, sélection, actions, filtres, tri, composer, réduction).
- Popover de filtre ancré au bouton Filtres avec champ "Destinataire" (filtrage côté client sur `to_addresses`) et en-tête "Recherche avancée".
- Menu de tri (Plus récent / Plus ancien / Expéditeur / Non lus) avec tri côté client.

### Corrige / Améliore
- Regroupement des actions groupées : déplacer et étiqueter via `showBottomSheet` en sélection active.
- Respect des conventions i18n et des tokens CSS pour les nouveaux éléments.

### Version PWA
- `experience-v316`.

## [v315] - 2026-08-18

**Mail : refonte premium Phase 1 — en-tête, barre d'outils, panneau Latéral et panneau Plus**

### Ajoute
- En-tête collante `v8-mail-header` avec le titre ETHONE Mail, menu mobile, recherche, cloche, profil et aide.
- Barre d'outils collante `v8-mail-toolbar` avec case à cocher principale, actions groupées (Actualiser, Archiver, Supprimer, Lu/Non lu, Snooze, Plus) et filtres/tri/composer.
- Panneau latéral resserré : titre, alias, dossiers avec compteur, bouton de réduction.
- Panneau `v8-mail-more-panel` latéral (desktop) / bottom sheet (mobile) regroupant les sections avancées (Analytique, Règles, Modèles, Notifications, Étiquettes, Comptes, PGP, Push, Listes, Sécurité).
- Support responsive desktop / tablette / mobile avec disposition en grille et volets fixes.
- Version PWA `experience-v315`.

### Corrige / Améliore
- Suppression de l'ancienne `v8-mail-layout` et `v8-mail-list-header` au profit d'une structure flex/grid Gmail-like.
- Déplacement de la cloche, de la recherche et du statut en ligne dans l'en-tête.
- Conservation de toute la logique métier existante (builders, actions, API, bulk).

## [v314] - 2026-08-18

**Signal Center : UI plus propre et espacée**

### Corrige / Améliore
- Chips de filtre (Toutes, Non lues, Important, Messages, Activité, Système, Brain, Sécurité) : style plus carré (`border-radius` moyen), plus gros (padding 8px 12px, icône 16px), espacés.
- Boutons *Tout marquer comme lu* et *Effacer* : hauteur augmentée, padding plus large, espacement accru.
- Items de notification : plus gros (padding, icône 48px, texte plus lisible), espacement augmenté.

### Bordereau PWA
- Mis à jour vers `experience-v314`.

## [v313] - 2026-08-18

**Mail : bouton Analytics, cloche, création d'adresse @ethone.dev**

### Corrige / Améliore
- Bouton **Open** des Analytics : style plus carré/compact (`v8-mail-analytics__open`).
- Bouton cloche Mail agrandi à 40px et badge ajusté.
- Correction du chargement de l'alias dans `mail.mjs` (l'objet alias est maintenant conservé, pas converti en string).

### Ajoute
- Section **Mon adresse** dans la sidebar Mail : affichage de l'alias `@ethone.dev` existant ou formulaire pour en créer un.
- Route Worker `/api/mail/alias` en POST : accepte un alias personnalisé avec validation `@ethone.dev`.
- Client `mailApi.createAlias` et opération `mailAliasCreate`.

### Bordereau PWA
- Mis à jour vers `experience-v313`.

## [v312] - 2026-08-18

**Hotfix UI : empty-state, i18n et PWA v312**

### Corrige
- Correction du `icon is not a function` dans `v8/ui/empty-state.mjs` : le paramètre `icon` masquait l'import `icon` de `dom.mjs` dans `buildEmptyState`.

### Internationalisation
- Traduction du label du skeleton : `Chargement du contenu` et `Chargement de {0}`.

### Bordereau PWA
- Mis à jour vers `experience-v312`.

## [v311] - 2026-08-18

**Hotfix Worker : routes Mail**

### Corrige
- Correction de `request.url.searchParams` dans `worker/src/routes/mail.js` et `worker/src/routes/mail-templates.js` : `request.url` est une string, il faut parser `new URL(request.url)` avant d'accéder aux query params.
- Cela empêchait l'erreur `Cannot read properties of undefined (reading 'get')` sur les appels `/api/mail/inbox`, `/api/mail/search`, `/api/mail/contacts`, `/api/mail/drafts`, `/api/mail/thread` et `/api/mail/templates`.

## [v310] - 2026-08-18

**Hotfix UI : toggle de la sidebar**

### Corrige
- Le bouton de réduction de la sidebar n'est plus positionné en absolu sur le logo ETHONE ; il s'empile proprement sous le logo en rail non étendu.

### Bordereau PWA
- Mis à jour vers `experience-v310`.

## [v309] - 2026-08-18

**Hotfix UI : boutons du centre de notifications**

### Corrige
- Boutons d'action du centre de notifications : taille compacte, alignement propre et icônes réduites pour éviter les chevauchements.
- Classe `.v8-button--sm` manquante ajoutée et normalisée avec `.v8-button--small`.

### Bordereau PWA
- Mis à jour vers `experience-v309`.

## [v296] - 2026-08-18

**Phase F : Quality of Life + UX Polish + Mobile 2.0 + Personalisation**

### Ajoute
- Fondations mobile : safe-areas, touch targets, viewport, gestes de retour et long-press, barre de navigation mobile et bottom sheets.
- Navigation mobile : dock flottant, actions rapides, FAB et feuilles d'action réutilisables.
- Dashboard responsive : grille adaptative, densité, priorisation des widgets et mode "plus de widgets".
- Brain Daily Assistant : briefing quotidien (météo, calendrier, tâches, mail, notifications, Spotify) et bilan de journée.
- Centre de notifications global : catégories, priorités, snooze, recherche, glisser pour supprimer et synchronisation du badge.
- Audit du design system : tokens d'espacement, typographie, boutons, cartes, modaux, états vides/erreur/skeleton et `prefers-reduced-motion`.
- Moteur de personnalisation : densité, thème, accent, fond d'écran, mémoire par workspace et persistance cross-page.
- Refonte des réglages : sections par cartes, recherche en temps réel, favoris, raccourcis, accessibilité (taille de police, daltonisme, contraste élevé) et réglages Mail.
- Accessibilité et performance : classes d'accessibilité, mode faibles données, precache SW étendu et optimisations du rendu.

### Bordereau PWA
- Mis à jour vers `experience-v296`.

## [v297] - 2026-08-18

**Hotfix : i18n, Bills, Interactions, Météo et tutoriels**

### Améliore
- Widget Bills : formulaire personnalisé avec saisie du montant, calendrier de date, catégorie et récurrence, disponible sur Home et Calendrier.
- Météo : suppression de la troncature du texte et traduction des conditions météo.
- Interactions : traduction complète de la page, correction du bouton Refresh, du "Show less" et de la carte d'activité qui n'affichait que le vendredi.
- 3D des cartes : correction de l'effet de profondeur et reflet sur les live cards.
- Heatmap : rendu de tous les jours et effet 3D sur les points d'activité.

### Corrige
- Notes, Drive/Fichiers, Activity Hub et centre de notifications : chaînes manquantes traduites (fr, en, es, de).
- Connexions : tutoriels avec liens directs vers les sources officielles et UIs carrées.
- Bluesky et autres intégrations : affichage de l'icône de marque correcte.

### Bordereau PWA
- Mis à jour vers `experience-v297`.

## [v298] - 2026-08-18

**Hotfix : dock, navbar, quick actions, focus timer, i18n et fluidité**

### Améliore
- Team : traduction des rôles, boutons et statuts.
- Focus Timer : traduction du menu (Pomodoro, Deep Work, Sprint, Pause, etc.) et ouverture au clic.
- Menu profil : labels traduits, layout symétrique et épuré, boutons séparés et moins arrondis.
- Brain briefing : traduction de "Good evening" et autres chaînes restées en anglais ; checkboxes modernisées et épurées.
- Quick actions : FAB déplaçable, fiche d'actions rapides centrée avec effet d'apparition.
- Animations : transitions et easing plus fluides sur les pages, dock, bottom sheets et cartes.

### Corrige
- Bouton d'agrandissement de la navbar déplacé pour ne plus chevaucher le logo ETHONE.
- Bouton notifications du dock connecté au centre de notifications.
- Pomodoro n'ouvre plus son menu au survol, seulement au clic sur l'icône.

### Bordereau PWA
- Mis à jour vers `experience-v298`.

## [v299] - 2026-08-18

**Hotfix : centre de notifications du dock**

### Corrige
- Le panneau de notifications du dock était invisible (`is-open` manquait) mais capturait les clics, ce qui gelait l'interface.
- Le panneau de notifications est maintenant visible avec animation, se referme avec Échap / clic extérieur / bouton X, et a `pointer-events: none` quand il est fermé.
- Robustesse du store : une erreur dans un abonné (ex. panneau de notifications) ne bloque plus les autres abonnés.

### Bordereau PWA
- Mis à jour vers `experience-v299`.

## [v300] - 2026-08-18

**Hotfix : fiche Actions rapides déplaçable et traduite**

### Améliore
- La fiche Actions rapides est maintenant déplaçable : on peut glisser son en-tête pour la positionner où on veut (avec clamping pour garder au moins 48 px visible).
- Tous les libellés de la fiche Actions rapides sont traduits via `translateSource`.

### Bordereau PWA
- Mis à jour vers `experience-v300`.

## [v301] - 2026-08-18

**Hotfix : refonte et i18n de la page ETHONE Mail**

### Améliore
- Page ETHONE Mail entièrement internationalisée (fr/en/es/de) : dossiers, filtres, notifications, règles, modèles, PGP, analytique, rédaction et actions groupées.

### Corrige
- Initialisation de la page Mail protégée par `try/catch` pour éviter un écran vide.
- Correction de la comparaison `state.securityTab` avec la clé technique `blocked` au lieu de sa traduction.
- Remplacement des titres, placeholders, messages d'erreur et libellés en dur par `translateSource`.

### Bordereau PWA
- Mis à jour vers `experience-v301`.

## [v302] - 2026-08-18

**Hotfix : correction des états d'erreur et des notifications dupliquées sur Mail**

### Corrige
- Le bandeau d'erreur `ERREUR` dans `buildErrorState` était en dur en français ; il passe maintenant par `translateSource`.
- Les messages par défaut de `buildErrorState` sont traduits.
- Les notifications d'erreur identiques sur la page Mail sont dédupliquées (5 secondes) pour éviter les toasts en cascade quand le Worker renvoie une 500.

### Bordereau PWA
- Mis à jour vers `experience-v302`.

## [v303] - 2026-08-18

**Hotfix : déduplication du Centre de Signal et traduction des groupes/sources**

### Corrige
- Déduplication au niveau du gestionnaire de notifications : une même notification (même titre, message, type, catégorie, priorité) reçue dans une fenêtre de 30 secondes met à jour l'existante au lieu de créer un doublon.
- Traduction de la source des notifications dans les items (`System` au lieu de `Système` en anglais).
- Traduction du titre des groupes (`4 Système` → `4 System` en anglais).
- Ajout des clés de traduction pour les options de snooze (`10 min`, `1 h`, `Ce soir`).

### Bordereau PWA
- Mis à jour vers `experience-v303`.

## [v304] - 2026-08-18

**Hotfix : diagnostics d'erreur Worker Mail et vérification des migrations**

### Corrige
- Les erreurs Worker incluent maintenant un champ `detail` pour aider le client à distinguer un manque de migration, une erreur de schema ou une configuration incomplète.
- Le Worker détecte les erreurs PostgREST liées à un objet manquant (`relation ... does not exist`, etc.) et renvoie un `DB_SCHEMA_ERROR` 500 avec le détail.
- Le client `mail.mjs` affiche des messages d'erreur spécifiques selon le `detail` :
  - configuration Worker Supabase incomplète,
  - base de données Mail non initialisée (migrations 20260812 à 20260817),
  - erreur Worker générique.
- Vérification : les 7 migrations Supabase Mail (20260812 → 20260817) sont présentes et dans l'ordre.

### Bordereau PWA
- Mis à jour vers `experience-v304`.

## [v305] - 2026-08-18

**Hotfix : icônes Sound Pack, traductions Dock et persistance de la position Actions rapides**

### Corrige
- Icônes personnalisées pour chaque pack sonore (ETHONE, Minimal, Classic, Apple Inspired, Cyber Pulse, Silent) au lieu d'une seule note partout.
- Traduction manquante des libellés du panneau `Personnaliser le Dock` et du `Control Center` (Alignement, Verre & Flou, Masquage Auto, Zoom survol, Audio, Ambiance sonore, Focus Timer, etc.).
- Le bouton Actions rapides (FAB) et la fiche Actions rapides sauvegardent maintenant leur position utilisateur via `localStorage`.
- La fiche Actions rapides revient à sa position initiale (centrée) avec une animation à la fermeture.

### Bordereau PWA
- Mis à jour vers `experience-v305`.

## [v306] - 2026-08-18

**Hotfix Mail : déduplication des erreurs, style du bouton Analytics et header mobile**

### Corrige
- Dédoublonne les notifications d'erreur Mail portant le même message, même si le titre diffère (Templates vs Mail, etc.).
- Bouton "Ouvrir" des Analytics : variante `primary` + icône `bar-chart-3` pour ne plus être "tout plat".
- Header de la liste Mail : `flex-wrap: wrap` et `min-width: 0` sur les enfants pour éviter que les boutons soient coupés à droite.

### Bordereau PWA
- Mis à jour vers `experience-v306`.

## [v307] - 2026-08-18

**Hotfix Mail : titre des notifications d'erreur global**

### Corrige
- Les notifications d'erreur Mail liées au schéma, aux migrations ou à la configuration Worker portent maintenant le titre générique `Mail` au lieu du sous-module (Templates, etc.).

### Bordereau PWA
- Mis à jour vers `experience-v307`.

## [v308] - 2026-08-18

**Hotfix : popups Coming soon et erreur ReadableStream**

### Corrige
- Les boutons internes de Mail (dossiers, nouveaux messages, filtres, etc.) avaient un `data-action` non enregistré ; les clics remontaient au shell et affichaient `Coming soon`. Ils sont maintenant interceptés dans la page Mail pour ne plus déclencher de commande globale.
- `requestJSON` dédoublonne maintenant au niveau du JSON parsé et non plus au niveau du `Response` brut. Empêche l’erreur `Failed to execute 'getReader' on 'ReadableStream'` quand deux appels identiques étaient en cours en parallèle.

### Bordereau PWA
- Mis à jour vers `experience-v308`.

## [v295] - 2026-08-17

**Phase 14/15 : ETHONE Mail — comptes externes, chiffrement, push et listes**

### Ajoute
- Comptes mail externes : Gmail, Outlook et IMAP (création, sync, suppression).
- Chiffrement PGP simplifié via Web Crypto : génération de clés, chiffrement/déchiffrement côté Worker.
- Notifications push Web : souscription, envoi VAPID et webhook `/api/webhooks/mail`.
- Listes de diffusion : alias, membres, forward automatique via Resend.
- Routes Worker : `/api/mail/accounts`, `/api/mail/pgp/keys`, `/api/mail/push/*`, `/api/mail/lists`, `/api/webhooks/mail`.
- Intégration client et Brain pour les nouvelles fonctionnalités.
- Bordereau PWA mis à jour.

### Bordereau PWA
- Mis à jour vers `experience-v295`.

## [v294] - 2026-08-16

**Phase 14 : ETHONE Mail — analytics, sécurité et confiance**

### Ajoute
- Analytics mail : volumes envoyés/reçus, contacts fréquents, heures de pointe, stockage, règles actives, tendances 7/30/90 jours.
- Sécurité et confiance : vérification SPF/DKIM/DMARC, détection d'hameçonnage, expéditeurs bloqués et liste de confiance.
- Dossier Corbeille pour expéditeurs bloqués et contournement de la détection spam pour expéditeurs de confiance.
- Tests E2E du Worker (`worker/test/mail.test.mjs`) : 16 scénarios couvrant envoi, brouillons, recherche, déplacement, étiquettes, règles, templates, signatures, snooze, bulk, programmation, analytics, blocage/confiance et analyse Groq.

### Bordereau PWA
- Mis à jour vers `experience-v294`.

## [v293] - 2026-08-15

**Phase 13b/c : ETHONE Mail — hors-ligne, bulk, snooze, programmation**

### Ajoute
- Mode hors-ligne : cache IndexedDB mail, file d'attente d'actions, synchronisation auto au retour en ligne.
- Actions bulk : sélection multiple, archiver, supprimer, marquer lu/non lu, important, étiqueter, désétiqueter, snooze.
- Snooze : bouton dans le détail et toolbar bulk avec options demain, 1 semaine, date personnalisée.
- Envoi programmé : date d'envoi dans la composition, Worker `scheduled`, table outbox.
- Réponse automatique via règles : `action_auto_reply` et traitement par le Worker `scheduled`.
- Worker : routes `/api/mail/snooze`, `/api/mail/bulk`, `/api/mail/schedule` et exports `scheduled`.

### Bordereau PWA
- Mis à jour vers `experience-v293`.

## [v292] - 2026-08-15

**Phase 13a : ETHONE Mail — recherche avancée et templates**

### Ajoute
- Recherche mail avancée : expéditeur, sujet, corps, dates, pièces jointes, étiquettes, dossier.
- Templates de réponse : CRUD, défaut, sélecteur dans la composition, action Brain `mail.template`.
- Worker : routes `/api/mail/search` étendues et `/api/mail/templates`.

### Bordereau PWA
- Mis à jour vers `experience-v292`.

## [v291] - 2026-08-14

**Phase 12 : ETHONE Mail + Brain**

### Ajoute
- Brain Mail : résumé automatique des messages, réponses suggérées et extraction de tâches/événements via Groq.
- Détection d'importance automatique à la réception (mots-clés, fréquence contact, réponse directe).
- Règles de filtrage personnalisables : déplacement, étiquette, archive, spam, important automatique.
- Notifications mail avec cloche de badge et liste dans la sidebar.
- Worker : nouvelles routes `/api/mail/{analyze, suggest, extract, rules, notifications}`.

### Bordereau PWA
- Mis à jour vers `experience-v291`.

## [v290] - 2026-08-13

**Phase 11 : ETHONE Mail — fondations natives**

### Ajoute
- ETHONE Mail : interface 3 panneaux avec sidebar, liste et lecture, responsive desktop, iPad et mobile.
- Dossiers Mail : Inbox, Favoris, Envoyes, Brouillons, Archive, Spam, Corbeille avec deplacement et badges.
- Composition riche : To/Cc/Bcc, editeur HTML basique, signatures, pieces jointes en base64 et auto-sauvegarde des brouillons.
- Recherche full-text dans les messages, etiquettes personnalisables et carnet de contacts automatique.
- Brain : categorie de permission `mail`, contexte mail et actions (resumer, rechercher, rediger, deplacer, ouvrir).
- Worker : nouvelles routes `/api/mail/{drafts, move, search, labels, contacts, signatures}` et gestion des threads.
- Migration Supabase `202608130001_ethone_mail_phase_a` : folders, labels, signatures, contacts, search_vector et pieces jointes.

### Bordereau PWA
- Mis a jour vers `experience-v290`.

## [v289] - 2026-08-11

**Phase 10 : meteo emoji et icones de presets**

### Ajouté
- Card meteo avec emoji et teinte selon la condition (soleil, pluie, orage, neige, etc.).
- Badge meteo avec emoji, degradé et glow coloré.

### Amélioré
- Popin de détail meteo avec emoji et teinte condition.
- Presets d'apparence : remplacement des initiales par des icones Lucide.

### Bordereau PWA
- Mis à jour vers `experience-v289`.

## [v288] - 2026-08-11

**Phase 10 : redesign du flip météo**

### Amélioré
- Nouveau verso de la carte météo : header, grande température, stats vent/humidité et prévisions.

### Bordereau PWA
- Mis à jour vers `experience-v288`.

## [v287] - 2026-08-11

**Phase 10 : effet 3D restreint aux cartes live**

### Amélioré
- Réintégration d'un effet 3D/spotlight au survol pour les cartes live (Home/Activity).

### Corrigé
- Suppression de l'effet 3D sur les pages statiques (Settings, etc.).

### Bordereau PWA
- Mis à jour vers `experience-v287`.

## [v286] - 2026-08-11

**Phase 10 : amélioration du widget Factures**

### Ajouté
- Icônes de factures par service (Spotify, Netflix, WiFi, etc.) avec brand icons.

### Amélioré
- Marqueur du jour actuel discret (bordure en pointillés) sans confondre avec la sélection.
- Petite animation au changement de jour sélectionné.

### Bordereau PWA
- Mis à jour vers `experience-v286`.

## [v285] - 2026-08-11

**Phase 10 : suppression des effets 3D sur toutes les pages**

### Corrigé
- Suppression de `perspective`, `rotateX` et `rotateY` dans `shell.css` et `depth.css`.
- Flip des live cards remplacé par un basculement `display` sans 3D.

### Bordereau PWA
- Mis à jour vers `experience-v285`.

## [v284] - 2026-08-11

**Phase 10 : overlays Spotify, Last.fm et Minecraft**

### Ajouté
- Spotify : overlay "grand lecteur" au clic avec artwork, progression, contrôles et like (route Worker `/api/spotify/control`).
- Last.fm : overlay détail au clic avec album, écoutes, date et lien.
- Minecraft : overlay détail avec skin/cape en grand et historique des pseudos.

### Bordereau PWA
- Mis à jour vers `experience-v284`.

## [v283] - 2026-08-11

**Phase 10 : correction des badges Discord**

### Corrigé
- Suppression du fallback de faux badges pour l'utilisateur par défaut.
- Fallback icône Lucide si l'image d'un badge Discord ne charge pas.

### Bordereau PWA
- Mis à jour vers `experience-v283`.

## [v282] - 2026-08-11

**Phase 10 : diagnostic et correction du module Mail**

### Corrigé
- Worker : `resolveAliasByEmail` filtre directement côté Supabase au lieu de charger tous les alias.
- Interface Mail : messages d'erreur explicites (timeout, route non déployée, migration manquante).

### Bordereau PWA
- Mis à jour vers `experience-v282`.

## [v281] - 2026-08-11

**Phase 10 : correction des effets 3D et alignements UI**

### Corrigé
- Désactivation de l'effet de tilt 3D sur les cartes, la page Interactions et les réglages.
- Page Interactions : suppression du conflit de `transform`, meilleur espacement des icônes de statistiques.
- Rail : le bouton d'agrandissement est repositionné en haut à droite du logo en mode réduit.

### Bordereau PWA
- Mis à jour vers `experience-v281`.

## [v280] - 2026-08-11

**Phase 10 : fluidité du boot et du Service Worker**

### Corrigé
- Le Service Worker ne recharge plus la page au premier `controllerchange` (`clients.claim`).
- L'écran de boot HTML initial est réutilisé au lieu d'être recréé entre `booting`, profils et connexion.

### Bordereau PWA
- Mis à jour vers `experience-v280`.

## [v279] - 2026-08-11

**Phase 10 : module Mail - navigation et actions**

### Corrigé
- Enregistrement de la commande et de l'action `v8.mail.open` dans le catalogue et le système d'actions.
- Ajout des traductions manquantes pour le module Mail.

### Bordereau PWA
- Mis à jour vers `experience-v279`.

## [v278] - 2026-08-11

**Phase 10 : module ETHONE Mail**

### Ajouté
- **Module Mail** : chaque utilisateur obtient un alias `@ethone.dev`.
- **Réception** : Email Worker qui reçoit les e-mails entrants et les stocke dans Supabase.
- **Envoi** : envoi d'e-mails via Resend depuis l'adresse `@ethone.dev` de l'utilisateur.
- **Page Mail** : boîte de réception, lecture d'e-mail, composition.
- **Routes Worker** : `/api/mail/{send,inbox,thread,read,alias}`.
- **Migrations Supabase** : `ethone_mail_aliases`, `ethone_mail_messages`, `ethone_mail_threads`.

### Bordereau PWA
- Mis à jour vers `experience-v278`.

## [v277] - 2026-08-11

**Phase 10 : activation e-mail Resend**

### Corrigé
- **Worker** : ajout du secret `RESEND_FROM` pour activer l'envoi d'e-mails d'invitation d'équipe.
- **Worker redéployé** avec `RESEND_API_KEY` et `RESEND_FROM` configurés.

### Vérifié
- Aucune clé API Resend n'est présente dans les sources du worker.
- Bordereau PWA mis à jour vers `experience-v277`.

## [v276] - 2026-08-11

**Phase 10 : traductions complètes et i18n**

### Amélioré
- **25 nouvelles chaînes traduites** en anglais, espagnol et allemand (team, interactions, Brain, bills, navigation).
- **Catalogue i18n compacté** pour respecter les budgets JavaScript.
- Bordereau PWA mis à jour vers `experience-v276`.

## [v275] - 2026-08-11

**Phase 10 : fondations audit, sécurité et refactorisation**

### Corrigé
- **Sécurité** : remplacement du hashing SHA-256 par PBKDF2-SHA256 pour les mots de passe de partages et drops.
- **Sécurité** : génération cryptographique des codes OTP via `crypto.getRandomValues`.
- **Sécurité** : génération des tokens d'invitation d'équipe sans fallback `Math.random`.
- **Routage** : ajout de `interactions` et `team` dans `V8_ROUTES`.
- **Mémoire** : nettoyage du focus timer lors de la fermeture du panel.

### Amélioré
- **Refactorisation** : création des modules `v8/utils/format.mjs`, `v8/utils/download.mjs`, `v8/utils/date.mjs` pour éliminer les duplications.
- Bordereau PWA mis à jour vers `experience-v275`.

## [v274] - 2026-08-11

**Phase 9 : corrections topbar et dock mobile**

### Corrigé
- Topbar mobile : passage en 3 colonnes pour eviter le retour a la ligne et le chevauchement des icones.
- Breadcrumbs sur mobile : masque du root en dessous de 430px pour gagner de la place.
- Dock mobile : reduction de la taille des icones (42/38/36/34px) selon le breakpoint.

### Amélioré
- Bordereau PWA mis a jour vers experience-v274.

## [v273] - 2026-08-11

**Phase 9 : avatar Brain thinking enrichi**

### Ajouté
- Nouveau badge Brain 'Thinking' avec étoile tournante, glow pulsant, orbites et particules.

### Amélioré
- Bordereau PWA mis a jour vers experience-v273.

## [v272] - 2026-08-10

**Phase 9 : team-manager Supabase + interactions reseau**

### Ajouté
- Team Manager branché sur Supabase (table ethone_team_members) avec CRUD asynchrone.
- Invitations d'équipe : génération de token et lien d'invitation.
- Endpoint worker /api/team/invite pour envoi d'e-mail via Resend (prêt si RESEND_API_KEY configuré).
- Interactions Heatmap connecté au journal d'activité ETHONE (ouvertures de page, tâches, notes, etc.).

### Amélioré
- Bordereau PWA mis a jour vers experience-v272.

## [v271] - 2026-08-10

**Phase 9 : ajustements UI mobile Calendrier**

### Corrigé
- Page-heading actions : flex-wrap pour eviter le debordement des boutons sur mobile.
- Titre Calendrier : retour a la ligne et ellipsis du mois en mobile.

### Amélioré
- Bordereau PWA mis a jour vers experience-v271.

## [v270] - 2026-08-10

**Phase 9 : correction bouton Admin Fichiers**

### Corrigé
- Bouton Admin de la page Fichiers : ouvre maintenant la modale de partages et drops.

### Amélioré
- Bordereau PWA mis a jour vers experience-v270.

## [v269] - 2026-08-10

**Phase 9 : Brain conversationnel et thinking anime**

### Ajouté
- Brain repond maintenant aux salutations et aux messages simples (bonjour, ca va, etc.).
- Message 'Brain reflechit...' avec anneaux pulsatiles et points de suspension animes pendant la requete.
- Animation du hero Brain quand il reflechit : halo, ondes concentriques et pulsation de l'icone.

### Amélioré
- Bordereau PWA mis a jour vers experience-v269.

## [v268] - 2026-08-10

**Phase 9 : theme picker anime et v267**

### Ajouté
- Theme picker ameliore avec swatch actif qui pop, anneau d'onde et swatch custom rotatif.
- Effet flash couleur au changement d'accent avec transition douce des couleurs d'interface.

### Amélioré
- Bordereau PWA mis a jour vers experience-v268.

## [v267] - 2026-08-10

**Phase 9 : interactions, heatmap 3D et v266**

### Ajouté
- Nouvelle page Interactions avec une heatmap des 30/90 derniers jours, toggle Less/More et statistiques.
- Service interactions-heatmap pour suivre et simuler l'engagement quotidien.
- Effet 3D sur la heatmap et les cartes de statistiques grace a l'integrateur depth-effect.

### Amélioré
- Bordereau PWA mis a jour vers experience-v267.

## [v266] - 2026-08-10

**Phase 9 : taches, animations et v265**

### Ajouté
- Animation de complétion des tâches : la ligne s'élève, se fade et les tâches restantes glissent en douceur.

### Amélioré
- Bordereau PWA mis a jour vers experience-v266.

## [v264] - 2026-08-10

**Phase 9 : equipe, collaboration et cloud**

### Ajouté
- Nouvelle page Équipe pour inviter des membres, leur attribuer un role et gerer l'acces aux fichiers.
- Service createTeamManager local avec roles (owner, admin, senior, junior, assistant, viewer) et statuts (pending, active, revoked).
- Table Supabase ethone_team_members et ethone_file_collaborators pour la collaboration securisee.
- Avatars generes a partir des initiales et support des URL de photo de profil.

### Amélioré
- Bordereau PWA mis a jour vers experience-v264.

## [v260] - 2026-08-10

**Phase 9 : widget Bills, i18n et stabilite CI**

### Ajouté
- Nouveau widget Bills : calendrier des factures a 7 jours, detail anime, ajout manuel et scan IA.
- Gestionnaire de factures avec recurrences (episode, hebdomadaire, mensuelle, trimestrielle, annuelle) et categories.
- Scan IA d'e-mails ou de fiches de facture (extraction auto du montant, date, categorie et recurrence).

### Amélioré
- 128 traductions manquantes ajoutees (en, es, de) dans le catalogue i18n.
- Bordereau PWA mis a jour vers experience-v260.

### Corrigé
- Barre d'actions groupées du panel de notifications : texte tronque, icones visibles avec aria-label.
- Correction du script RLS QA pour ne plus exiger de lignes seedees pour les utilisateurs de test.
- Ajout du package.json et mise a jour wrangler.toml pour le worker deploy-status.
- Navigation fluide des pages lazy grace aux View Transitions et gestion du cycle de vie.
- Style loader et bordereau PWA synchronises (v263) pour eviter les flashs de contenu.
- Formulaire de connexion : autofill fiable et suppression des animations de layout au focus clavier mobile.

## [v259] - 2026-08-09

**Phase 9 : stabilite, navigation mobile et error boundaries**

### Corrigé
- Correction de la validation GitHub Pages : cache SW v258, lazy-load des pages lourdes et ajustement des budgets JS.

### Ajouté
- Barre de navigation mobile avec drawer Applications (bottom nav).

### Amélioré
- Error boundaries et gestion des erreurs de montage pour eviter les ecrans noirs.
- Lazy-loading des pages Fichiers, Partage, Drop et Matchs pour ameliorer le demarrage.
- Chargement paresseux des modules et renforcement du lifecycle.

## [v258] - 2026-08-08

**ETHONE Cloud : partages, drops, recherche, offline et admin**

### Ajouté
- Synchronisation des metadata Drive vers Supabase (ethone_files) avec tags, favoris et resume Brain.
- Recherche cloud full-text sur noms, tags et resume Brain.
- Partages securises (public, prive, mot de passe, expiration, limite de telechargements).
- Drops pour recevoir des fichiers de tiers sans connexion.
- Pages publiques #/share?slug=... et #/drop?slug=... avec apercu, QR code et drag & drop.
- Analyse Brain sur les fichiers : resume et suggestion de dossier.
- Journal d'activite cloud integre a Activity Hub.
- Cache offline IndexedDB pour metadata, favoris et file d'attente d'uploads.
- Panneau Admin dans Fichiers : dashboard, liste des partages/drops, revocation et nettoyage des expires.
- Cleanup automatique des shares et drops expires via POST /api/cloud/cleanup.

### Amélioré
- Mise a jour du bordereau PWA vers experience-v258.
## [v257] - 2026-08-07

### Ajouté
- **Système de sécurité et d'identité ETHONE** : gestion des appareils, passkeys (WebAuthn), OTP fallback et journal de sécurité.
- **Tables Supabase** : `ethone_devices`, `ethone_passkeys`, `ethone_security_events`, `ethone_device_verification_requests`, `ethone_otp_codes`, `ethone_passkey_challenges`.
- **Routes Worker** : `/api/auth/passkey/*`, `/api/auth/otp/*`, `/api/auth/device*`, `/api/auth/security-events`.
- **Frontend** : connexion par passkey et code email depuis l'écran de login, page `#/security` pour la gestion des appareils et des événements.
- **Tests Worker** : couverture de base pour l'envoi OTP debug, l'authentification des routes et la liste des appareils.

### Modifié
- Bordereau PWA mis à jour vers `experience-v257`.

## [v256] - 2026-08-07

### Corrigé
- **Page Activity** : `ReferenceError` sur `translateSource` dans `v8/pages/activity.mjs` dû à un import manquant.

### Modifié
- Masquage du raccourci clavier `Ctrl+K` dans le bouton de recherche topbar sur mobile.
- Uniformisation du bordereau PWA à `experience-v256` (`sw.js`, `STYLE_RELEASE`, `index.html`, `404.html`).

## [v255] - 2026-08-07

### Corrigé
- **Écran noir après connexion sur mobile** : la variable `focusTimer` était utilisée dans l'objet passé à `mountShell` avant son initialisation, provoquant une `ReferenceError` (temporal dead zone) au montage de l'application.
- Initialisation de `focusTimer` déplacée avant `mountShell` dans `v8/app/app-runtime.mjs`.

### Modifié
- Bordereau PWA mis à jour vers `experience-v255`.

## [v254] - 2026-08-07

### Ajouté
- **Centre de notifications** : historique persistant, catégories, priorité, badge cloche, panneau et mode silencieux par catégorie.
- **Toasts intelligents** : les notifications stockées en `localStorage`, avec compteur de non-lues et signalement des alertes importantes.
- **Suggestions Brain sur le dashboard** : proposition contextuelle de focus, événement, note récente ou ouverture Brain.
- **Import / export complet de la configuration ETHONE** dans les réglages (Système), incluant le `localStorage` et l'état actuel.

### Modifié
- Bordereau PWA mis à jour vers `experience-v254`.

## [v253] - 2026-08-07

### Ajouté
- **Vue tableau Kanban** pour les tâches : bascule entre liste et colonnes "À faire / Terminées".
- **Filtre par priorité** et **bannière de statistiques** avec jauge circulaire sur la page Tâches.
- **Personnalisation du dashboard** : panneau pour masquer/afficher les sections et sauvegarde dans `localStorage`.
- **Nouveau design des tâches** : cartes avec accent de couleur selon la priorité, badges d'échéance et de tag.

### Modifié
- **Notes** : l'éditeur est désormais centré sous forme de feuille blanche avec une largeur de lecture confortable.
- Bordereau PWA mis à jour vers `experience-v253`.

## [v252] - 2026-08-07

### Corrigé
- **Rank LoL** : meilleure récupération depuis l'API Riot et formattage sécurisé du tier/rank.
- **Image de profil LoL** : utilisation de la version DDragon à jour.
- **Items LoL** : masquage des emplacements vides dans le scoreboard.
- **Traduction** : "Unranked" devient "Non Classé" sur la carte LoL Live.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v252`.

## [v251] - 2026-08-07

### Ajouté
- **Menu Pomodero au survol** sur le bouton Pomodoro du Dock et le statut Focus de la barre du haut.
- Actions rapides Focus Timer : démarrer Pomodoro / Deep Work / Sprint, pause/reprendre, arrêter, passer la phase.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v251`.

## [v250] - 2026-08-07

### Ajouté
- **Recommandations explicables sur le dashboard** : carte contextuelle sur l'accueil avec titre, détail et raisons (chips).
- **Moteur de recommandation** basé sur les tâches, événements et connexions actives (GitHub + Notion, Spotify, etc.).

### Amélioré
- Bordereau PWA mis à jour vers `experience-v250`.

## [v249] - 2026-08-07

### Corrigé
- Effet pixelisé au survol des icônes du Dock : suppression du `drop-shadow` et utilisation d'une ombre portée propre sur la plaque.

### Amélioré
- Survol des icônes du Dock : léger soulèvement, agrandissement net et glow doux.
- Bordereau PWA mis à jour vers `experience-v249`.

## [v248] - 2026-08-07

### Ajouté
- **Redesign du Control Center du Dock** : panneaux groupés pour Animations, Ambiance, Pack sonore, Audio, Ambiance sonore et Focus Timer.
- **Interrupteurs à glissière** pour Aura néon et Sons d'interface.
- **Grilles de tuiles** pour Pack sonore et Focus Timer avec icônes.

### Amélioré
- Bordereau PWA mis à jour vers `experience-v248`.

## [v247] - 2026-08-07

### Ajouté
- **Pagination du flux d'activité** : bouton `Charger plus` par lots de 15 signaux.
- **Actions contextuelles** sur chaque entrée du journal : copier le titre, filtrer par catégorie, ouvrir la source.

### Amélioré
- Compteur d'activité affichant le nombre de signaux visibles sur le total filtré.
- Bordereau PWA mis à jour vers `experience-v247`.

## [v246] - 2026-08-07

### Ajouté
- **Scoreboard LoL type tracker.gg** : objectifs d'équipe (Barons, Dragons, Tours), dégâts subis, dégâts aux objectifs, score de vision, CS/min, GPM et DPM.
- **Richesse des stats Riot** : kill participation, KDA, dégâts aux champions, tourres et objectifs, vision et wards.
- **Fallback d'icônes LoL** : DDragon en premier, puis CommunityDragon si l'image est manquante.

### Corrigé
- Résolution dynamique de la dernière version DDragon et mapping correct des clés de champions pour afficher les icônes.
- Les icônes de champions, sorts, runes et objets utilisent désormais la bonne version DDragon et le bon nom de fichier.

### Changé
- Budget JavaScript total ajusté pour la refonte du scoreboard LoL.
- Bordereau PWA mis à jour vers `experience-v246`.

## [v245] - 2026-08-07

### Corrigé
- Le statut **Session chiffrée** (et Session vérifiée / expirée) est désormais traduit dans toutes les langues.
- Les libellés de synchronisation et de sauvegarde de la barre d'état sont localisés.

### Amélioré
- Orthographe et accents corrigés dans les statuts du shell.
- Bordereau PWA mis à jour vers `experience-v245`.

## [v244] - 2026-08-07

### Changé
- **Topbar unifiée** : tous les boutons de la barre d'outils supérieure partagent le même style visuel (bordure, fond, survol, focus).
- Focus, Brain et Sync conservent leur indicateur coloré dans une silhouette identique aux autres contrôles.
- Meilleure adaptation tactile des boutons topbar sur mobile.
- Bordereau PWA mis à jour vers `experience-v244`.

## [v243] - 2026-08-07

### Ajouté
- **Presets d'interface** : 6 ambiances prêtes à l'emploi (Productivité, Focus, Gaming, Créatif, Minimal, Développement) activables depuis les réglages ou le Command Center.
- **Sauvegarde de configuration** : enregistrer la configuration actuelle comme preset personnalisé et l'exporter en JSON.

### Changé
- Bordereau PWA mis à jour vers `experience-v243`.

## [v242] - 2026-08-07

### Ajouté
- **Quick Actions** : barre d'actions rapides sur l'accueil pour créer une note, une tâche, un événement, ouvrir Brain et lancer un Pomodoro.

### Amélioré
- **Command Center intelligent** : les commandes les plus utilisées remontent plus haut grâce au scoring par fréquence.
- **Alias de commandes** : `todo`, `note`, `ia`, `rdv`, `cmd` et autres raccourcis naturels supportés.
- **Filtre par catégorie** : `/reglages`, `/nav`, `/actions` filtrent les commandes par catégorie dans le Command Center.

### Changé
- Bordereau PWA mis à jour vers `experience-v242`.

## [v241] - 2026-08-07

### Changé
- **Command Center** : bouton d'effacement de la recherche (44 px) et touche Échap masquée sur mobile.
- **Cibles tactiles** : 44 px minimum pour les favoris du Command Center et les contrôles de densité sur pointeur grossier.
- **Dock / topbar / breadcrumb** : cibles tactiles à 44 px sur écrans ≤ 360 px.

### Nettoyage
- Suppression des scripts `one-shot` obsolètes et du fichier temporaire `scripts/temp-derive-test.mjs`.
- Bordereau PWA mis à jour vers `experience-v241`.

## [v240] - 2026-08-07

### Corrigé
- **LoL** : `deriveLolDdragonVersion` extrait correctement la version de patch depuis le `gameVersion` Riot et retombe sur `16.15.1`.
- **LoL Live Now** : la photo de profil tente DDragon, CommunityDragon puis l'icône `swords` sans boucle infinie en cas d'échec.
- **LoL availability** : le widget ne s'affiche plus si le Worker n'a pas trouvé de profil.

### Changé
- **Responsive mobile** : nouveau breakpoint `max-width: 360px` pour topbar, dock, scoreboard et rangées de matchs LoL.
- **Command Center** : accessible sous 820 px sous forme d'icône.
- Budget CSS relevé à 600 000 octets source pour la refonte responsive.
- Bordereau PWA mis à jour vers `experience-v240`.

## [v239] - 2026-08-07

### Changé
- **Responsive mobile** : amélioration du mode tactile (iPad/tablettes), meilleure prise en charge des petits écrans.
- **Topbar, Dock** : ajustements des colonnes et tailles pour mobile.
- **Activity / Connections** : grilles et cartes mieux adaptées aux petits écrans.
- Bordereau PWA mis à jour vers `experience-v239`.

## [v238] - 2026-08-07

### Changé
- **Valorant scoreboard** : la barre colorée de gauche est maintenant plus visible (5px pleine hauteur) et correspond à la couleur du groupe/party, comme sur tracker.gg.
- Le joueur et ses coéquipiers du même groupe partagent la même couleur.
- Bordereau PWA mis à jour vers `experience-v238`.

## [v237] - 2026-08-07

### Corrigé
- **LoL widget** : la photo de profil essaie DDragon, puis CommunityDragon, puis l'icône `swords` si tout échoue.
- **LoL widget** : suppression du `referrerpolicy="no-referrer"` qui pouvait bloquer le chargement.
- **CSP & headers** : `raw.communitydragon.org` est maintenant autorisé pour les images.

### Changé
- Le **Worker** renvoie `profileIconId` pour reconstruire les URLs de secours.
- Bordereau PWA mis à jour vers `experience-v237`.

## [v236] - 2026-08-07

### Ajouté
- **Valorant** : barres colorées à gauche de chaque groupe/duo, avec des couleurs distinctes par `party_id`.

### Changé
- Le groupe du joueur reste bleu, les autres groupes prennent des couleurs différentes (orange, vert, rouge).
- Bordereau PWA mis à jour vers `experience-v236`.

## [v235] - 2026-08-07

### Ajouté
- **Valorant** : le scoreboard affiche maintenant les duos/groupes des autres joueurs (badge `DUO`/`TEAM`) grâce au `party_id` renvoyé par l'API Henrik.

### Changé
- Badge de votre propre groupe : affiche `PARTY` si vous êtes plus de 2.
- Bordereau PWA mis à jour vers `experience-v235`.

## [v234] - 2026-08-07

### Corrigé
- **LoL** : les images de champions, items et profil utilisent maintenant la version DDragon de secours (`16.15.1`) si la version exacte de la partie n'existe pas chez DDragon.
- **LoL** : l'avatar de profil affiche l'icône par défaut si l'icône du joueur manque.
- **Cache** : le cache `sessionStorage` est invalidé pour forcer le rechargement avec les images corrigées.
- **Service Worker** : version incrémentée à `experience-v234` pour forcer le rafraîchissement du cache PWA et appliquer les corrections côté client.

### Déploié
- Worker Cloudflare redéployé avec les corrections d'images.

## [v233] - 2026-08-07

### Corrigé
- **LoL** : l'historique des matchs remarche. Si la version DDragon d'une partie n'existe pas, on bascule sur la version de référence ; si le détail d'un match est invalide, il est ignoré.
- **LoL** : le widget affiche la photo de profil avec une icône par défaut si l'image manque ou échoue.

### Déploié
- Mise à jour du **Worker Cloudflare** (`raspy-fog-bf5b`) avec les corrections API (LoL, cache, Valorant size).

## [v232] - 2026-08-07

### Ajouté
- **Historique** : jusqu'à 25 matches récupérés pour Valorant (`size=25`) et LoL (`count=25`).
- **Cache** : l'historique est mis en cache côté navigateur (`sessionStorage`, 10 min) et côté worker (10 min) pour éviter d'appeler l'API à chaque ouverture.

### Corrigé
- **Scoreboard** : seuls les vrais membres du groupe sont marqués `DUO` ; le trait/pastille bleu n'apparaît plus sur tous les joueurs.

## [v231] - 2026-08-07

### Ajouté
- **Accueil** : un clic sur les widgets gaming (LoL, Valorant, Apex) ouvre la page d'historique des matches.

### Corrigé
- **Widget Apex Legends** : affiche le pseudo du joueur au lieu de `undefined - undefined`.
- **Widget LoL / Valorant** : la navigation vers l'historique des matches fonctionne depuis l'accueil.

## [v230] - 2026-08-07

### Ajouté
- **Tracker LoL** : affichage de la rune clé (keystone) du joueur dans la ligne de match et le scoreboard détaillé.
- **Backend / Tracker LoL** : chargement de `runesReforged.json` depuis Data Dragon pour mapper les runes à la version de patch.

### Modifié
- **Backend / Tracker LoL** : les assets de runes sont normalisés avec image + nom, comme les sorts et les items.

## [v229] - 2026-08-06

### Ajouté
- **Tracker LoL** : icônes de sorts d'invocateur dans la ligne de match et le scoreboard détaillé.
- **Tracker LoL** : tooltips avec le nom de l'item au survol, alimentés par Data Dragon (`summoner.json` et `item.json`).

### Modifié
- **UI / Scoreboard LoL** : affichage du niveau du champion, de l'or total, et renommage de la colonne Score en Dégâts.
- **UI / Ligne de match LoL** : icônes de sorts d'invocateur et tooltips sur les items.
- **Backend / Tracker LoL** : chargement des données Data Dragon par version de patch pour enrichir les assets LoL.

## [v228] - 2026-08-06

### Ajouté
- **Tracker LoL** : filtre par mode (ranked, normal, aram) dans l'historique LoL.
- **Tracker LoL** : images de champions et items versionnées selon le patch de la partie (DDragon).

### Modifié
- **UI / Matches LoL** : responsive UI des matchs (avatar champion, badge niveau, grille adaptative et breakpoints).
- **UI / Matches LoL** : les 7 emplacements d'items s'affichent toujours avec des placeholders.
- **UI / Matches LoL** : chargement eager des images pour les 3 premières lignes de matchs.
- **UI / Matches LoL** : badge de niveau du champion plus lisible (z-index et halo visuel).

### Corrigé
- **CI/CD** : correction du SHA de `actions/checkout` dans le workflow de déploiement GitHub Pages.

## [Unreleased] - 2026-08-06

### Ajout�
- **Backend / Cloudflare Worker** : Nouveaux clients API (henrik-client.js et 
iot-client.js) pour isoler l'acquisition de donn�es Valorant et League of Legends.

### Modifi�
- **Backend / Cloudflare Worker** : Migration de Tracker.gg vers **HenrikDev API** (Valorant) et **Riot Games API officielle** (League of Legends) suite aux probl�mes d'erreurs 403.
- **Backend / Matchs** : Historique restreint � 10 parties r�centes pour respecter les limites strictes de requ�tes du Worker Cloudflare.
- **Frontend / Connexions** : Refonte de l'onglet de gestion des int�grations Riot Games pour retirer Tracker.gg, pointer vers HenrikDev/Riot, et permettre de configurer ses propres cl�s API ind�pendantes (henrikApiKey, 
iotApiKey).
- **Frontend / Menu Contextuel** : Correction de la propagation des �v�nements dans context-menu.mjs qui bloquait les actions en dehors du menu.

### Supprim�
- **Backend** : Retrait du parsing et requ�tage Tracker.gg pour Valorant et LoL (toujours actif pour Apex).


## [Unreleased] - 2026-08-05

### Ajouté
- **UI / Accueil** : Les widgets de l'Accueil (Spotify, Discord, Last.fm) ont désormais des hauteurs d'affichage uniformes avec un étirement pour mieux s'intégrer à la grille (\`v8/styles/shell.css\`).
- **UI / Activity** : Le \`Live Now\` a été segmenté en catégories distinctes (Gaming & Stats, Médias & Social, Productivité & Quotidien) s'alignant sur l'organisation de la page d'Accueil (\`v8/pages/activity.mjs\`).
- **Activity Hub** : Les catégories de widget vides sont automatiquement masquées dynamiquement.
- **Matchs** : Nouveau composant d'erreur d'interface élégant pour notifier un échec de l'API de statistiques (absence de fausses données / \`mockData\`).
- **Widgets Live** : Refonte visuelle de l'indicateur d'actualisation ("Actualisé à HH:MM"). L'indicateur est désormais purement temporel ("HH:MM"), sans fond, et très discret pour un rendu plus propre et moins distrayant.

### Modifié
- **Backend / Cloudflare Worker** : Migration complète et retour à la centralisation sur l'API de **Tracker.gg** pour **Valorant**, **League of Legends** et ajout du support **Apex Legends** via `getTrackerMatches`.
- **Matchs (Frontend)** : Suppression intégrale de la boucle de génération de fausses statistiques qui s'affichait lorsque le backend tracker était indisponible. Ajout de la compatibilité du panel pour afficher l'historique de matchs Apex Legends.

### Supprimé
- **Backend** : Révocation du support de l'API d'HenrikDev, suppression des blocs de configuration spécifiques associés.

