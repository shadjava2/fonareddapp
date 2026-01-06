# Fonaredd App

Application de bureau multiplateforme pour la gestion interne de Fonaredd, développée avec Electron + Next.js PWA, Prisma et MySQL.

## 🚀 Fonctionnalités

- **Authentification sécurisée** avec JWT et cookies HttpOnly
- **Système RBAC complet** (rôles, permissions, services)
- **Gestion des congés** avec calcul automatique des jours ouvrés
- **Interface moderne** avec Tailwind CSS et thème vert
- **PWA** pour installation sur bureau
- **Multiplateforme** (Windows, macOS, Linux)

## 🛠️ Technologies

- **Frontend**: Next.js 14, React 18, TypeScript
- **Desktop**: Electron avec sécurité renforcée
- **Base de données**: MySQL avec Prisma ORM
- **Styling**: Tailwind CSS avec thème personnalisé
- **Authentification**: JWT + bcrypt
- **PWA**: next-pwa pour installation offline

## 📋 Prérequis

- Node.js 18+
- MySQL 8.0+
- npm ou yarn

## ⚙️ Installation

### 🐳 Option 1: Docker (Recommandé)

1. **Cloner le projet**
```bash
git clone <repository-url>
cd fonareddapp
```

2. **Configuration automatique**
```bash
# Exécuter le script de configuration Docker
bash docker/scripts/setup.sh
```

3. **Démarrer l'application**
```bash
# Mode développement
docker-compose up -d app-dev

# Mode production
docker-compose up -d app-prod

# Voir les logs
docker-compose logs -f app-dev
```

**URLs d'accès :**
- Développement: http://localhost:3000
- Production: http://localhost:3001
- MySQL: localhost:3306

### 💻 Option 2: Installation locale

1. **Cloner le projet**
```bash
git clone <repository-url>
cd fonareddapp
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration de l'environnement**
```bash
cp env.example .env
```

Éditer le fichier `.env` :
```env
DATABASE_URL="mysql://username:password@localhost:3306/fonaredd_db"
JWT_SECRET="votre_cle_secrete_jwt_tres_longue_et_complexe"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="votre_cle_secrete_nextauth"
NODE_ENV="development"
```

4. **Configuration de la base de données**
```bash
# Générer le client Prisma
npm run prisma:gen

# Synchroniser le schéma avec la base existante
npm run prisma:pull
```

5. **Démarrer l'application**
```bash
# Mode développement
npm run dev

# Build pour production
npm run build

# Créer l'exécutable
npm run dist
```

## 🗄️ Structure de la base de données

L'application utilise une base MySQL existante avec les tables principales :

- `utilisateurs` - Utilisateurs du système
- `roles` - Rôles utilisateurs
- `permissions` - Permissions système
- `services` - Services disponibles
- `sites` - Sites/lieux de travail
- `roles_permissions` - Liaison rôles-permissions
- `droits_services` - Liaison utilisateurs-services
- `calendrier` - Calendrier des jours ouvrés/fériés
- `congeconfig` - Configuration des congés
- `congedemande` - Demandes de congés
- `congesolde` - Soldes de congés par utilisateur
- `notifications` - Notifications système

## 🔐 Authentification

### Login
- Authentification par `username` + `mot_de_passe`
- Hash bcrypt des mots de passe
- Session JWT HttpOnly (12h)
- Vérification du statut `locked`

### Mot de passe initial
- Si `initPassword = 0`, modal obligatoire pour définir un nouveau mot de passe
- Validation côté client et serveur
- Mise à jour automatique du statut

### Permissions RBAC
- `USER_MANAGE` - Gestion des utilisateurs
- `ROLE_MANAGE` - Gestion des rôles et permissions
- `SERVICE_MANAGE` - Gestion des services
- `SITE_MANAGE` - Gestion des sites
- `CONGE_MANAGE` - Gestion des congés
- `CONGE_REQUEST` - Demander des congés
- `CALENDAR_MANAGE` - Gestion du calendrier

## 📱 Modules

### 1. Administration
- **Utilisateurs** : CRUD avec autocomplete
- **Rôles** : Gestion des rôles système
- **Permissions** : Gestion des permissions
- **Services** : Gestion des services
- **Sites** : Gestion des sites
- **Droits services** : Attribution des services aux utilisateurs
- **Rôles-permissions** : Attribution des permissions aux rôles

### 2. Gestion Congé
- **Calendrier** : Gestion des jours ouvrés/fériés
- **Configuration** : Paramètres généraux des congés
- **Demandes** : Création et suivi des demandes
- **Calcul automatique** : Périodes basées sur le calendrier

### 3. Gestion Présence
- Module préparé pour future extension

## 🎨 Interface utilisateur

### Thème
- Couleur principale : Vert emerald (#10B981)
- Mode sombre disponible
- Design responsive mobile-first

### Composants
- **Formulaires génériques** avec validation Zod
- **Tableaux** avec pagination serveur
- **Autocomplete** avec debounce
- **Modales** accessibles
- **Navigation** sidebar responsive

## 🔧 Scripts disponibles

### Scripts npm
```bash
# Développement
npm run dev          # Lance Next.js + Electron
npm run build        # Build Next.js + compilation Electron
npm run dist         # Créer l'exécutable

