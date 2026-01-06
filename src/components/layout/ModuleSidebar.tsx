import Link from 'next/link';
import { useRouter } from 'next/router';

type SidebarItem = {
  label: string;
  href: string;
};

const adminItems: SidebarItem[] = [
  { label: 'Retour accueil', href: '/home' },
  { label: 'Sites', href: '/admin/sites' },
  { label: 'Services', href: '/admin/services' },
  { label: 'Rôles', href: '/admin/roles' },
  { label: 'Droits rôles', href: '/admin/roles-permissions' },
  { label: 'Utilisateurs', href: '/admin/utilisateurs' },
  { label: 'Droits services', href: '/admin/droits-services' },
];

const personnelItems: SidebarItem[] = [
  { label: 'Retour accueil', href: '/home' },
  { label: 'Calendrier Fonaredd', href: '/personnel/calendrier' },
  { label: 'Congé Config', href: '/personnel/conge-config' },
  { label: 'Demande Congé', href: '/personnel/demande-conge' },
  { label: 'Congé Phase', href: '/personnel/conge-phase' },
  { label: 'Congé Solde', href: '/personnel/conge-solde' },
  { label: 'Congé Traitement', href: '/personnel/conge-traitement' },
  { label: 'Type Congé', href: '/personnel/type-conge' },
];

export function ModuleSidebar() {
  const { pathname } = useRouter();
  const inAdmin = pathname.startsWith('/admin');
  const inPersonnel = pathname.startsWith('/personnel');

  const items = inAdmin ? adminItems : inPersonnel ? personnelItems : [];
  if (items.length === 0) return null;

  return (
    <aside className="hidden lg:block w-64 flex-shrink-0 border-r bg-white/70 backdrop-blur-sm">
      <nav className="p-4 space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
