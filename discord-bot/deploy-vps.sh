#!/usr/bin/env bash
set -e

# ==============================================================================
# Script de déploiement automatique pour Ubuntu 24.04 LTS — ETHONE Discord Bot
# ==============================================================================

echo "⚡ [ETHONE] Déploiement du Bot Discord & Dashboard Web..."

# 1. Vérification de Docker
if ! command -v docker &> /dev/null; then
    echo "📦 Installation de Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    echo "✅ Docker installé."
fi

# 2. Vérification du fichier .env
if [ ! -f .env ]; then
    echo "❌ Erreur : Le fichier .env est introuvable."
    echo "Créez votre fichier .env avec DISCORD_TOKEN, CLIENT_ID, CLIENT_SECRET, etc."
    exit 1
fi

# 3. Création du dossier persistant de données
mkdir -p data

# 4. Construction et lancement avec Docker Compose
echo "🚀 Lancement des conteneurs en arrière-plan..."
docker compose down || true
docker compose up -d --build

echo "=================================================================="
echo "🎉 Déploiement réussi !"
echo "👉 Dashboard accessible sur : http://$(curl -s ifconfig.me):3001"
echo "👉 Pour voir les logs en direct : docker compose logs -f"
echo "=================================================================="
