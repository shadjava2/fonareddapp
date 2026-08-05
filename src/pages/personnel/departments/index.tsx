import { useRouter } from 'next/router';
import { useEffect } from 'react';

/**
 * Ancienne page « Gestion des services » ACS — remplacée par
 * Admin → Droits Services (+ liaison agent sur Agents enregistrés).
 */
export default function DepartmentsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    void router.replace('/admin/droits-services');
  }, [router]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-600">
      Redirection vers Droits Services…
    </div>
  );
}
