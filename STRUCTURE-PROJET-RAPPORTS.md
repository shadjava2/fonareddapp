# Structure du Projet - Système de Rapports

## 📋 Vue d'ensemble du projet

**Nom du projet:** Fonaredd App
**Type:** Application de gestion avec Electron + Next.js PWA
**Stack technique:** Next.js 14, React 18, TypeScript, Prisma, TailwindCSS

## 🏗️ Architecture du projet

```
fonareddapp/
├── src/
│   ├── components/
│   │   ├── ui/              # Composants UI réutilisables
│   │   │   ├── Dialog.tsx   # Composant modal/dialog existant
│   │   │   ├── Button.tsx
│   │   │   └── ...
│   │   ├── forms/           # Formulaires
│   │   ├── layout/          # Layouts et sidebars
│   │   └── global/          # Composants globaux
│   ├── lib/
│   │   ├── pdf.ts           # Utilitaires PDF existants
│   │   ├── utils.ts         # Fonctions utilitaires
│   │   └── ...
│   ├── pages/
│   │   ├── api/             # API Routes Next.js
│   │   └── ...              # Pages React
│   └── hooks/               # React Hooks
├── public/
│   └── logo.png             # Logo de l'application (FOND NATIONAL REDD)
└── package.json
```

## 🛠️ Technologies et dépendances principales

### Frontend

- **Next.js 14.0.4** - Framework React avec SSR
- **React 18.2.0** - Bibliothèque UI
- **TypeScript 5.3.3** - Typage statique
- **TailwindCSS 3.3.6** - Framework CSS utilitaire
- **@react-pdf/renderer 4.3.1** - Génération de PDF
- **@headlessui/react 1.7.17** - Composants UI accessibles
- **@heroicons/react 2.0.18** - Icônes SVG

### Backend

- **Prisma 5.7.1** - ORM pour MySQL
- **MySQL2 3.6.5** - Driver MySQL
- **Next.js API Routes** - Endpoints backend

## 📦 Composants existants à utiliser

### 1. Dialog Component (`src/components/ui/Dialog.tsx`)

Composant modal existant avec les fonctionnalités suivantes:

- Overlay avec fermeture au clic
- Fermeture avec la touche ESC
- Tailles configurables (sm, md, lg, xl)
- Gestion du focus et du scroll

**Exemple d'utilisation:**

```tsx
import Dialog from '@/components/ui/Dialog';

<Dialog
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Mon rapport"
  size="xl"
>
  {/* Contenu du rapport */}
</Dialog>;
```

### 2. PDF Utilities (`src/lib/pdf.ts`)

Fonctions existantes pour la génération de PDF:

- `pdfStyles` - Styles prédéfinis pour les PDFs
- `generatePDFBlob()` - Génère un blob PDF
- `downloadPDF()` - Télécharge un PDF
- `formatDatePDF()` - Formate les dates

**Styles disponibles:**

- `page`, `header`, `footer`, `section`, `table`, etc.

### 3. Utilitaires (`src/lib/utils.ts`)

Fonction `cn()` pour fusionner les classes Tailwind:

```tsx
import { cn } from '@/lib/utils';

className={cn('base-class', condition && 'conditional-class')}
```

## 🎨 Design System

### Couleurs principales

- **Vert principal:** `#10b981` (green-600)
- **Vert foncé:** `#059669` (green-700)
- **Gris clair:** `#f3f4f6` (gray-100)
- **Texte:** `#1f2937` (gray-900)

### Typographie

- **Police:** Helvetica (PDF), System fonts (web)
- **Titres:** Bold, 16-24px
- **Corps:** Regular, 11-12px

### Espacements

- Padding standard: `40px` (PDF), `16px` (web)
- Marges: Multiples de 8px

## 📄 Système de rapports à créer

### Spécifications requises

1. **En-tête avec logo**
   - Logo depuis `/public/logo.png`
   - Titre du rapport
   - Informations de contexte (date, utilisateur, etc.)
   - Bordure décorative

2. **Corps du rapport**
   - Contenu dynamique basé sur le type de rapport
   - Tables formatées
   - Sections avec titres

3. **Bas de page**
   - Informations de pagination
   - Date de génération
   - Signature électronique (optionnel)

4. **Interface utilisateur**
   - Modal/Dialog élégant
   - Affichage dans un iframe ou div scrollable
   - Boutons d'action (Imprimer, Télécharger PDF, Fermer)
   - Pas d'ouverture d'onglet navigateur
   - Design responsive

### Structure de fichiers à créer

```
src/
├── components/
│   └── reports/
│       ├── ReportModal.tsx          # Composant modal pour afficher les rapports
│       ├── ReportHeader.tsx        # En-tête avec logo
│       ├── ReportFooter.tsx        # Bas de page
│       ├── ReportContent.tsx       # Corps du rapport
│       └── ReportViewer.tsx        # Composant principal qui orchestre tout
│
├── lib/
│   └── reports/
│       ├── report-generator.ts     # Générateur de rapports
│       ├── report-styles.ts        # Styles pour les rapports
│       └── report-utils.ts         # Utilitaires pour les rapports
│
└── types/
    └── report.ts                    # Types TypeScript pour les rapports
```

## 🔧 Patterns et conventions

### 1. Nommage des fichiers

