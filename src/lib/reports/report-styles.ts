// Styles Tailwind réutilisables pour le rendu web + impression

export const reportClasses = {
  shell: 'bg-white text-gray-900',
  header: 'border-b border-green-600 pb-3 mb-4',
  headerRow: 'flex items-center gap-4 justify-between',
  headerLeft: 'flex items-center gap-3',
  headerTitle: 'text-xl font-semibold',
  headerSubtitle: 'text-sm text-gray-600',
  metaGrid: 'mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-700',
  content: 'space-y-6',
  section: 'space-y-2',
  sectionTitle: 'text-base font-semibold text-gray-900',
  tableWrap: 'overflow-x-auto rounded-md border border-gray-200',
  table: 'min-w-full border-collapse text-sm',
  th: 'border-b bg-gray-50 px-3 py-2 text-left font-medium text-gray-700',
  td: 'border-b px-3 py-2 align-top',
  footer:
    'border-t border-green-600 pt-3 mt-6 text-xs text-gray-600 flex items-center justify-between',
  actionsBar: 'flex items-center gap-2 justify-end mt-4 print:hidden',
  printOnly: 'hidden print:block',
  screenOnly: 'block print:hidden',
  pagePadding: 'p-4 md:p-6 lg:p-8',
};
