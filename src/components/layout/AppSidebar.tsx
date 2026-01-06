import Link from 'next/link';

export function AppSidebar() {
  return (
    <nav className="h-full w-64 bg-emerald-700 text-white">
      <div className="px-4 py-4 border-b border-emerald-600">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-white/90 text-emerald-700 flex items-center justify-center font-bold">
            F
          </div>
          <div>
            <div className="text-sm font-semibold">Fonaredd App</div>
            <div className="text-[11px] opacity-90">Gestion interne</div>
          </div>
        </div>
      </div>
      <ul className="p-3 space-y-1 text-sm">
        <li>
          <Link
            href="/home"
            className="block rounded-md px-3 py-2 bg-emerald-800/60 hover:bg-emerald-800 transition"
          >
            Tableau de bord
          </Link>
        </li>
      </ul>
    </nav>
  );
}
