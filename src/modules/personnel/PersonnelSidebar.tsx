'use client';
import Link from 'next/link';
import { useRouter } from 'next/router';

const items = [
  { href: '/home', label: 'Retour Accueil', icon: '⬅️' },
  { href: '/personnel/calendrier', label: 'Calendrier Fonaredd', icon: '📆' },
  { href: '/personnel/conge-config', label: 'Congé Config', icon: '⚙️' },
  { href: '/personnel/demande-conge', label: 'Demande Congé', icon: '📝' },
  { href: '/personnel/conge-phase', label: 'Congé Phase', icon: '🪜' },
  { href: '/personnel/conge-solde', label: 'Congé Solde', icon: '💼' },
  {
    href: '/personnel/conge-traitement',
    label: 'Congé Traitement',
    icon: '🔄',
  },
  { href: '/personnel/type-conge', label: 'Type Congé', icon: '🏷️' },
  {
    href: '/personnel/hikvision-ingest',
    label: 'Hikvision – Ingestion',
    icon: '🛰️',
  },
];

export function PersonnelSidebar() {
  const { pathname } = useRouter();
  return (
    <nav className="p-3 text-sm">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Gestion Personnel
      </div>
      <ul className="space-y-1">
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link
                href={it.href}
                className={[
                  'flex items-center gap-2 rounded px-2 py-2 transition',
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50',
                ].join(' ')}
              >
                <span>{it.icon}</span>
                <span>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
