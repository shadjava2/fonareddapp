# Guide de Déploiement - Serveur de Production

## ✅ Étape 1 : Vérification des Prérequis

### 1.1 Vérifier Node.js

Ouvrez PowerShell ou CMD et exécutez :

```batch
node --version
```

**Doit afficher :** v18.x.x ou supérieur

Si Node.js n'est pas installé :

- Téléchargez depuis : https://nodejs.org/
- Installez la version LTS (18 ou supérieur)

### 1.2 Vérifier npm

```batch
npm --version
```

**Doit afficher :** une version de npm

---

## ✅ Étape 2 : Installation des Dépendances

Ouvrez PowerShell ou CMD **dans le dossier** `C:\prodfonaredd` et exécutez :

```batch
npm install --production --no-optional
```

Cette commande va :

- Installer uniquement les dépendances de production
- Ignorer les dépendances optionnelles
- Prendre quelques minutes

---

## ✅ Étape 3 : Génération du Client Prisma

Toujours dans le dossier `C:\prodfonaredd`, exécutez :

```batch
npx prisma generate
```

Cette commande génère le client Prisma pour se connecter à MySQL.

---

## ✅ Étape 4 : Vérification de la Configuration

### 4.1 Vérifier le fichier .env.local

Ouvrez le fichier `.env.local` dans `C:\prodfonaredd` et vérifiez :

```env
DATABASE_URL="mysql://username:password@host:3306/database_name?allowPublicKeyRetrieval=true&ssl=false&connectTimeout=10000"
PORT=3001
NEXTAUTH_URL="http://localhost:3001"
NODE_ENV="production"
```

**Important :**

- Remplacez `username`, `password`, `host`, et `database_name` par vos propres valeurs
- Vérifiez que `DATABASE_URL` correspond à votre configuration MySQL
- Vérifiez que le port MySQL est correct
- Vérifiez que le nom de la base de données est correct

### 4.2 Vérifier que MySQL est démarré

Assurez-vous que MySQL est en cours d'exécution et accessible.

---

## ✅ Étape 5 : Démarrage de l'Application

### Option A : Double-clic sur start.bat

Double-cliquez sur le fichier `start.bat` dans `C:\prodfonaredd`

### Option B : Via la ligne de commande

Ouvrez PowerShell ou CMD dans `C:\prodfonaredd` et exécutez :

```batch
start.bat
```

### Option C : Via npm

```batch
npm start
```

---

## ✅ Étape 6 : Vérification

Une fois l'application démarrée, vous devriez voir :

```
========================================
  FONAREDD APP - PRODUCTION
  Port: 3001
========================================

[1/2] Generation du client Prisma...
✓ Client Prisma genere

[2/2] Demarrage du serveur sur le port 3001...

L'application sera accessible sur: http://localhost:3001
```

### Accéder à l'application :

- **Localement :** http://localhost:3001
- **Depuis le réseau :** http://192.168.10.75:3001 (remplacez par l'IP de votre serveur)

---

## 🔧 Dépannage

### Erreur : "Node.js n'est pas installé"

→ Installez Node.js 18+ depuis https://nodejs.org/

### Erreur : "Echec de la generation Prisma"

→ Vérifiez votre `DATABASE_URL` dans `.env.local`
→ Vérifiez que MySQL est démarré
→ Vérifiez que la base de données existe

### Erreur : "Port 3001 déjà utilisé"

```batch
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### L'application ne démarre pas

→ Vérifiez les logs dans la console
→ Vérifiez que tous les fichiers sont présents
→ Vérifiez les permissions du dossier

### Problème d'affichage

→ Vérifiez que `NEXTAUTH_URL` dans `.env.local` est bien `http://localhost:3001`
→ Vérifiez que le port 3001 est accessible

---

## 🔄 Démarrage Automatique (Optionnel)

Pour que l'application démarre automatiquement au démarrage de Windows, consultez :

- `GUIDE-DEPLOIEMENT-WINDOWS.md`
- Utilisez NSSM (Non-Sucking Service Manager) pour créer un service Windows

---

## 📝 Checklist de Déploiement

- [ ] Node.js 18+ installé
- [ ] npm installé
- [ ] Fichiers copiés dans `C:\prodfonaredd`
- [ ] Dépendances installées (`npm install --production`)
- [ ] Client Prisma généré (`npx prisma generate`)
- [ ] Fichier `.env.local` vérifié et configuré
- [ ] MySQL démarré et accessible
- [ ] Application démarrée (`start.bat`)
- [ ] Application accessible sur http://localhost:3001

---

**Date de création :** 2024
**Version :** 1.0
**Port de production :** 3001
