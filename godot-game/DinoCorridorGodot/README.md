# Dino Corridor — portage natif Godot (Phase 1/plusieurs)

Ce dossier est un vrai projet Godot 4.x : une fois exporté, ça tourne en
natif (Windows .exe, Android .apk, projet Xcode iOS) — plus aucun navigateur,
plus de WebView, plus de moteur HTML5.

## Ce que fait cette Phase 1
- Déplacement WASD/flèches fluide (même lissage accélération/décélération
  que le prototype HTML).
- Visée souris façon FPS (Pointer Lock natif de Godot), avec sensibilité et
  inversion d'axe Y réglables (variables @export sur Player.gd, modifiables
  aussi depuis l'inspecteur Godot).
- Génération 3D du niveau à partir de la MÊME grille que generateMap() côté
  HTML (bordure + piliers en x pair/y pair) : même plan de niveau.
- Les 6 niveaux (Couloirs → Lave) sont déjà portés dans LevelData.gd avec
  leurs vraies valeurs (ennemis, PV, dégâts, vitesse, taux de drop d'armes),
  prêts pour la phase 2, mais pas encore utilisés par le moteur (pas de
  dinosaures/armes/HUD/menus dans cette étape).

## Comment l'ouvrir
1. Installe Godot 4.x (gratuit) : https://godotengine.org/download
2. Lance Godot → "Importer" → sélectionne le fichier `project.godot` de ce dossier.
3. Appuie sur Play (F5). Tu dois pouvoir marcher (WASD) et regarder à la
   souris dans un petit labyrinthe de murs colorés (niveau "Couloirs").
4. Échap libère la souris, un clic dans la fenêtre la recapture.

## Comment exporter en natif (une fois la phase 1 validée)
- Project → Export → ajoute un preset "Windows Desktop" (aucun outil externe
  requis) ou "Android" (nécessite le SDK Android + un JDK, Godot te guide à
  l'installation depuis les paramètres de l'éditeur).
- Pour iOS : Export → preset "iOS" génère un projet Xcode, qu'il faut ensuite
  ouvrir et compiler/signer depuis un Mac avec Xcode + un compte Apple
  Developer (obligatoire côté Apple, aucun moyen de contourner ça).

## Prochaines étapes (phase 2+)
- Dinosaures (IA de poursuite + hurtbox/hitbox, portées de PlayerHitbox.gd
  qu'on avait faites côté HTML) et armes (pistolet/fusil/épée).
- HUD (vie, score, arme) et menus (sélection de niveau, solo/en ligne).
- Le "multijoueur léger" du prototype HTML reposait sur window.storage
  (spécifique à l'aperçu Claude) : à remplacer par un vrai stockage/réseau
  côté Godot (HTTPRequest vers un petit serveur, ou Godot High-Level
  Multiplayer) — à discuter selon ce que tu veux vraiment pour le online.

Dis-moi quand tu as testé cette étape et on enchaîne sur les dinosaures.
