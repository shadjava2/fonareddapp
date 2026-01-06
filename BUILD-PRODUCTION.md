# Guide de Build pour Production Windows

Ce guide explique comment créer un build de production pour déployer l'application Fonaredd sur une machine Windows.

## 🚀 Méthodes de Build

### Option 1 : Script Batch (Recommandé)

```batch
build-prod.bat
```

Ce script effectue automatiquement :
1. ✅ Vérification de l'environnement (Node.js, npm)
2. ✅ Nettoyage des anciens builds
3. ✅ Installation des dépendances
4. ✅ Génération du client Prisma
5. ✅ Build de l'application Next.js
6. ✅ Préparation du package de déploiement
7. ✅ Vérification du package

### Option 2 : Script PowerShell

```powershell
.\build-prod.ps1
```

Fonctionne de la même manière que le script batch, mais avec une meilleure gestion des erreurs et un affichage coloré.

### Option 3 : Build Manuel

Si vous préférez exécuter les commandes manuellement :

```batch
# 1. Nettoyage
rmdir /s /q .next dist out

# 2. Installation des dépendances
npm ci --no-optional --legacy-peer-deps

# 3. Génération Prisma
npx prisma generate

# 4. Build Next.js
set NODE_ENV=production
npm run build:prod

# 5. Préparation du package (voir build-prod.bat pour les détails)
```

## 📦 Résultat du Build

Après l'exécution du script, vous obtiendrez un dossier `dist` contenant :

```
dist/
├── .next/
│   ├── standalone/          # Serveur Next.js optimisé
│   └── static/              # Fichiers statiques
├── public/                  # Assets publics (images, icônes, etc.)
├── prisma/                  # Schema Prisma
├── package.json             # Dépendances
├── package-lock.json
├── next.config.js           # Configuration Next.js
├── start.bat                # Script de démarrage
├── env.example              # Exemple de configuration
├── INSTALLER-SERVEUR-WINDOWS.bat
└── README-DEPLOIEMENT.txt   # Instructions de déploiement
```

## ✅ Vérification du Build

Avant de déployer, vérifiez que le build est complet :

```batch
verifier-build.bat
```

Ce script vérifie :
- ✅ Présence du build standalone
- ✅ Présence des fichiers statiques
- ✅ Présence du dossier public
- ✅ Présence du schema Prisma
- ✅ Présence des fichiers de configuration
- ✅ Présence du script de démarrage

## 📋 Prérequis pour le Build

- **Node.js** : Version 18 ou supérieure
- **npm** : Inclus avec Node.js
- **Prisma** : Installé via npm
- **Base de données** : Accessible (pour la génération Prisma)

## 🔧 Configuration Requise

### Variables d'Environnement

Le fichier `.env.local` n'est **PAS** copié dans le build pour des raisons de sécurité. Vous devrez créer ce fichier sur la machine de production avec au minimum :

```env
DATABASE_URL="mysql://username:password@host:port/database"
JWT_SECRET="votre_cle_secrete_jwt"
NEXTAUTH_SECRET="votre_cle_secrete_nextauth"
PORT=3001
NODE_ENV=production
```

## 📤 Déploiement

Une fois le build créé :

1. **Copier le dossier `dist`** sur la machine de production
2. **Installer Node.js 18+** sur la machine cible
3. **Créer le fichier `.env.local`** avec vos configurations
4. **Installer les dépendances** : `npm install --production --no-optional`
5. **Générer Prisma** : `npx prisma generate`
6. **Démarrer l'application** : `start.bat`

Pour plus de détails, consultez `GUIDE-DEPLOIEMENT-WINDOWS.md`

## 🐛 Dépannage

### Erreur : "Node.js n'est pas installé"
- Installez Node.js 18+ depuis [nodejs.org](https://nodejs.org/)
- Vérifiez que Node.js est dans le PATH

### Erreur : "Echec de l'installation des dépendances"
- Vérifiez votre connexion Internet
- Essayez : `npm cache clean --force`
- Réessayez : `npm ci --no-optional --legacy-peer-deps`

### Erreur : "Echec de la génération Prisma"
- Vérifiez que la base de données est accessible
- Vérifiez votre `DATABASE_URL` dans `.env.local`
- Essayez : `npx prisma generate --schema=./prisma/schema.prisma`

### Erreur : "Le build standalone n'a pas été créé"
- Vérifiez `next.config.js` : `output: 'standalone'` doit être présent
- Vérifiez les logs de build pour plus de détails
- Essayez un build manuel : `npm run build`

### Le package est trop volumineux
- C'est normal, le build standalone inclut toutes les dépendances
- La taille typique est de 100-200 MB
- Vous pouvez exclure `node_modules` si vous installez les dépendances sur la machine cible

## 📊 Taille Typique du Package

- **Build standalone** : ~50-100 MB
- **Fichiers statiques** : ~10-20 MB
- **Public** : ~5-10 MB
- **Total** : ~100-200 MB (selon les dépendances)

## 🔄 Mise à Jour

Pour mettre à jour l'application en production :

1. Arrêter l'application
2. Sauvegarder `.env.local`
3. Copier les nouveaux fichiers depuis `dist`
4. Exécuter : `npm install --production`
5. Exécuter : `npx prisma generate`
6. Redémarrer l'application

## 📝 Notes Importantes

- ⚠️ Le fichier `.env.local` n'est **jamais** copié dans le build (sécurité)
- ⚠️ Les `node_modules` ne sont pas inclus (installés sur la machine cible)
- ⚠️ Le build est optimisé pour Windows Server
- ✅ Le build utilise le mode `standalone` de Next.js pour un déploiement autonome

## 🆘 Support

En cas de problème :
1. Vérifiez les logs du build
2. Exécutez `verifier-build.bat` pour diagnostiquer
3. Consultez `GUIDE-DEPLOIEMENT-WINDOWS.md` pour plus d'informations
4. Vérifiez que tous les prérequis sont installés

---

**Date de création** : 2024
**Version** : 1.0
**Port de production** : 3001

