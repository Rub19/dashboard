# ETHONE pour iOS (SwiftUI natif, iOS 26+)

Application 100 % Swift/SwiftUI, sans dépendance tierce, qui parle au même backend que le site (Supabase avec RLS + Worker Cloudflare).

## Structure

| Dossier | Rôle |
|---|---|
| `Ethone/` | App : `Core` (auth Supabase, réseau, Keychain), `Stores`, `Services`, `Features`, `Intents`, `DesignSystem` |
| `EthoneWidgets/` | Widgets, Live Activity + Dynamic Island, Contrôles (Centre de contrôle / bouton Action) |
| `EthoneNotificationService/` | Enrichissement des push (image) |
| `EthoneNotificationContent/` | Interface personnalisée des notifications |
| `EthoneWatch/` | App Apple Watch embarquée dans l'IPA (résumé, tâches, focus piloté depuis la montre via WatchConnectivity) |
| `Shared/` | Code partagé app ↔ extensions (attributs de Live Activity, instantané des widgets) |
| `project.yml` | Définition du projet [XcodeGen](https://github.com/yonaskolb/XcodeGen) |

Le fichier `.xcodeproj` n'est **pas versionné** : il est généré à partir de `project.yml`.

```bash
brew install xcodegen
cd ios && xcodegen generate && open Ethone.xcodeproj
```

## Obtenir l'IPA

Le workflow `.github/workflows/build-ios.yml` compile à chaque push touchant `ios/` et publie **un seul artefact : `ETHONE-iOS-IPA`** (IPA **non signé**, tout inclus : app, widgets, Live Activity, contrôles, extensions de notification, app Apple Watch). Il est construit avec Xcode 27 (fonctions iOS 27 incluses, l'app reste installable dès iOS 26) ; si la préversion d'Xcode 27 échoue, le même artefact est produit avec Xcode 26.
Installation : SideStore / AltStore / TrollStore (ils re-signent l'app), ou signature avec votre propre certificat.

## Fonctions natives utilisées

- **Liquid Glass** (iOS 26) : `glassEffect`, `GlassEffectContainer`, `.glass` / `.glassProminent`, barre d'onglets réductible, mini-lecteur `tabViewBottomAccessory`.
- **ActivityKit** : Live Activity « Focus » (écran verrouillé, Dynamic Island compacte / étendue / minimale, StandBy).
- **WidgetKit** : widget Résumé (petit, moyen, écran verrouillé), Contrôles iOS 18.
- **App Intents / Siri** : ajouter une tâche, créer une note, démarrer/arrêter un focus, terminer une tâche, ouvrir une section (+ entités pour Spotlight/Raccourcis).
- **FoundationModels** : Brain sur l'appareil (Apple Intelligence), repli Cloud ETHONE.
- **UserNotifications** : actions (Terminer, Reporter, Fait), catégories, rappels locaux ; extensions de service et de contenu.
- **EventKit** (calendrier iPhone, lecture seule), **CoreSpotlight**, **LocalAuthentication** (Face ID), **AuthenticationServices** (connexion Discord/Google), **Keychain**, **Open-Meteo** (météo).

## Autres plateformes Apple

- **Apple Watch** : app embarquée (`Payload/ETHONE.app/Watch/`), alimentée par l'iPhone (`WatchBridge`).
- **iPad** : la barre d'onglets devient une barre latérale (`sidebarAdaptable`).
- **Mac (Apple silicon) et Vision Pro** : l'app iPad s'y exécute en mode « conçue pour iPad » (aucune build dédiée).

## Limites connues (IPA non signé)

- Les **push serveur (APNs)** et les **App Groups** exigent un profil signé : sans eux, les widgets affichent « Ouvrez ETHONE » et seules les notifications locales fonctionnent.
- La connexion Discord/Google utilise la redirection `ethone://auth-callback`, qui doit être autorisée dans *Supabase → Authentication → URL Configuration*.
- Le calendrier « factures » du site est stocké dans le navigateur (localStorage) : il n'est donc pas synchronisé avec l'app.
