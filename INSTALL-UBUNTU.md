# 🔧 Installation Node.js et npm sur Ubuntu

## Installation de Node.js 18+ et npm

Sur votre serveur Ubuntu, exécutez ces commandes dans l'ordre :

```bash
# 1. Mettre à jour le système
sudo apt update

# 2. Installer Node.js 18 via NodeSource (recommandé)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Vérifier l'installation
node --version
npm --version
```

Vous devriez voir :

- Node.js version 18.x ou supérieur
- npm version 9.x ou supérieur

## Si l'installation échoue

### Option 1 : Installation via le dépôt Ubuntu (version plus ancienne)

```bash
sudo apt update
sudo apt install -y nodejs npm
```

### Option 2 : Installation via nvm (Node Version Manager)

```bash
# Installer nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Recharger le shell
source ~/.bashrc

# Installer Node.js 18
nvm install 18
nvm use 18

# Vérifier
node --version
npm --version
```

## Après l'installation

Une fois Node.js et npm installés, vous pouvez continuer avec le déploiement :

```bash
# Aller dans le dossier du projet
cd ~/fonaredd

# Installer les dépendances
npm install --production --no-optional

# Générer Prisma
npx prisma generate

# Builder l'application
npm run build
```
