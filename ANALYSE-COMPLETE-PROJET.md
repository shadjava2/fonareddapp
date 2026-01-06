# ANALYSE COMPLÈTE DU PROJET FONAREDD APP

## 📋 INFORMATIONS GÉNÉRALES

**Nom du projet:** fonaredd-app
**Version:** 1.0.0
**Type:** Application hybride Next.js + Electron + PWA
**Base de données:** MySQL avec Prisma ORM
**Langage principal:** TypeScript
**Framework Frontend:** Next.js 14.0.4
**Framework Desktop:** Electron 27.1.3

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Technologique

**Frontend:**

- Next.js 14.0.4 (React 18.2.0)
- TypeScript 5.3.3
- TailwindCSS 3.3.6
- Heroicons 2.0.18
- Axios 1.6.2

**Backend:**

- Next.js API Routes
- Prisma 5.7.1 (ORM)
- MySQL 3.6.5 (via mysql2)
- JWT (jsonwebtoken 9.0.2)
- bcryptjs 2.4.3

**Desktop:**

- Electron 27.1.3
- Electron Builder 24.8.1

**Intégrations Externes:**

- Hikvision API (lecteur d'empreinte)
- Digest Authentication (digest-fetch 3.1.1)
- XML parsing (xml2js 0.6.2)

**Outils de développement:**

- ESLint 8.56.0
- Prettier 3.1.1
- Concurrently 8.2.2 (dev parallèle)
- Wait-on 7.2.0

---

## 📁 STRUCTURE DES DOSSIERS

```
fonareddapp/
├── .next/                          # Build Next.js (ignoré)
├── out/                            # Build exporté (ignoré)
├── dist-electron/                  # Build Electron (ignoré)
├── node_modules/                   # Dépendances npm
├── src/                           # Code source principal
│   ├── components/               # Composants React réutilisables
│   │   ├── auth/                 # Authentification
│   │   │   ├── ForcePasswordModal.tsx
│   │   │   ├── ProfileModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── forms/                # Formulaires CRUD
│   │   │   ├── CalendrierForm.tsx
│   │   │   ├── ConfigCongeForm.tsx
│   │   │   ├── CrudForm.tsx
│   │   │   ├── DroitsServicesForm.tsx
│   │   │   ├── RoleForm.tsx
│   │   │   ├── RolePermissionsForm.tsx
│   │   │   ├── RolesPermissionsForm.tsx
│   │   │   ├── ServiceForm.tsx
│   │   │   ├── SimpleForm.tsx
│   │   │   ├── SiteForm.tsx
│   │   │   ├── TypeCongeForm.tsx
│   │   │   └── UserForm.tsx
│   │   ├── layout/               # Layouts et navigation
│   │   │   ├── AdminLayout.tsx
│   │   │   ├── AdminSidebar.tsx
│   │   │   ├── AppShell.tsx
│   │   │   ├── AppSidebar.tsx
│   │   │   ├── CongeAppShell.tsx
│   │   │   ├── CongeSidebar.tsx
│   │   │   ├── ModuleGrid.tsx
│   │   │   ├── ModuleSidebar.tsx
│   │   │   ├── PersonnelLayout.tsx
│   │   │   └── PersonnelSidebar.tsx
│   │   └── ui/                   # Composants UI de base
│   │       ├── AutocompleteSelect.tsx
│   │       ├── Badge.tsx
│   │       ├── Button.tsx
│   │       ├── ConfirmDialog.tsx
│   │       ├── Dialog.tsx
│   │       ├── Input.tsx
│   │       ├── Pagination.tsx
│   │       ├── SearchBar.tsx
│   │       ├── Select.tsx
│   │       ├── Table.tsx
│   │       ├── Toast.tsx
│   │       └── ToastContainer.tsx
│   ├── hooks/                    # Hooks React personnalisés
│   │   ├── useAuth.tsx          # Gestion authentification
│   │   ├── useAutocomplete.ts
│   │   ├── useCrud.ts
│   │   └── useToast.tsx
│   ├── lib/                     # Utilitaires et services
│   │   ├── auth.ts              # Authentification JWT
│   │   ├── calendrier.ts
│   │   ├── fetcher.ts           # Client HTTP Axios
│   │   ├── hikvision-digest.ts  # Intégration Hikvision (DIGEST)
│   │   ├── hikvision.ts         # Intégration Hikvision (ancienne)
│   │   ├── notify.ts
│   │   ├── pagination.ts        # Utilitaires pagination
│   │   ├── prisma.ts            # Client Prisma
│   │   ├── rbac.ts              # Role-Based Access Control
│   │   └── utils.ts
│   ├── middleware/              # Middleware Next.js (vide)
│   ├── modules/                 # Modules métier (legacy)
│   │   ├── administration/
│   │   └── personnel/
│   ├── pages/                   # Pages Next.js (routing)
│   │   ├── _app.tsx            # App wrapper
│   │   ├── index.tsx           # Page d'accueil
│   │   ├── login.tsx           # Connexion
│   │   ├── home.tsx            # Dashboard principal
│   │   ├── debug-api.tsx
│   │   ├── admin/              # Module Administration
│   │   │   ├── index.tsx
│   │   │   ├── data-overview.tsx
│   │   │   ├── utilisateurs.tsx
│   │   │   ├── roles/
│   │   │   ├── services/
│   │   │   ├── sites/
│   │   │   ├── droits-services/
│   │   │   ├── roles-permissions/
│   │   │   ├── users/
│   │   │   └── personnel/
│   │   ├── conge/              # Module Congés
│   │   │   ├── index.tsx
│   │   │   ├── calendrier/
│   │   │   ├── config-conge/
│   │   │   ├── demandes-conge/
│   │   │   ├── traitement-demandes/
│   │   │   └── types-conges/
│   │   ├── personnel/          # Module Personnel
│   │   │   ├── index.tsx
│   │   │   ├── events/
│   │   │   ├── users/
│   │   │   ├── monitoring/
│   │   │   ├── config/
│   │   │   └── debug/
│   │   └── api/                # API Routes Next.js
│   │       ├── admin/          # APIs Administration
│   │       │   ├── dashboard.ts
│   │       │   ├── roles/
│   │       │   ├── services/
│   │       │   ├── sites/
│   │       │   ├── users/
│   │       │   ├── droits-services/
│   │       │   ├── roles-permissions/
│   │       │   └── permissions/
│   │       ├── auth/           # APIs Authentification
│   │       │   ├── login.ts
│   │       │   ├── logout.ts
│   │       │   ├── me.ts
│   │       │   ├── change-password.ts
│   │       │   ├── update-profile.ts
│   │       │   └── reset-init.ts
│   │       ├── conge/          # APIs Congés
│   │       │   ├── calendrier.ts
│   │       │   ├── config.ts
│   │       │   ├── demande.ts
│   │       │   └── compute-period.ts
│   │       ├── hikvision/      # APIs Hikvision
│   │       │   ├── config.ts
│   │       │   ├── sync.ts
│   │       │   ├── events.ts
│   │       │   ├── events-digest.ts
│   │       │   ├── events-real.ts
│   │       │   ├── events-web.ts
│   │       │   ├── users.ts
│   │       │   ├── users-digest.ts
│   │       │   ├── debug.ts
│   │       │   ├── test-endpoints.ts
│   │       │   └── ingest.ts
│   │       ├── rbac/           # APIs RBAC (legacy)
│   │       │   ├── roles.ts
│   │       │   ├── permissions.ts
│   │       │   ├── roles-permissions.ts
│   │       │   ├── services.ts
│   │       │   ├── sites.ts
│   │       │   ├── utilisateurs.ts
│   │       │   └── droits-services.ts
│   │       ├── notifications/
│   │       └── test/
│   ├── styles/
│   │   └── globals.css         # Styles globaux
│   └── ui/                     # Composants UI (legacy)
│       └── sidebar/
├── electron/                    # Code Electron
│   ├── main.ts                 # Processus principal
│   ├── preload.ts              # Bridge sécurité
│   ├── utils.ts
│   └── tsconfig.json
├── prisma/
│   └── schema.prisma           # Schéma base de données
├── public/                     # Assets statiques
│   ├── icons/                  # Icônes PWA
│   └── logo-fonaredd.svg
├── docker/                     # Configuration Docker
│   ├── build.ps1
│   ├── build.sh
│   ├── run.ps1
│   ├── run.sh
│   ├── entrypoint.sh
│   ├── mysql/
│   │   └── init/
│   │       └── 01-init.sql
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
├── scripts/
│   └── generate-icons.js
├── .gitignore
├── .env.local                  # Variables d'environnement (local)
├── env.example                 # Template variables d'environnement
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.js
├── postcss.config.js
├── electron-builder.yml
├── Dockerfile
├── Dockerfile.dev
├── Dockerfile.electron
├── docker-compose.yml
├── docker-compose.override.yml
├── README.md
└── [Multiples fichiers .bat et .md de déploiement]
```

---

## 🗄️ BASE DE DONNÉES (Prisma Schema)

**Provider:** MySQL
**ORM:** Prisma 5.7.1

### Modèles Principaux

1. **utilisateurs** - Gestion des utilisateurs
   - Relations: roles, droits_services
   - Champs: id, nom, prenom, username, mot_de_passe, mail, phone, locked, fkRole

2. **roles** - Rôles utilisateurs
   - Relations: utilisateurs, roles_permissions

3. **permissions** - Permissions système
   - Relations: roles_permissions

4. **services** - Services métier
   - Relations: droits_services, sites

5. **sites** - Sites/Emplacements
   - Relations: services

6. **droits_services** - Droits d'accès aux services
   - Relations: utilisateurs, services

7. **roles_permissions** - Permissions par rôle
   - Relations: roles, permissions

8. **calendrier** - Calendrier des jours ouvrables/fériés
   - Champs: id, d (date), label, datecreate, dateupdate

9. **congeconfig** - Configuration congés
   - Champs: id, nbjourMois

10. **typeconges** - Types de congés
    - Champs: id, nom, description, nbjour

11. **demandeconges** - Demandes de congés
    - Relations: utilisateurs, typeconges

12. **acs_events** - Événements Hikvision
    - Champs: device_ip, event_index, event_time, event_type, etc.

13. **acs_users** - Utilisateurs Hikvision
    - Champs: device_ip, employee_no, name, department

14. **acs_cards** - Cartes Hikvision
    - Relations: acs_users

---

## 🔌 API ENDPOINTS

### Authentification (`/api/auth/`)

- `POST /api/auth/login` - Connexion
- `POST /api/auth/logout` - Déconnexion
- `GET /api/auth/me` - Profil utilisateur
- `POST /api/auth/change-password` - Changer mot de passe
- `POST /api/auth/update-profile` - Mettre à jour profil
- `POST /api/auth/reset-init` - Reset mot de passe initial

### Administration (`/api/admin/`)

- `GET /api/admin/dashboard` - Statistiques dashboard
- CRUD Roles: `/api/admin/roles`
- CRUD Services: `/api/admin/services`
- CRUD Sites: `/api/admin/sites`
- CRUD Utilisateurs: `/api/admin/users`
- CRUD Droits Services: `/api/admin/droits-services`
- CRUD Roles Permissions: `/api/admin/roles-permissions`

### Congés (`/api/conge/`)

- `GET/POST/PUT/DELETE /api/conge/calendrier` - Gestion calendrier
- `GET /api/conge/config` - Configuration congés
- `POST /api/conge/demande` - Créer demande congé
- `GET /api/conge/compute-period` - Calculer période

### Hikvision (`/api/hikvision/`)

- `GET/POST /api/hikvision/config` - Configuration lecteur
- `GET/POST /api/hikvision/sync` - Synchronisation
- `GET /api/hikvision/events` - Événements
- `GET /api/hikvision/events-digest` - Événements (DIGEST)
- `GET /api/hikvision/users` - Utilisateurs ACS
- `GET /api/hikvision/users-digest` - Utilisateurs (DIGEST)
- `GET /api/hikvision/debug` - Diagnostic
- `GET /api/hikvision/test-endpoints` - Test endpoints

### RBAC Legacy (`/api/rbac/`)

- Routes similaires à `/api/admin/` (version legacy)

---

## 🔐 SYSTÈME D'AUTHENTIFICATION

**Méthode:** JWT (JSON Web Tokens)
**Stockage:** Cookies HTTP-only
**Bibliothèque:** jsonwebtoken 9.0.2

### Fonctionnalités

- Login/Logout
- Gestion de session
- Protection de routes
- RBAC (Role-Based Access Control)
- **ACTUELLEMENT DÉSACTIVÉ EN MODE DEV** (utilisateur fictif statique)

### Fichiers clés

- `src/lib/auth.ts` - Logique authentification
- `src/lib/rbac.ts` - Contrôle d'accès
- `src/hooks/useAuth.tsx` - Hook React auth
- `src/components/auth/ProtectedRoute.tsx` - Protection routes

---

## 🎨 SYSTÈME DE DESIGN

**Framework CSS:** TailwindCSS 3.3.6
**Composants:** Headless UI 1.7.17
**Icônes:** Heroicons 2.0.18

### Configuration Tailwind

- Mode sombre: `darkMode: 'class'`
- Couleur primaire: Emerald (vert)
- Animations: fade-in, slide-in
- Base: `src/pages/**/*`, `src/components/**/*`

### Composants UI réutilisables

- Button, Input, Select, Dialog
- Toast, ToastContainer
- Pagination, SearchBar
- Table, Badge
- ConfirmDialog

---

## 🖥️ MODE DESKTOP (Electron)

**Version Electron:** 27.1.3
**Builder:** Electron Builder 24.8.1

### Structure Electron

- `electron/main.ts` - Processus principal
- `electron/preload.ts` - Bridge de sécurité
- `electron-builder.yml` - Configuration build

### Scripts disponibles

- `npm run dev:electron` - Dev avec Electron
- `npm run dist` - Build production
- `npm run dist:dir` - Build répertoire

### Configuration Build

- App ID: `com.fonaredd.app`
- Produit: "Fonaredd App"
- Windows: NSIS installer
- Mac: .app bundle
- Linux: AppImage

---

## 🐳 DOCKER & DÉPLOIEMENT

### Fichiers Docker

- `Dockerfile` - Production
- `Dockerfile.dev` - Développement
- `Dockerfile.electron` - Build Electron
- `docker-compose.yml` - Services (Next.js + MySQL + Nginx)
- `docker-compose.override.yml` - Override local

### Services Docker

- **Next.js App** - Application principale
- **MySQL** - Base de données
- **Nginx** - Reverse proxy

### Scripts de déploiement

- `deploy.bat` / `deploy.ps1` - Déploiement Windows
- `docker/build.ps1` / `docker/build.sh` - Build Docker
- `docker/run.ps1` / `docker/run.sh` - Run Docker

---

## 📦 GESTION DES DÉPENDANCES

### Production Dependencies (24)

- React ecosystem (react, react-dom, next)
- Prisma & MySQL (prisma, @prisma/client, mysql2)
- UI (tailwindcss, @headlessui/react, @heroicons/react)
- Auth (jsonwebtoken, bcryptjs, cookie)
- HTTP (axios)
- Electron (electron)
- Intégrations (digest-fetch, xml2js)
- Utilitaires (date-fns, clsx, tailwind-merge, zod)

### Dev Dependencies (19)

- TypeScript & types
- Build tools (electron-builder, concurrently, cross-env)
- Linting (eslint, @typescript-eslint/\*)
- Formatting (prettier)
- CSS (postcss, autoprefixer)

---

## 🔧 CONFIGURATION FICHIERS

### `package.json`

- Scripts: dev, build, dist, prisma:\*, lint, format
- Build Electron configuré
- Homepage: `./` (pour Electron)

### `tsconfig.json`

- Target: ES5
- Module: ESNext
- JSX: preserve
- Path alias: `@/*` → `./src/*`
- Strict mode activé

### `next.config.js`

- PWA **DÉSACTIVÉE** (désactivée pour éviter conflits)
- Images unoptimized (pour Electron)
- ESLint & TypeScript errors ignorés en build (⚠️ À corriger)
- Headers cache-control pour API
- Output tracing pour Docker

### `tailwind.config.js`

- Content paths: pages, components, app
- Dark mode: class
- Custom colors: primary (emerald)
- Custom animations

---

## 🚨 PROBLÈMES IDENTIFIÉS À NETTOYER

### 1. Configuration Next.js

- ⚠️ ESLint ignoré en build (`eslint.ignoreDuringBuilds: true`)
- ⚠️ TypeScript errors ignorés (`typescript.ignoreBuildErrors: true`)
- ⚠️ **À CORRIGER EN PRIORITÉ**

### 2. Authentification

- 🔄 Mode dev avec utilisateur fictif (bypass complet auth)
- 🔄 RBAC désactivé temporairement
- ⚠️ **À réactiver pour production**

### 3. Middleware Next.js

- 📁 Dossier `src/middleware/` vide
- ⚠️ Ancien `src/middleware.ts` supprimé (redirections)

### 4. PWA

- ⚠️ PWA complètement désactivée
- 📁 `out/` contient encore des fichiers PWA générés
- ⚠️ **À nettoyer ou réactiver**

### 5. Fichiers Legacy/Doublons

- `src/modules/` - Modules legacy (duplication avec `src/pages/`)
- `src/pages/api/rbac/` - APIs legacy (doublons de `/api/admin/`)
- `src/ui/` - Composants UI legacy (doublons de `src/components/ui/`)

### 6. Fichiers de déploiement multiples

- ⚠️ Nombreux fichiers `.bat` et `.md` de déploiement
- ⚠️ **À consolider en un seul guide**

### 7. Types TypeScript

- ⚠️ Utilisation de `any` dans plusieurs fichiers
- ⚠️ Types manquants pour certaines API responses

### 8. Gestion d'erreurs

- ⚠️ Logs console partout (à remplacer par logger structuré)
- ⚠️ Gestion d'erreurs incohérente entre API routes

### 9. Prisma

- ⚠️ Client non régénéré après ajout modèle `calendrier`
- ⚠️ Besoin de `npx prisma generate` après chaque modification schema

### 10. Intégration Hikvision

- ⚠️ Deux implémentations (`hikvision.ts` et `hikvision-digest.ts`)
- ⚠️ Endpoints multiples pour même fonctionnalité (events, events-digest, etc.)
- ⚠️ **À consolider**

---

## 📝 SCRIPTS NPM DISPONIBLES

```bash
# Développement
npm run dev              # Dev Next.js uniquement
npm run dev:electron     # Dev Next.js + Electron

# Build
npm run build            # Build Next.js + export
npm run start            # Start production Next.js
npm run dist             # Build + Electron builder
npm run dist:dir         # Build Electron (répertoire seulement)

# Prisma
npm run prisma:pull      # Pull schema depuis DB
npm run prisma:gen       # Générer client Prisma
npm run prisma:studio    # Ouvrir Prisma Studio

# Qualité
npm run lint             # Linter ESLint
npm run lint:fix         # Linter + auto-fix
npm run format           # Formatter Prettier
npm run type-check       # Vérifier types TypeScript
```

---

## 🌐 VARIABLES D'ENVIRONNEMENT

**Fichier template:** `env.example`
**Fichier local:** `.env.local` (ignoré par git)

Variables attendues:

- `DATABASE_URL` - URL connexion MySQL
- `JWT_SECRET` - Secret JWT
- `NODE_ENV` - Environnement (development/production)

---

## 📊 STATISTIQUES PROJET

- **Total fichiers TypeScript/TSX:** ~150+
- **Composants React:** ~30+
- **API Routes:** ~40+
- **Modèles Prisma:** 14
- **Dépendances production:** 24
- **Dépendances dev:** 19

---

## 🎯 POINTS D'ATTENTION POUR NETTOYAGE

1. **Sécurité:**
   - Réactiver authentification pour production
   - Vérifier gestion secrets JWT
   - Nettoyer logs sensibles

2. **Performance:**
   - Optimiser imports (tree-shaking)
   - Lazy loading composants
   - Optimiser requêtes Prisma

3. **Maintenabilité:**
   - Supprimer code legacy/doublons
   - Uniformiser gestion d'erreurs
   - Standardiser types TypeScript
   - Documenter APIs

4. **Qualité:**
   - Réactiver ESLint/TypeScript checks
   - Ajouter tests unitaires
   - Ajouter tests E2E

5. **Architecture:**
   - Consolider intégration Hikvision
   - Nettoyer modules legacy
   - Standardiser structure dossiers

---

## 📚 DOCUMENTATION DISPONIBLE

- `README.md` - Documentation principale
- `DEPLOYMENT.md` - Guide déploiement
- `GUIDE-DEPLOIEMENT.md` - Guide déploiement (version)
- `GUIDE-DEPLOIEMENT-FINAL.md` - Guide final
- `DOCKER.md` - Documentation Docker
- `SOLUTION-BOUCLE-CORRIGEE.md` - Solutions bugs
- `SOLUTION-CONFLIT-PORT.md` - Solutions conflits

---

## 🔍 COMMANDES DE DIAGNOSTIC

```bash
# Vérifier configuration TypeScript
npm run type-check

# Vérifier code style
npm run lint

# Vérifier base de données
npx prisma studio

# Vérifier build
npm run build

# Nettoyer cache
rm -rf .next out dist-electron node_modules/.cache
```

---

**Date d'analyse:** $(date)
**Version du projet:** 1.0.0
**Statut:** En développement actif

---

## 📌 NOTES FINALES POUR CHATGPT

Ce projet nécessite un nettoyage approfondi pour:

1. Supprimer code legacy et doublons
2. Réactiver les vérifications de qualité (ESLint, TypeScript)
3. Consolider les intégrations (Hikvision)
4. Standardiser la gestion d'erreurs
5. Améliorer la documentation
6. Optimiser la structure des dossiers
7. Préparer pour la production

**Priorité:** Corriger les problèmes de build (ESLint/TypeScript ignorés) et réactiver l'authentification avant tout déploiement en production.
