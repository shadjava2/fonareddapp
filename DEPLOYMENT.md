# 🚀 Déploiement Rapide - Fonaredd App

## ⚡ Déploiement Express (1 heure)

### Prérequis

- ✅ Node.js 18+ installé
- ✅ MySQL démarré et accessible sur `localhost:32768`
- ✅ Base de données `fonaredd-app` existante
- ✅ Base de données MySQL configurée avec vos identifiants

### 🎯 Déploiement en 3 étapes

#### Option 1: Script automatique (Recommandé)

```bash
# Windows (PowerShell)
.\deploy.ps1

# Windows (CMD)
deploy.bat
```

#### Option 2: Déploiement manuel

```bash
# 1. Installer les dépendances
npm install --no-optional --legacy-peer-deps

# 2. Générer le client Prisma
npx prisma generate

# 3. Tester la connexion DB
npx prisma db pull

# 4. Démarrer l'application
npm run dev
```

### 🌐 Accès à l'application

- **URL**: http://localhost:3000
- **Login**: Utilisez les identifiants de votre base de données existante

### 📋 Fonctionnalités disponibles

- ✅ **Authentification** avec JWT
- ✅ **RBAC** (Gestion des rôles et permissions)
- ✅ **CRUD** générique pour toutes les entités
- ✅ **Gestion des congés** avec calcul automatique
- ✅ **Interface responsive** avec thème vert
- ✅ **PWA** (Progressive Web App)

### 🔧 Configuration

Le fichier `.env` est déjà configuré avec :

```env
DATABASE_URL="mysql://username:password@host:3306/database_name?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-very-long-and-secure"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-change-in-production"
NODE_ENV="development"
```

### 🐳 Déploiement Docker (Optionnel)

```bash
# Build et run avec Docker
docker-compose up --build app-dev
```

### 📱 Modules disponibles

1. **Admin** - Gestion des utilisateurs, rôles, services, sites
2. **Congé** - Demandes de congés, calendrier, soldes
3. **Notifications** - Système de notifications

### 🚨 Dépannage

- **Erreur de connexion DB**: Vérifiez que MySQL est démarré
- **Erreur npm**: Utilisez `--legacy-peer-deps`
- **Port occupé**: Changez le port dans `package.json`

### 📞 Support

L'application est prête pour la production avec toutes les fonctionnalités demandées !