- **Composants:** PascalCase (ex: `ReportModal.tsx`)
- **Utilitaires:** camelCase (ex: `report-generator.ts`)
- **Types:** camelCase (ex: `report.ts`)

### 2. Structure des composants React

```tsx
import React from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  // Props typées
}

const Component: React.FC<ComponentProps> = ({ ...props }) => {
  // Hooks
  // Logic
  // Render
  return <div className={cn('base-classes')}>{/* JSX */}</div>;
};

export default Component;
```

### 3. Gestion des erreurs

```tsx
try {
  // Code
} catch (error: any) {
  console.error('Erreur:', error);
  showError('Titre', error.message || 'Message par défaut');
}
```

### 4. Appels API

```tsx
import { apiGet, apiPost } from '@/lib/fetcher';

const response = await apiGet<ResponseType>('/api/endpoint');
```

### 5. Toasts/Notifications

```tsx
import { useToast } from '@/hooks/useToast';

const { showSuccess, showError } = useToast();
showSuccess('Titre', 'Message de succès');
showError('Titre', "Message d'erreur");
```

## 📝 Exemple de code existant

### Génération de rapport HTML (à remplacer)

Actuellement, les rapports utilisent `window.open()` pour ouvrir un nouvel onglet:

```tsx
// ANCIENNE APPROCHE (à ne PAS utiliser)
const printWindow = window.open('', '_blank');
printWindow.document.write(rapportHTML);
printWindow.print();
```

### Nouvelle approche souhaitée

Utiliser le composant `Dialog` existant avec un contenu scrollable:

```tsx
// NOUVELLE APPROCHE
const [showReport, setShowReport] = useState(false);
const [reportData, setReportData] = useState(null);

<Dialog
  isOpen={showReport}
  onClose={() => setShowReport(false)}
  title="Rapport de congé"
  size="xl"
>
  <ReportViewer data={reportData} />
</Dialog>;
```

## 🎯 Fonctionnalités spécifiques

### 1. Types de rapports supportés

- Rapports de congé (demande, traitement)
- Rapports administratifs
- Rapports statistiques

### 2. Actions disponibles

- **Visualiser:** Dans le modal
- **Imprimer:** Dialog d'impression du navigateur
- **Télécharger PDF:** Génération avec @react-pdf/renderer
- **Exporter HTML:** Export du HTML formaté

### 3. Responsive design

- Mobile: Modal plein écran
- Tablette: Modal adaptatif
- Desktop: Modal centré avec taille optimale

## 📐 Spécifications techniques

### Logo

- **Chemin:** `/public/logo.png`
- **Dimensions recommandées:** 200x80px (dans le rapport)
- **Format:** PNG avec fond transparent

### Modal/Dialog

- **Taille maximale:** `max-w-6xl` (xl) pour les rapports
- **Hauteur:** Avec scroll interne si nécessaire
- **Z-index:** 50 (selon Dialog.tsx existant)
- **Animation:** Transition douce (fade in/out)

### Styles du rapport

- Fond blanc (`bg-white`)
- Padding: `40px` pour l'en-tête/footer, `20px` pour le contenu
- Polices: System fonts pour le web, Helvetica pour PDF
- Couleurs: Palette verte existante

## 🚀 Points importants

1. **Pas d'ouverture d'onglet:** Tout doit s'afficher dans le modal
2. **Performance:** Lazy loading des composants de rapport si nécessaire
3. **Accessibilité:** Respect des standards ARIA
4. **Internationalisation:** Support du français (dates, formats)
5. **Gestion d'état:** Utiliser les hooks React existants

## 📚 Références de code

### Exemple d'utilisation du Dialog

Fichier: `src/components/ui/Dialog.tsx`

### Exemple de génération PDF

Fichier: `src/lib/pdf.ts`

### Exemple de styles PDF

Fichier: `src/lib/pdf.ts` (objet `pdfStyles`)

### Exemple de rapport HTML

Fichier: `src/pages/conge/demandes-conge/index.tsx` (fonction `handleImprimer`)

## ✅ Checklist pour l'implémentation

- [ ] Créer le composant `ReportModal` basé sur `Dialog`
- [ ] Créer `ReportHeader` avec logo depuis `/public/logo.png`
- [ ] Créer `ReportFooter` avec pagination et date
- [ ] Créer `ReportContent` pour le corps dynamique
- [ ] Créer `ReportViewer` qui orchestre les composants
- [ ] Créer les utilitaires de génération
- [ ] Créer les types TypeScript
- [ ] Implémenter la génération PDF avec @react-pdf/renderer
- [ ] Implémenter l'impression native
- [ ] Tester la responsivité
- [ ] Tester l'accessibilité
- [ ] Documenter les composants

## 🎨 Exemple de design attendu

```
┌─────────────────────────────────────────┐
│ [X]                                     │
│  ┌───────────────────────────────────┐ │
│  │ [LOGO]  RAPPORT DE CONGÉ          │ │
│  │         Demande #123              │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  CONTENU DU RAPPORT              │ │
│  │  (avec scroll si nécessaire)     │ │
│  │                                   │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Date: 2024-01-15                 │ │
│  │  Page 1/1                         │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Imprimer] [Télécharger PDF] [Fermer] │
└─────────────────────────────────────────┘
```

---

**Note:** Ce document doit être utilisé comme référence complète pour créer un système de rapports intégré, professionnel et utilisant les composants et patterns existants du projet.
