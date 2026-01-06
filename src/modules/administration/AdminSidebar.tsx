'use client';
import Link from 'next/link';
import { useRouter } from 'next/router';

const items = [
  { href: '/admin/utilisateurs', label: 'Utilisateurs', icon: '👤' },
  { href: '/admin/roles', label: 'Rôles', icon: '🛡️' },
  { href: '/admin/permissions', label: 'Permissions', icon: '🔑' },
  { href: '/admin/structures', label: 'Structures', icon: '🏢' },
];

export function AdminSidebar() {
  const { pathname } = useRouter();
  return (
    <nav className="p-3 text-sm">
      <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Administration
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
