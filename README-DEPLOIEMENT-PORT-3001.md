# Déploiement Production - Port 3001

## 🚀 Démarrage Rapide

### Sur la machine de développement

1. **Build de production**
   ```batch
   build-prod.bat
   ```

2. **Copier le dossier `dist`** sur le serveur Windows

### Sur le serveur Windows

1. **Copier tout le contenu** du dossier `dist` dans `C:\fonaredd-app` (ou votre dossier)

2. **Configurer `.env.local`** avec votre `DATABASE_URL` et autres paramètres

3. **Installer l'application**
   ```batch
   INSTALLER-SERVEUR-WINDOWS.bat
   ```

4. **Démarrer l'application**
   ```batch
   start.bat
   ```
   ou
   ```batch
   start-prod.bat
   ```

5. **Accéder à l'application**
   - URL : `http://localhost:3001`

---

## 📋 Configuration .env.local

Le fichier `.env.local` doit contenir au minimum :

```env
DATABASE_URL="mysql://username:password@host:3306/database_name"
JWT_SECRET="votre_cle_secrete_jwt"
NEXTAUTH_SECRET="votre_cle_secrete_nextauth"
NODE_ENV="production"
PORT=3001
```

**⚠️ Important** : Utilisez la même `DATABASE_URL` que votre configuration actuelle.

---

## 📁 Structure après copie sur le serveur

```
C:\fonaredd-app\
├── .next\
│   ├── standalone\
│   │   └── server.js
│   └── static\
├── public\
├── prisma\
│   └── schema.prisma
├── package.json
├── package-lock.json
├── next.config.js
├── .env.local          (à configurer)
├── start.bat           (démarrage simple)
├── start-prod.bat      (démarrage avec vérifications)
└── INSTALLER-SERVEUR-WINDOWS.bat
```

---

## 🔧 Commandes Utiles

### Vérifier si le port 3001 est utilisé
```batch
netstat -ano | findstr :3001
```

### Arrêter un processus sur le port 3001
```batch
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Démarrer l'application
```batch
start.bat
```

### Démarrer avec npm
```batch
npm start
```

### Générer Prisma (si nécessaire)
```batch
npx prisma generate
```

---

## 📖 Documentation Complète

Pour plus de détails, consultez : **GUIDE-DEPLOIEMENT-WINDOWS.md**

---

**Port de production** : 3001
**Mode** : Production
**Node.js requis** : 18+



