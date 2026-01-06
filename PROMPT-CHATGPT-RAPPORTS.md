# PROMPT POUR CHATGPT - Système de Rapports

**Copie ce prompt complet et colle-le dans ChatGPT pour obtenir l'implémentation complète du système de rapports.**

---

## CONTEXTE DU PROJET

Je travaille sur une application **Next.js 14 + React 18 + TypeScript** nommée "Fonaredd App" (application de gestion avec Electron + PWA).

**Stack technique:**

- Next.js 14.0.4
- React 18.2.0
- TypeScript 5.3.3
- TailwindCSS 3.3.6
- @react-pdf/renderer 4.3.1
- @headlessui/react 1.7.17
- Prisma 5.7.1 + MySQL2

## OBJECTIF

Créer un **système de rapports professionnel** avec les caractéristiques suivantes:

1. **En-tête avec logo** : Logo depuis `/public/logo.png` (FOND NATIONAL REDD)
2. **Bas de page** : Pagination, date de génération, informations de pied
3. **Design parfait** : Professionnel, moderne, utilisant la palette verte (#10b981)
4. **Affichage dans un modal** : Utiliser le composant Dialog existant, **SANS ouvrir d'onglet navigateur**
5. **Actions** : Visualiser, Imprimer, Télécharger PDF

## STRUCTURE DU PROJET EXISTANTE

```
fonareddapp/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Dialog.tsx          # Composant modal existant à utiliser
│   │   │   ├── Button.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── lib/
│   │   ├── pdf.ts                  # Utilitaires PDF existants
│   │   ├── utils.ts                # Fonction cn() pour classes Tailwind
│   │   └── fetcher.ts              # apiGet, apiPost, etc.
│   ├── pages/
│   │   └── ...
│   └── hooks/
│       └── useToast.tsx            # showSuccess, showError
├── public/
│   └── logo.png                    # Logo à utiliser dans l'en-tête
└── package.json
```

## COMPOSANTS EXISTANTS À UTILISER

### 1. Dialog Component (`src/components/ui/Dialog.tsx`)

Composant modal avec:

- Overlay avec fermeture au clic
- Fermeture ESC
- Tailles: sm, md, lg, xl
- Props: `isOpen`, `onClose`, `title`, `size`, `children`

**Exemple:**

```tsx
import Dialog from '@/components/ui/Dialog';

<Dialog isOpen={show} onClose={() => setShow(false)} title="Rapport" size="xl">
  {/* Contenu */}
</Dialog>;
```

### 2. PDF Utilities (`src/lib/pdf.ts`)

Fonctions disponibles:

- `pdfStyles` - Styles StyleSheet pour @react-pdf/renderer
- `generatePDFBlob(doc: ReactElement): Promise<Blob>`
- `downloadPDF(blob: Blob, filename: string): void`
- `formatDatePDF(date): string`

### 3. Utilitaires

```tsx
import { cn } from '@/lib/utils'; // Fusion classes Tailwind
import { apiGet } from '@/lib/fetcher'; // Appels API
import { useToast } from '@/hooks/useToast'; // Notifications
```

## DESIGN SYSTEM

**Couleurs:**

- Vert principal: `#10b981` (green-600)
- Vert foncé: `#059669` (green-700)
- Texte: `#1f2937` (gray-900)
- Fond: `#ffffff` (white)

**Espacements:**

- Padding: 40px (PDF), 16px (web)
- Marges: Multiples de 8px

## STRUCTURE DE FICHIERS À CRÉER

```
src/
├── components/
│   └── reports/
│       ├── ReportModal.tsx         # Composant principal qui encapsule Dialog
│       ├── ReportHeader.tsx        # En-tête avec logo + titre
│       ├── ReportFooter.tsx        # Bas de page avec pagination
│       ├── ReportContent.tsx       # Corps du rapport (scrollable)
│       └── ReportViewer.tsx        # Orchestrateur principal
│
├── lib/
│   └── reports/
│       ├── report-generator.ts     # Génération HTML/PDF
│       ├── report-styles.ts        # Styles CSS pour rapports web
│       └── report-utils.ts         # Utilitaires (formats, etc.)
│
└── types/
    └── report.ts                   # Types TypeScript
```

## SPÉCIFICATIONS TECHNIQUES

### ReportModal.tsx

- Encapsule le Dialog existant
- Gère les états: isOpen, reportData
- Boutons: Visualiser, Imprimer, Télécharger PDF, Fermer
- Taille: `xl` (max-w-6xl)
- Scroll interne si contenu long

### ReportHeader.tsx

- Logo depuis `/public/logo.png` (Image Next.js)
- Dimensions: 200x80px dans le rapport
- Titre du rapport
- Informations contextuelles (date, utilisateur, ID)
- Bordure décorative verte en bas

### ReportContent.tsx

- Contenu dynamique basé sur le type de rapport
- Tables formatées
- Sections avec titres
- Scrollable si nécessaire
- Responsive

### ReportFooter.tsx

- Date de génération
- Pagination (Page X/Y)
- Informations additionnelles
- Bordure décorative verte en haut

### Génération PDF

- Utiliser @react-pdf/renderer
- Même structure: Header + Content + Footer
- Logo en base64 ou URL
- Styles cohérents avec la version web

### Génération HTML

- HTML propre et stylisé avec TailwindCSS
- Compatible avec window.print()
- Même structure que la version modal

## EXEMPLE D'UTILISATION ATTENDUE

```tsx
import ReportModal from '@/components/reports/ReportModal';

const MyComponent = () => {
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState(null);

  const handleGenerateReport = async (id: number) => {
    const data = await apiGet(`/api/reports/${id}`);
    setReportData(data);
    setShowReport(true);
  };

  return (
    <>
      <button onClick={() => handleGenerateReport(123)}>Générer rapport</button>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        reportData={reportData}
        reportType="conge"
        title="Rapport de congé"
      />
    </>
  );
};
```

## INTERFACE DES TYPES

```typescript
interface ReportData {
  id: number;
  type: 'conge' | 'admin' | 'statistique';
  title: string;
  header: {
    logo?: string;
    title: string;
    subtitle?: string;
    metadata?: Record<string, any>;
  };
  content: {
    sections: ReportSection[];
    tables?: ReportTable[];
  };
  footer: {
    date: string;
    page?: number;
    totalPages?: number;
    additionalInfo?: string;
  };
}

interface ReportSection {
  title: string;
  content: string | React.ReactNode;
  data?: Record<string, any>;
}

interface ReportTable {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
}
```

## PATTERNS À SUIVRE

1. **Nommage**: PascalCase pour composants, camelCase pour fonctions
2. **Styles**: Utiliser TailwindCSS + `cn()` pour fusion
3. **Gestion erreurs**: try/catch avec `showError()`
4. **Loading**: États de chargement pendant génération
5. **Responsive**: Mobile-first, adaptatif
6. **Accessibilité**: ARIA labels, focus management

## FONCTIONNALITÉS REQUISES

### 1. Visualisation

- Afficher dans le modal Dialog
- Scroll interne si nécessaire
- Pas d'ouverture d'onglet

### 2. Impression

- Bouton "Imprimer" → `window.print()`
- Styles optimisés pour impression
- Masquer les boutons lors de l'impression (@media print)

### 3. Téléchargement PDF

- Bouton "Télécharger PDF"
- Générer avec @react-pdf/renderer
- Télécharger automatiquement
- Nom de fichier: `rapport-{type}-{id}-{date}.pdf`

### 4. Export HTML

- Optionnel: Export HTML formaté
- Télécharger comme fichier .html

## DESIGN ATTENDU

```
┌─────────────────────────────────────────────┐
│ [X] Fermer                                   │
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐   │
│  │ [LOGO]    RAPPORT DE CONGÉ           │   │
│  │           Demande #123               │   │
│  │           Date: 15/01/2024           │   │
│  └─────────────────────────────────────┘   │
│  ─────────────────────────────────────────  │
│                                              │
│  ┌─────────────────────────────────────┐   │
│  │ CONTENU DU RAPPORT                   │   │
│  │ (avec scroll vertical si nécessaire) │   │
│  │                                       │   │
│  │ • Sections avec titres               │   │
│  │ • Tables formatées                   │   │
│  │ • Données dynamiques                 │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  ─────────────────────────────────────────  │
│  ┌─────────────────────────────────────┐   │
│  │ Date: 15/01/2024 - Page 1/1         │   │
│  └─────────────────────────────────────┘   │
│                                              │
│  [Imprimer] [Télécharger PDF] [Fermer]      │
└─────────────────────────────────────────────┘
```

## CHECKLIST DE CRÉATION

- [ ] Créer tous les types TypeScript dans `types/report.ts`
- [ ] Créer `ReportHeader.tsx` avec logo et design
- [ ] Créer `ReportFooter.tsx` avec pagination
- [ ] Créer `ReportContent.tsx` avec sections et tables
- [ ] Créer `ReportViewer.tsx` orchestrateur
- [ ] Créer `ReportModal.tsx` avec Dialog + actions
- [ ] Créer `report-generator.ts` pour génération HTML/PDF
- [ ] Créer `report-styles.ts` avec styles CSS
- [ ] Créer `report-utils.ts` avec fonctions utilitaires
- [ ] Implémenter la génération PDF avec @react-pdf/renderer
- [ ] Implémenter l'impression native
- [ ] Tester la responsivité
- [ ] Ajouter les états de chargement
- [ ] Gérer les erreurs

## CONTRAINTES IMPORTANTES

1. **NE PAS utiliser `window.open()`** - Tout doit être dans le modal
2. **Utiliser le Dialog existant** - Pas créer un nouveau modal
3. **Logo depuis `/public/logo.png`** - Utiliser Next.js Image ou base64
4. **Couleurs vertes** - Respecter la palette existante
5. **TailwindCSS uniquement** - Pas de CSS inline ou fichiers séparés
6. **TypeScript strict** - Tous les types définis
7. **Performance** - Lazy loading si nécessaire

## RÉSULTAT ATTENDU

Fournir le code complet, prêt à utiliser, avec:

- Tous les fichiers listés ci-dessus
- Types TypeScript complets
- Styles TailwindCSS intégrés
- Gestion d'erreurs
- États de chargement
- Documentation dans les commentaires
- Exemple d'utilisation

**Format de réponse:**
Pour chaque fichier, fournir:

```tsx
// Chemin: src/components/reports/ReportModal.tsx

[Code complet ici]
```

---

**Merci de créer ce système de rapports complet et professionnel en respectant toutes les spécifications ci-dessus.**
