#!/usr/bin/env bash
# Installe et lance Lavalink 4 (serveur audio Java) sur le VPS, sous pm2.
#   bash scripts/lavalink-setup.sh
# Idempotent : relançable pour mettre à jour le jar / la config.
# Variables optionnelles :
#   LAVALINK_PASSWORD           mot de passe (défaut : généré, écrit dans ~/lavalink/.password)
#   LAVALINK_YT_REFRESH_TOKEN   refresh token OAuth YouTube (sinon flux d'appairage au 1er démarrage)
#   LAVALINK_VERSION            défaut 4.2.2
set -euo pipefail

LAVALINK_VERSION="${LAVALINK_VERSION:-4.2.2}"
LL_DIR="${LL_DIR:-$HOME/lavalink}"
BOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$BOT_DIR/lavalink/application.yml"

echo "== Lavalink $LAVALINK_VERSION → $LL_DIR"
mkdir -p "$LL_DIR/logs"

# 1) Java 17+ (Lavalink 4 exige 17 minimum)
if ! command -v java >/dev/null 2>&1 || ! java -version 2>&1 | grep -qE 'version "(1[7-9]|[2-9][0-9])'; then
  echo "-- Installation de Java 17 (openjdk-17-jre-headless)"
  sudo apt-get update -qq
  sudo apt-get install -y -qq openjdk-17-jre-headless
fi
java -version 2>&1 | head -1

# 2) Jar
JAR="$LL_DIR/Lavalink.jar"
if [ ! -f "$JAR" ] || [ "${LAVALINK_FORCE_DOWNLOAD:-0}" = "1" ]; then
  echo "-- Téléchargement de Lavalink.jar"
  curl -fL "https://github.com/lavalink-devs/Lavalink/releases/download/${LAVALINK_VERSION}/Lavalink.jar" -o "$JAR"
fi
ls -lh "$JAR" | awk '{print "   "$5, $9}'

# 3) Mot de passe (persisté pour les relances)
if [ -z "${LAVALINK_PASSWORD:-}" ]; then
  if [ -f "$LL_DIR/.password" ]; then
    LAVALINK_PASSWORD="$(cat "$LL_DIR/.password")"
  else
    LAVALINK_PASSWORD="$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)"
  fi
fi
umask 077
printf '%s' "$LAVALINK_PASSWORD" > "$LL_DIR/.password"

# 4) application.yml depuis le template du repo (+ mot de passe, + refresh token)
# Sans LAVALINK_YT_REFRESH_TOKEN, on conserve le token déjà présent dans la
# config précédente (sinon chaque relance du script obligerait à ré-appairer).
if [ -z "${LAVALINK_YT_REFRESH_TOKEN:-}" ] && [ -f "$LL_DIR/application.yml" ]; then
  EXISTING_TOKEN="$(grep -oE 'refreshToken: "1//[A-Za-z0-9_-]+"' "$LL_DIR/application.yml" | head -1 | sed -E 's/refreshToken: "(.*)"/\1/')"
  if [ -n "$EXISTING_TOKEN" ]; then
    LAVALINK_YT_REFRESH_TOKEN="$EXISTING_TOKEN"
    echo "-- Refresh token YouTube existant conservé"
  fi
fi
sed "s/CHANGE_ME/$LAVALINK_PASSWORD/" "$TEMPLATE" > "$LL_DIR/application.yml"
if [ -n "${LAVALINK_YT_REFRESH_TOKEN:-}" ]; then
  # Un vrai refresh token Google commence par "1//" et fait 60+ caractères sans
  # espace. Tout le reste (code d'appairage XXX-XXX-XXXX, valeur tronquée…)
  # ferait boucler Lavalink au démarrage avec "oauth2 token fetch: 400".
  TOKEN="$(printf '%s' "$LAVALINK_YT_REFRESH_TOKEN" | tr -d '[:space:]"'"'")"
  if ! printf '%s' "$TOKEN" | grep -Eq '^1//[A-Za-z0-9_-]{40,}$'; then
    echo "!! LAVALINK_YT_REFRESH_TOKEN ne ressemble pas à un refresh token Google (attendu : 1//0… , 60+ caractères)."
    echo "   Reçu : ${TOKEN:0:6}… (${#TOKEN} caractères). Token ignoré — relance sans, puis refais l'appairage."
    exit 1
  fi
  sed -i "s|# refreshToken: \"1//0...\"|refreshToken: \"$TOKEN\"|; s|# skipInitialization: true|skipInitialization: true|" "$LL_DIR/application.yml"
  echo "-- Refresh token YouTube injecté (${#TOKEN} caractères)"
fi

# 5) .env du bot : backend + accès Lavalink (ajout ou mise à jour)
ENV_FILE="$BOT_DIR/.env"
touch "$ENV_FILE"
[ -n "$(tail -c1 "$ENV_FILE")" ] && echo >> "$ENV_FILE"   # garantit un \n final
set_env() { # key value
  if grep -q "^$1=" "$ENV_FILE"; then sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; else echo "$1=$2" >> "$ENV_FILE"; fi
}
set_env MUSIC_BACKEND lavalink
set_env LAVALINK_HOST 127.0.0.1
set_env LAVALINK_PORT 2333
set_env LAVALINK_PASSWORD "$LAVALINK_PASSWORD"
echo "-- .env du bot mis à jour (MUSIC_BACKEND=lavalink)"

# 6) pm2
pm2 delete lavalink >/dev/null 2>&1 || true   # recréé pour appliquer les flags JVM
pm2 start java --name lavalink --cwd "$LL_DIR" -- -Xms128m -Xmx384m -XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Xss512k -jar "$JAR" >/dev/null
pm2 save >/dev/null 2>&1 || true

echo
echo "== Lavalink démarre. Vérifie dans ~20 s :"
echo "   pm2 logs lavalink --lines 40 --nostream | grep -iE 'started|oauth|google.com/device|refresh token|error'"
echo
echo "   1er démarrage sans refresh token : les logs affichent un lien google.com/device + un CODE."
echo "   Ouvre-le avec un COMPTE GOOGLE JETABLE, entre le code. Le refresh token apparaît ensuite"
echo "   dans les logs → relance :  LAVALINK_YT_REFRESH_TOKEN='1//0...' bash scripts/lavalink-setup.sh"
echo
echo "== Puis redémarre le bot :  pm2 restart ethone-bot --update-env"
