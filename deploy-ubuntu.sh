#!/bin/bash

# Script de déploiement automatique pour Ubuntu
# Usage: ./deploy-ubuntu.sh

set -e  # Arrêter en cas d'erreur

echo "=========================================="
echo "  DÉPLOIEMENT FONAREDD APP - UBUNTU"
echo "=========================================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Variables
APP_DIR="/opt/fonaredd-app"
REPO_URL="https://github.com/shadjava2/fonaredd.git"
NODE_VERSION="18"

# Fonction pour afficher les messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Vérifier si on est root
if [ "$EUID" -eq 0 ]; then 
    error "Ne pas exécuter ce script en tant que root. Utilisez un utilisateur normal."
fi

# Étape 1: Vérifier les prérequis
info "Vérification des prérequis..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    warn "Node.js n'est pas installé. Installation..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VER=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VER" -lt 18 ]; then
        error "Node.js version 18+ requise. Version actuelle: $(node --version)"
    else
        info "Node.js $(node --version) détecté ✓"
    fi
fi

# Vérifier npm
if ! command -v npm &> /dev/null; then
    error "npm n'est pas installé"
else
    info "npm $(npm --version) détecté ✓"
fi

# Vérifier Git
if ! command -v git &> /dev/null; then
    warn "Git n'est pas installé. Installation..."
    sudo apt update
    sudo apt install -y git
else
    info "Git $(git --version) détecté ✓"
fi

# Vérifier PM2
if ! command -v pm2 &> /dev/null; then
    warn "PM2 n'est pas installé. Installation..."
    sudo npm install -g pm2
else
    info "PM2 $(pm2 --version) détecté ✓"
fi

# Étape 2: Créer le dossier de l'application
info "Création du dossier de l'application..."
sudo mkdir -p "$APP_DIR"
sudo chown -R $USER:$USER "$APP_DIR"

# Étape 3: Cloner ou mettre à jour le dépôt
if [ -d "$APP_DIR/.git" ]; then
    info "Mise à jour du dépôt existant..."
    cd "$APP_DIR"
    git pull origin main
else
    info "Clonage du dépôt..."
    cd /opt
    if [ -d "fonaredd-app" ]; then
        sudo rm -rf fonaredd-app
    fi
    git clone "$REPO_URL" fonaredd-app
    cd "$APP_DIR"
fi

# Étape 4: Vérifier le fichier .env.local
if [ ! -f "$APP_DIR/.env.local" ]; then
    warn "Le fichier .env.local n'existe pas."
    echo ""
    echo "Création du fichier .env.local..."
    cat > "$APP_DIR/.env.local" << EOF
# Configuration pour la production
DATABASE_URL="mysql://giformapp:SDconceptsrdc243_243@91.134.44.14:3306/fonaredd-app?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://91.134.44.14:3001"
NODE_ENV="production"
PORT=3001
EOF
    info "Fichier .env.local créé. ⚠️  Vérifiez et modifiez les valeurs si nécessaire !"
    echo ""
    read -p "Appuyez sur Entrée pour continuer après avoir vérifié .env.local..."
else
    info "Fichier .env.local trouvé ✓"
fi

# Étape 5: Installer les dépendances
info "Installation des dépendances..."
npm install --production --no-optional

# Étape 6: Générer Prisma
info "Génération du client Prisma..."
npx prisma generate

# Étape 7: Builder l'application
info "Build de l'application..."
npm run build

# Étape 8: Créer le fichier ecosystem.config.js
info "Création de la configuration PM2..."
cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [{
    name: 'fonaredd-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    cwd: '$APP_DIR',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Créer le dossier de logs
mkdir -p "$APP_DIR/logs"

# Étape 9: Démarrer/Redémarrer avec PM2
info "Démarrage de l'application avec PM2..."
if pm2 list | grep -q "fonaredd-app"; then
    info "Application déjà en cours d'exécution. Redémarrage..."
    pm2 restart fonaredd-app
else
    info "Démarrage de l'application..."
    pm2 start ecosystem.config.js
fi

# Sauvegarder la configuration PM2
pm2 save

# Étape 10: Configurer PM2 pour démarrer au boot
info "Configuration de PM2 pour le démarrage automatique..."
if ! pm2 startup | grep -q "already"; then
    info "Suivez les instructions ci-dessus pour configurer le démarrage automatique"
    pm2 startup
fi

echo ""
echo "=========================================="
info "Déploiement terminé avec succès !"
echo "=========================================="
echo ""
echo "Commandes utiles :"
echo "  - Voir le statut : pm2 status"
echo "  - Voir les logs  : pm2 logs fonaredd-app"
echo "  - Redémarrer     : pm2 restart fonaredd-app"
echo "  - Arrêter         : pm2 stop fonaredd-app"
echo ""
echo "L'application devrait être accessible sur :"
echo "  http://91.134.44.14:3001"
echo ""
