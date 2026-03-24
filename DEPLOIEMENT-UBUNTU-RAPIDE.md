# 🚀 Déploiement Rapide Ubuntu - Guide Express

## Méthode 1 : Script Automatique (Recommandé)

### Sur votre serveur Ubuntu :

```bash
# 1. Se connecter au serveur
ssh ubuntu@91.134.44.14

# 2. Télécharger le script de déploiement
wget https://raw.githubusercontent.com/shadjava2/fonaredd/main/deploy-ubuntu.sh

# Ou cloner le dépôt
git clone https://github.com/shadjava2/fonaredd.git
cd fonaredd

# 3. Rendre le script exécutable
chmod +x deploy-ubuntu.sh

# 4. Exécuter le script
./deploy-ubuntu.sh
```

Le script va automatiquement :

- ✅ Vérifier et installer les prérequis (Node.js, Git, PM2)
- ✅ Cloner le dépôt
- ✅ Créer le fichier `.env.local` avec votre DATABASE_URL
- ✅ Installer les dépendances
- ✅ Builder l'application
- ✅ Démarrer avec PM2

## Méthode 2 : Déploiement Manuel

### 1. Installer les prérequis

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Installer Git
sudo apt install -y git

# Installer PM2
sudo npm install -g pm2
```

### 2. Cloner et configurer

```bash
# Créer le dossier
sudo mkdir -p /opt/fonaredd-app
sudo chown $USER:$USER /opt/fonaredd-app

# Cloner le dépôt
cd /opt/fonaredd-app
git clone https://github.com/shadjava2/fonaredd.git .

# Créer .env.local
nano .env.local
```

Ajoutez dans `.env.local` :

```env
DATABASE_URL="mysql://giformapp:SDconceptsrdc243_243@91.134.44.14:3306/fonaredd-app?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"
JWT_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
NEXTAUTH_URL="http://91.134.44.14:3001"
NODE_ENV="production"
PORT=3001
```

### 3. Installer et builder

```bash
# Installer les dépendances
npm install --production --no-optional

# Générer Prisma
npx prisma generate

# Builder
npm run build
```

### 4. Démarrer avec PM2

```bash
# Copier le fichier ecosystem.config.js (depuis le dépôt)
# Modifier le chemin dans ecosystem.config.js si nécessaire

# Démarrer
pm2 start ecosystem.config.js

# Sauvegarder
pm2 save

# Configurer le démarrage automatique
pm2 startup
# Suivez les instructions affichées
```

### 5. Configurer Nginx (Optionnel)

```bash
# Installer Nginx
sudo apt install -y nginx

# Copier la configuration
sudo cp nginx-fonaredd.conf /etc/nginx/sites-available/fonaredd-app

# Activer
sudo ln -s /etc/nginx/sites-available/fonaredd-app /etc/nginx/sites-enabled/

# Tester et redémarrer
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Configurer le Firewall

```bash
# Autoriser les ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
sudo ufw enable
```

## ✅ Vérification

```bash
# Vérifier PM2
pm2 status

# Voir les logs
pm2 logs fonaredd-app

# Tester l'application
curl http://localhost:3001
```

Accédez à : **http://91.134.44.14:3001**

## 🔄 Mise à jour

```bash
cd /opt/fonaredd-app
git pull origin main
npm install --production --no-optional
npx prisma generate
npm run build
pm2 restart fonaredd-app
```

## 📖 Documentation Complète

Voir `DEPLOIEMENT-UBUNTU.md` pour plus de détails.
