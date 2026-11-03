# Audit Ultimate Edition d'Ethone Desktop

Audit statique du 3 novembre 2026. Aucune fenêtre, capture ou donnée factice n'a été utilisée.

## Rôle de l'application

Ethone Desktop est le centre Windows natif de l'écosystème Ethone. Il regroupe le compte Ethone, les applications installées, la productivité, les fichiers, le mail, E:VAL, Discord, les jeux, Brain, l'équipe et les analyses. React rend l'interface locale ; Tauri et Rust gardent les sessions, les accès système et les appels sensibles.

## Inventaire actuel

| Domaine | Déjà présent | Écart prioritaire |
|---|---|---|
| Design | Jetons sombre/clair, accent, Mica, verre, composants, animations courtes | Préférences utilisateur de densité, mouvement, transparence et texte |
| Navigation | Sidebar réductible, pages persistantes, retour, Ctrl+1 à 9, Ctrl+K, Ctrl+B, Ctrl+F, F5 | Récents visibles et raccourcis configurables seulement s'ils réduisent réellement les clics |
| Recherche | Palette globale clavier, pages, sections et applications | Recherche de données limitée aux pages qui exposent déjà une recherche sûre |
| QoL | Toasts, annulation, copie, menus contextuels, favoris, épingles, filtres persistants | Unifier les confirmations, opérations longues et actions groupées pertinentes |
| États | Squelettes, vide, erreur, réessayer, hors ligne | Vérifier chaque sous-page et éliminer les erreurs techniques restantes |
| Fenêtre | Position, taille, maximisation, multi-écran, scaling, Snap | Préférences de fermeture et zone de notification à concevoir sans processus imposé |
| Accessibilité | Clavier, focus, rôles, contraste renforcé, réduction du mouvement | Lecteur d'écran et matrice de zoom à vérifier en vrai |
| Performance | Cache Riot/catalogue, chargement à la demande de pages visitées, images paresseuses | Mesurer démarrage, bundle, longues listes et mémoire avant toute optimisation lourde |
| Sécurité | Jetons en Rust, chemins allowlistés, stockage Windows, contrôle d'envoi | Imports de préférences à valider et journaux à expurger systématiquement |
| Maintenance | Version, catalogue, mise à jour signée, journal local | Nouveautés, diagnostic local et accès au dossier de données |

## Ce qui ne doit pas être reconstruit

- Le design system, la sidebar, Ctrl+K, les thèmes, les accents, les notifications internes, les tooltips, les menus contextuels, les tiroirs, les états vides et le stockage de la fenêtre existent déjà.
- Les fonctions réelles restent dans leurs pages actuelles ; aucune maquette parallèle ne doit les remplacer.
- Une option Windows n'est ajoutée que si Tauri peut réellement l'appliquer et la restaurer.

## Ordre de livraison

1. Préférences d'apparence fiables : validation, densité, texte, mouvement, transparence et réinitialisation.
2. Sauvegarde et restauration des préférences : format versionné, import validé, export sans secret.
3. Comportement Windows : fermeture, démarrage minimisé et zone de notification seulement avec contrôle explicite.
4. Navigation et recherche : récents, pertinence et raccourcis utiles.
5. Retours et erreurs : opérations longues, regroupement des notifications, diagnostic compréhensible.
6. Performance : mesures, virtualisation des listes réellement longues, annulation des requêtes compatibles.
7. Revue domaine par domaine : Accueil, Productivité, Mail/Fichiers, E:VAL/Jeux, Discord, Brain/Équipe, Analyses/Compte.
8. Vérification réelle : thèmes, tailles, clavier, scaling, réseau, fermeture et restauration avec l'accord de Rub19.

## Risques

- L'ampleur du cahier des charges peut créer des régressions si plusieurs domaines sont modifiés ensemble : chaque tranche reste petite et testable.
- Les réglages stockés aujourd'hui dans `localStorage` n'ont pas de schéma commun : une couche validée doit être ajoutée sans casser les clés existantes.
- Les pages très riches peuvent donner une impression de scroll excessif : les sous-sections existantes sont conservées et les listes longues seront mesurées avant virtualisation.
- Les fonctions Windows permanentes peuvent surprendre l'utilisateur : aucune ne sera activée par défaut.
