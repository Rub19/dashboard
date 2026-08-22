# iOS Native Extensions — Setup

Les fichiers natifs suivants ont été créés pour les extensions iOS :

- `EthoneWidgetsBundle.swift` : Point d'entrée WidgetKit.
- `EthoneWidget.swift` : Widgets Small / Medium / Large.
- `EthoneLiveActivity.swift` : Live Activity et Dynamic Island (Focus / Pomodoro).
- `EthoneAppIntents.swift` : Intents Siri Shortcuts.
- `Info.plist` : configuration de l'extension.
- `../App/App.entitlements` : App Groups + Associated Domains.

## Étapes à réaliser dans Xcode (macOS)

1. Ouvrir `ios/App/App.xcworkspace` avec Xcode.
2. **App Groups** : activer l'App Group `group.dev.ethone.app` dans les capabilities du target `App` et de `EthoneWidgets`.
3. **Sign in with Apple** : activer la capability dans le target `App`.
4. **Push Notifications** : activer la capability et importer le certificat APNs.
5. **Associated Domains** : ajouter `applinks:ethone.dev` et `webcredentials:ethone.dev`.
6. Créer un target `EthoneWidgets` de type **Widget Extension**, pointer les fichiers existants dans `EthoneWidgets/` et activer **Live Activity** dans le target.
7. Ajouter `Privacy - Face ID Usage Description` (déjà dans `Info.plist`).
8. Lancer `npx cap sync` depuis `ethone-next/`, puis build Xcode (`Product > Archive`).
