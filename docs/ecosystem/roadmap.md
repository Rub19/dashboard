# Roadmap

Chaque étape se termine par une preuve vérifiable. Aucune durée n'est annoncée.

| État | Étape | Preuve de fin |
|---|---|---|
| Fait | 1. Sécuriser : push d'Interior | Interior à jour sur GitHub |
| À faire | 1 bis. Sauvegarder les clés de signature, protéger `main` contre les force-push | Clés restaurables |
| Fait | 2. Noyau : registre, flux, interface | Application lancée, vraies versions affichées |
| Fait | 3. Installation de Kairo et HDV | Test réel dans Windows Sandbox |
| Fait | 3 bis. Connexion au compte Ethone et motion du site | Parcours testé sur un serveur local, connexion réelle confirmée par Rub19 le 2 novembre 2026 |
| À faire | 4. Flux signé pour Nova | Nova vérifié par signature |
| En cours | 5. Ethone Setup et mise à jour d'Ethone | Code et interface faits. Reste : test réel dans Windows Sandbox, puis mise à jour réelle après une première release validée par Rub19 |
| À faire | 6. Breach : releases signées, fenêtre dédiée, hors ligne, export de sauvegarde | Partie hors ligne, site inchangé |
| À faire | 7. Confort : notifications, diagnostic, paramètres | Tests d'interface et accessibilité |
| À faire | 8. Mobile : page Modules sur iOS, rattrapage Android, signature | Build signé, test sur appareil |
| À faire | 9. Services : préférences synchronisées | Synchronisation et hors ligne testés |

## Backlog

**Essentiel :** sauvegarde des clés, certificat Authenticode, catalogue distant signé.

**Important :** reprise de téléchargement, désinstallation qui garde les données par défaut, diagnostic exportable sans secrets, alertes Dependabot de `next`.

**Utile :** protocole `ethone://`, favoris, canaux stable et bêta, CSP stricte pour Kairo, Interior et HDV, tests pour Kairo.

**Optionnel :** centre de projets, espaces de travail, profils, automatisations, panneau de performances, limitation de bande passante.

**À éviter :** import du code des modules dans `dashboard`, updater qui remplace ceux des applications, marketplace publique, réécriture mobile, moteur de scripts, SSO unique immédiat, gains de performance annoncés sans mesure.

## Prérequis extérieurs

- Certificat de signature Windows : sans lui, SmartScreen avertit à chaque installation.
- Compte Apple Developer : sans lui, pas d'IPA signé.
- Compte Google Play et clé de signature Android : le build actuel est en debug.
