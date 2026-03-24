# 🔧 Correction des Problèmes de Déploiement Ubuntu

## Problème 1 : package.json introuvable

Vérifiez que vous avez bien cloné le dépôt :

```bash
# Vérifier où vous êtes
pwd

# Vérifier le contenu du dossier
ls -la

# Si le dossier est vide ou ne contient pas package.json, recloner :
cd ~
rm -rf fonaredd
git clone https://github.com/shadjava2/fonaredd.git
cd fonaredd

# Vérifier que package.json existe
ls -la package.json
```

## Problème 2 : Node.js version 12 (trop ancien)

Vous devez installer Node.js 18+ :

```bash
# 1. Désinstaller l'ancienne version (si nécessaire)
sudo apt remove nodejs npm -y
sudo apt purge nodejs npm -y

# 2. Nettoyer les fichiers résiduels
sudo apt autoremove -y
sudo apt autoclean

# 3. Installer Node.js 18 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 4. Vérifier la version (doit être 18.x ou supérieur)
node --version
npm --version
```

## Solution Complète - Étapes à Suivre

```bash
# ÉTAPE 1 : Vérifier et corriger Node.js
node --version
# Si vous voyez v12.x, continuez avec l'installation ci-dessus

# ÉTAPE 2 : Aller dans le bon dossier
cd ~
rm -rf fonaredd  # Supprimer l'ancien dossier si nécessaire
git clone https://github.com/shadjava2/fonaredd.git
cd fonaredd

# ÉTAPE 3 : Vérifier que package.json existe
ls -la package.json
# Si vous voyez package.json, continuez

# ÉTAPE 4 : Installer les dépendances
npm install --production --no-optional

# ÉTAPE 5 : Générer Prisma
npx prisma generate

# ÉTAPE 6 : Builder
npm run build
```

## Si Node.js 18 ne s'installe pas

Utilisez nvm (Node Version Manager) :

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer Node.js 18
nvm install 18
nvm use 18
nvm alias default 18

# Vérifier
node --version  # Doit afficher v18.x.x
npm --version
```