# Base de données
npm run prisma:pull  # Synchroniser le schéma
npm run prisma:gen   # Générer le client Prisma
npm run prisma:studio # Interface graphique Prisma

# Qualité du code
npm run lint         # Vérifier le code
npm run lint:fix     # Corriger automatiquement
npm run format       # Formater le code
npm run type-check   # Vérification TypeScript
```

### Scripts Docker

#### Windows (PowerShell)
```powershell
# Build et lancement complet
.\docker\build.ps1

# Lancement rapide (développement)
.\docker\run.ps1

# Commandes manuelles
docker-compose up -d app-dev    # Démarrer en mode dev
docker-compose logs -f app-dev  # Voir les logs
docker-compose down             # Arrêter tous les services
```

#### Linux/macOS (Bash)
```bash
# Configuration initiale
bash docker/scripts/setup.sh

# Build et lancement complet
bash docker/build.sh

# Lancement rapide (développement)
bash docker/run.sh

# Commandes manuelles
docker-compose up -d app-dev    # Démarrer en mode dev
docker-compose logs -f app-dev  # Voir les logs
docker-compose down             # Arrêter tous les services
```

## 🏗️ Architecture

```
src/
├── components/          # Composants réutilisables
│   ├── ui/             # Composants UI de base
│   ├── layout/         # Layout et navigation
│   └── auth/           # Composants d'authentification
├── hooks/              # Hooks personnalisés
├── lib/                # Utilitaires et configuration
├── pages/              # Pages Next.js
│   ├── api/            # API routes
│   └── *.tsx           # Pages de l'application
└── styles/             # Styles globaux

electron/               # Code Electron
├── main.ts            # Processus principal
├── preload.ts         # Script de préchargement
└── utils.ts           # Utilitaires Electron

prisma/
└── schema.prisma      # Schéma de base de données
```

## 🔒 Sécurité

### Electron
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- API minimale exposée via preload

### API
- JWT avec cookies HttpOnly
- Validation des entrées avec Zod
- Vérification des permissions sur chaque endpoint
- Hash bcrypt des mots de passe

### Base de données
- Requêtes préparées via Prisma
- Validation des types TypeScript
- Gestion des erreurs centralisée

## 📦 Build et déploiement

### Développement
```bash
npm run dev
```
Lance Next.js sur le port 3000 et Electron connecté.

### Production
```bash
npm run build
npm run dist
```
Crée l'exécutable dans `dist-electron/`.

### Configuration Electron Builder
- **Windows** : NSIS installer
- **macOS** : DMG (Intel + Apple Silicon)
- **Linux** : AppImage + DEB

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de connexion à la base**
   - Vérifier la `DATABASE_URL` dans `.env`
   - S'assurer que MySQL est démarré
   - Vérifier les permissions utilisateur

2. **Erreur JWT**
   - Vérifier `JWT_SECRET` dans `.env`
   - Redémarrer l'application après modification

3. **Problème de build Electron**
   - Vérifier que `next build` fonctionne
   - Nettoyer `node_modules` et réinstaller

### Logs
Les logs sont disponibles dans la console Electron (F12) et dans les logs serveur Next.js.

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/nouvelle-fonctionnalite`)
3. Commit les changements (`git commit -am 'Ajouter nouvelle fonctionnalité'`)
4. Push vers la branche (`git push origin feature/nouvelle-fonctionnalite`)
5. Créer une Pull Request

## 📄 Licence

Ce projet est sous licence propriétaire Fonaredd.

## 📞 Support

Pour toute question ou problème :
- Créer une issue sur le repository
- Contacter l'équipe de développement

---

**Fonaredd App** - Application de gestion interne sécurisée et moderne.
