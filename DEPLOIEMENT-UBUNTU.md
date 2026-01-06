# 🚀 Guide de Déploiement - Serveur Ubuntu

## 📋 Prérequis

- Serveur Ubuntu (20.04 ou supérieur)
- Accès SSH au serveur
- Node.js 18+ installé
- MySQL installé et configuré
- Git installé
- Port 3001 disponible (ou autre port de votre choix)

## 🔧 Étape 1 : Installation des Prérequis

### 1.1 Mettre à jour le système

```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Installer Node.js 18+

```bash
# Installer Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier l'installation
node --version
npm --version
```

### 1.3 Installer Git (si pas déjà installé)

```bash
sudo apt install -y git
```

### 1.4 Installer PM2 (Gestionnaire de processus)

```bash
sudo npm install -g pm2
```

## 📥 Étape 2 : Cloner le Dépôt

```bash
# Créer un dossier pour l'application
sudo mkdir -p /opt/fonaredd-app
sudo chown $USER:$USER /opt/fonaredd-app

# Cloner le dépôt
cd /opt/fonaredd-app
git clone https://github.com/shadjava2/fonaredd.git .

# Ou si vous préférez un autre emplacement
cd ~
git clone https://github.com/shadjava2/fonaredd.git fonaredd-app
cd fonaredd-app
```

## 🔐 Étape 3 : Configuration de l'Environnement

### 3.1 Créer le fichier .env.local

```bash
nano .env.local
```

Ajoutez le contenu suivant (adaptez selon votre configuration) :

```env
# Base de données MySQL
DATABASE_URL="mysql://giformapp:SDconceptsrdc243_243@91.134.44.14:3306/fonaredd-app?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"

# Clés secrètes (CHANGEZ CES VALEURS EN PRODUCTION !)
JWT_SECRET="votre-cle-secrete-jwt-tres-longue-et-securisee-changez-moi"
NEXTAUTH_SECRET="votre-cle-secrete-nextauth-changez-moi"

# Configuration Next.js
NEXTAUTH_URL="http://91.134.44.14:3001"
NODE_ENV="production"
PORT=3001

# Hikvision (optionnel)
HIK_HOST="http://192.168.10.50"
HIK_USER="admin"
HIK_PASS="Fonaredd"
```

**⚠️ IMPORTANT :** Changez les clés secrètes (`JWT_SECRET` et `NEXTAUTH_SECRET`) par des valeurs aléatoires sécurisées !

### 3.2 Générer des clés secrètes sécurisées

```bash
# Générer JWT_SECRET
openssl rand -base64 32

# Générer NEXTAUTH_SECRET
openssl rand -base64 32
```

## 📦 Étape 4 : Installation des Dépendances

```bash
# Installer les dépendances de production
npm install --production --no-optional

# Générer le client Prisma
npx prisma generate
```

## 🏗️ Étape 5 : Build de l'Application

```bash
# Builder l'application Next.js
npm run build
```

## 🚀 Étape 6 : Démarrage avec PM2

### 6.1 Créer un fichier de configuration PM2

```bash
nano ecosystem.config.js
```

Ajoutez :

```javascript
module.exports = {
  apps: [{
    name: 'fonaredd-app',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3001',
    cwd: '/opt/fonaredd-app', // Changez selon votre emplacement
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
```

### 6.2 Démarrer l'application avec PM2

```bash
# Créer le dossier de logs
mkdir -p logs

# Démarrer l'application
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées
```

### 6.3 Commandes PM2 utiles

```bash
# Voir le statut
pm2 status

# Voir les logs
pm2 logs fonaredd-app

# Redémarrer
pm2 restart fonaredd-app

# Arrêter
pm2 stop fonaredd-app

# Supprimer
pm2 delete fonaredd-app
```

## 🌐 Étape 7 : Configuration Nginx (Optionnel mais Recommandé)

### 7.1 Installer Nginx

```bash
sudo apt install -y nginx
```

### 7.2 Créer la configuration Nginx

```bash
sudo nano /etc/nginx/sites-available/fonaredd-app
```

Ajoutez :

```nginx
server {
    listen 80;
    server_name 91.134.44.14; # Remplacez par votre domaine si vous en avez un

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.3 Activer la configuration

```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/fonaredd-app /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Activer Nginx au démarrage
sudo systemctl enable nginx
```

## 🔥 Étape 8 : Configuration du Firewall

```bash
# Autoriser le port 80 (HTTP)
sudo ufw allow 80/tcp

# Autoriser le port 443 (HTTPS) si vous utilisez SSL
sudo ufw allow 443/tcp

# Autoriser le port 3001 (si vous accédez directement)
sudo ufw allow 3001/tcp

# Vérifier le statut
sudo ufw status
```

## ✅ Étape 9 : Vérification

### 9.1 Vérifier que l'application fonctionne

```bash
# Vérifier PM2
pm2 status

# Vérifier les logs
pm2 logs fonaredd-app --lines 50

# Tester la connexion
curl http://localhost:3001
```

### 9.2 Accéder à l'application

- **Directement :** http://91.134.44.14:3001
- **Via Nginx :** http://91.134.44.14

## 🔄 Mise à Jour de l'Application

```bash
# Aller dans le dossier de l'application
cd /opt/fonaredd-app

# Récupérer les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm install --production --no-optional

# Régénérer Prisma si nécessaire
npx prisma generate

# Rebuilder l'application
npm run build

# Redémarrer avec PM2
pm2 restart fonaredd-app
```

## 🐛 Dépannage

### L'application ne démarre pas

```bash
# Vérifier les logs
pm2 logs fonaredd-app

# Vérifier la connexion à la base de données
npx prisma db pull

# Vérifier les variables d'environnement
cat .env.local
```

### Erreur de connexion à la base de données

- Vérifiez que MySQL est démarré : `sudo systemctl status mysql`
- Vérifiez que le port 3306 est accessible
- Vérifiez les identifiants dans `.env.local`
- Testez la connexion : `mysql -h 91.134.44.14 -u giformapp -p`

### Port déjà utilisé

```bash
# Trouver le processus utilisant le port 3001
sudo lsof -i :3001

# Ou
sudo netstat -tulpn | grep 3001
```

### PM2 ne démarre pas au boot

```bash
# Régénérer le script de démarrage
pm2 unstartup
pm2 startup
# Suivez les instructions
```

## 📝 Checklist de Déploiement

- [ ] Node.js 18+ installé
- [ ] Git installé
- [ ] PM2 installé
- [ ] Dépôt cloné
- [ ] `.env.local` configuré avec les bonnes valeurs
- [ ] Dépendances installées (`npm install --production`)
- [ ] Client Prisma généré (`npx prisma generate`)
- [ ] Application buildée (`npm run build`)
- [ ] Application démarrée avec PM2
- [ ] PM2 configuré pour démarrer au boot
- [ ] Nginx configuré (optionnel)
- [ ] Firewall configuré
- [ ] Application accessible depuis l'extérieur

## 🔒 Sécurité

1. **Changez les clés secrètes** dans `.env.local`
2. **Configurez SSL/HTTPS** avec Let's Encrypt si vous avez un domaine
3. **Limitez l'accès** à la base de données MySQL
4. **Configurez un firewall** approprié
5. **Mettez à jour régulièrement** le système et les dépendances

## 📞 Support

En cas de problème, vérifiez :
- Les logs PM2 : `pm2 logs fonaredd-app`
- Les logs Nginx : `sudo tail -f /var/log/nginx/error.log`
- Le statut des services : `sudo systemctl status mysql nginx`
