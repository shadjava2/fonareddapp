# Guide de Déploiement - Fonaredd App sur Windows Server

## 📋 Prérequis sur le Serveur Windows

### 1. Installation de Node.js
- Télécharger Node.js version 18 ou supérieure depuis [nodejs.org](https://nodejs.org/)
- Installer avec les options par défaut
- Vérifier l'installation : `node --version` (doit afficher v18.x.x ou supérieur)
- Vérifier npm : `npm --version`

### 2. Installation de MySQL (si base de données locale)
- Télécharger MySQL Server depuis [mysql.com](https://dev.mysql.com/downloads/mysql/)
- Installer MySQL Server
- Noter le mot de passe root créé lors de l'installation
- Créer la base de données : `fonaredd_db` (ou utiliser votre nom de base existant)

### 3. Préparation du dossier d'installation
- Créer un dossier pour l'application, par exemple : `C:\fonaredd-app`
- Assurez-vous que le dossier a les permissions d'écriture

---

## 🚀 Étape 1 : Build de Production (sur la machine de développement)

### Option A : Build complet (recommandé)
```batch
build-prod.bat
```

### Option B : Build manuel
```batch
npm ci --no-optional --legacy-peer-deps
npx prisma generate
set NODE_ENV=production
npm run build
```

### Résultat
Le dossier `dist` contient tous les fichiers nécessaires pour le déploiement.

---

## 📦 Étape 2 : Copie sur le Serveur Windows

### Fichiers à copier
Copiez **tout le contenu** du dossier `dist` sur le serveur dans le dossier d'installation (ex: `C:\fonaredd-app`).

Structure attendue sur le serveur :
```
C:\fonaredd-app\
├── .next\
│   ├── standalone\
│   └── static\
├── public\
├── prisma\
│   └── schema.prisma
├── package.json
├── package-lock.json
├── next.config.js
├── start.bat
└── .env.local (à créer)
```

---

## ⚙️ Étape 3 : Configuration sur le Serveur

### 1. Créer le fichier `.env.local`

Dans le dossier `C:\fonaredd-app`, créer un fichier `.env.local` avec le contenu suivant :

```env
# Configuration de la base de données
# Utilisez la même DATABASE_URL que votre configuration actuelle
DATABASE_URL="mysql://username:password@localhost:3306/fonaredd_db"

# Clé secrète pour JWT (générez une clé complexe)
JWT_SECRET="votre_cle_secrete_jwt_tres_longue_et_complexe"

# Configuration Next.js
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="votre_cle_secrete_nextauth"

# Configuration PWA
NODE_ENV="production"

# Port de l'application (optionnel, par défaut 3001)
PORT=3001
```

**⚠️ Important :**
- Remplacez `username`, `password`, et `localhost:3306` par vos paramètres MySQL réels
- Remplacez `fonaredd_db` par le nom de votre base de données
- Générez des clés secrètes complexes pour `JWT_SECRET` et `NEXTAUTH_SECRET`

### 2. Installation des dépendances

Ouvrir PowerShell ou CMD en tant qu'administrateur dans le dossier `C:\fonaredd-app` :

```batch
npm install --production --no-optional
```

### 3. Génération du client Prisma

```batch
npx prisma generate
```

### 4. Vérification de la base de données

Assurez-vous que :
- MySQL est démarré
- La base de données existe
- Les migrations Prisma sont appliquées (si nécessaire) : `npx prisma migrate deploy`

---

## ▶️ Étape 4 : Démarrage de l'Application

### Option A : Démarrage manuel
Double-cliquer sur `start.bat` ou exécuter :
```batch
start.bat
```

### Option B : Via npm
```batch
npm start
```

### Option C : Via node directement
```batch
set PORT=3001
set NODE_ENV=production
node .next\standalone\server.js
```

### Vérification
- Ouvrir un navigateur et accéder à : `http://localhost:3001`
- L'application devrait être accessible

---

## 🔄 Étape 5 : Configuration en Service Windows (Démarrage Automatique)

### Créer un service Windows avec NSSM (Non-Sucking Service Manager)

1. **Télécharger NSSM**
   - Télécharger depuis [nssm.cc](https://nssm.cc/download)
   - Extraire dans un dossier, par exemple : `C:\nssm`

2. **Créer le service**
   ```batch
   cd C:\nssm\win64
   nssm install FonareddApp
   ```

3. **Configurer le service**
   - **Path** : `C:\Program Files\nodejs\node.exe`
   - **Startup directory** : `C:\fonaredd-app`
   - **Arguments** : `.next\standalone\server.js`
   - **Service name** : `FonareddApp`
   - **Display name** : `Fonaredd App - Production`

4. **Variables d'environnement** (dans l'onglet Environment)
   - Ajouter : `PORT=3001`
   - Ajouter : `NODE_ENV=production`
   - Ajouter toutes les variables de `.env.local`

5. **Démarrer le service**
   ```batch
   nssm start FonareddApp
   ```

6. **Vérifier le statut**
   ```batch
   nssm status FonareddApp
   ```

### Alternative : Utiliser Task Scheduler

1. Ouvrir **Planificateur de tâches** (Task Scheduler)
2. Créer une tâche de base
3. **Déclencheur** : Au démarrage de l'ordinateur
4. **Action** : Démarrer un programme
   - Programme : `C:\fonaredd-app\start.bat`
   - Démarrer dans : `C:\fonaredd-app`
5. **Options** : Exécuter que l'utilisateur soit connecté ou non

---

## 🔧 Configuration du Pare-feu Windows

Pour permettre l'accès depuis d'autres machines :

1. Ouvrir **Pare-feu Windows Defender**
2. **Paramètres avancés** → **Règles de trafic entrant** → **Nouvelle règle**
3. **Type de règle** : Port
4. **Protocole** : TCP
5. **Ports locaux spécifiques** : `3001`
6. **Action** : Autoriser la connexion
7. **Nom** : `Fonaredd App - Port 3001`

---

## 🌐 Configuration avec IIS (Optionnel)

Si vous souhaitez utiliser IIS comme reverse proxy :

1. Installer **IIS** et **URL Rewrite Module**
2. Créer un site dans IIS
3. Configurer le reverse proxy vers `http://localhost:3001`
4. Configurer les règles de réécriture d'URL

---

## 📝 Vérification et Tests

### Vérifier que l'application fonctionne
- ✅ Accéder à `http://localhost:3001`
- ✅ Tester la connexion à la base de données
- ✅ Tester l'authentification
- ✅ Vérifier les logs pour les erreurs

### Logs
Les logs de l'application s'affichent dans la console. Pour les sauvegarder :
```batch
node .next\standalone\server.js > logs.txt 2>&1
```

---

## 🔄 Mise à Jour de l'Application

1. Arrêter l'application (ou le service)
2. Sauvegarder le fichier `.env.local`
3. Copier les nouveaux fichiers du dossier `dist`
4. Exécuter : `npm install --production`
5. Exécuter : `npx prisma generate`
6. Redémarrer l'application

---

## ❌ Dépannage

### Port 3001 déjà utilisé
```batch
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Erreur de connexion à la base de données
- Vérifier que MySQL est démarré
- Vérifier les credentials dans `.env.local`
- Vérifier que la base de données existe

### Erreur Prisma
```batch
npx prisma generate
npx prisma migrate deploy
```

### L'application ne démarre pas
- Vérifier les logs d'erreur
- Vérifier que Node.js est installé : `node --version`
- Vérifier que toutes les dépendances sont installées

---

## 📞 Support

En cas de problème :
1. Vérifier les logs de l'application
2. Vérifier les logs Windows (Event Viewer)
3. Vérifier la configuration `.env.local`
4. Vérifier que tous les prérequis sont installés

---

## ✅ Checklist de Déploiement

- [ ] Node.js 18+ installé sur le serveur
- [ ] MySQL installé et configuré (ou base de données distante accessible)
- [ ] Dossier d'installation créé
- [ ] Fichiers copiés depuis le dossier `dist`
- [ ] Fichier `.env.local` créé et configuré
- [ ] Dépendances installées (`npm install --production`)
- [ ] Client Prisma généré (`npx prisma generate`)
- [ ] Base de données accessible
- [ ] Application démarre sans erreur
- [ ] Application accessible sur `http://localhost:3001`
- [ ] Pare-feu configuré (si accès externe nécessaire)
- [ ] Service Windows créé (si démarrage automatique souhaité)

---

**Date de création** : $(Get-Date -Format "yyyy-MM-dd")
**Version** : 1.0
**Port de production** : 3001



