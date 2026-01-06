import CrudForm from '@/components/forms/CrudForm';
import AppShell from '@/components/layout/AppShell';
import { usePermissions } from '@/hooks/useAuth';
import { useRoleAutocomplete, useSiteAutocomplete } from '@/hooks/useAutocomplete';
import { PERMISSIONS } from '@/lib/rbac';
import React from 'react';

const UtilisateursPage: React.FC = () => {
  const { hasPermission } = usePermissions();
  const { options: roleOptions } = useRoleAutocomplete();
  const { options: siteOptions } = useSiteAutocomplete();

  if (!hasPermission(PERMISSIONS.USER_MANAGE)) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Accès refusé</h3>
          <p className="mt-1 text-sm text-gray-500">
            Vous n'avez pas les permissions nécessaires pour gérer les utilisateurs.
          </p>
        </div>
      </AppShell>
    );
  }

  const fields = [
    {
      key: 'nom',
      label: 'Nom',
      type: 'text' as const,
      required: true,
      placeholder: 'Nom de famille',
    },
    {
      key: 'prenom',
      label: 'Prénom',
      type: 'text' as const,
      required: true,
      placeholder: 'Prénom',
    },
    {
      key: 'username',
      label: 'Nom d\'utilisateur',
      type: 'text' as const,
      required: true,
      placeholder: 'Nom d\'utilisateur unique',
    },
    {
      key: 'mail',
      label: 'Email',
      type: 'email' as const,
      placeholder: 'adresse@email.com',
    },
    {
      key: 'phone',
      label: 'Téléphone',
      type: 'text' as const,
      placeholder: 'Numéro de téléphone',
    },
    {
      key: 'fkRole',
      label: 'Rôle',
      type: 'select' as const,
      required: true,
      options: roleOptions,
    },
    {
      key: 'fkSite',
      label: 'Site',
      type: 'select' as const,
      options: [{ value: '', label: 'Aucun site' }, ...siteOptions],
    },
  ];

  const columns = [
    {
      key: 'nom',
      label: 'Nom',
      render: (value: any, item: any) => (
        <div>
          <div className="font-medium text-gray-900">
            {item.nom} {item.prenom}
          </div>
          <div className="text-sm text-gray-500">@{item.username}</div>
        </div>
      ),
    },
    {
      key: 'mail',
      label: 'Contact',
      render: (value: any, item: any) => (
        <div>
          {item.mail && (
            <div className="text-sm text-gray-900">{item.mail}</div>
          )}
          {item.phone && (
            <div className="text-sm text-gray-500">{item.phone}</div>
          )}
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Rôle',
      render: (value: any, item: any) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {item.role?.nom || 'N/A'}
          </div>
          {item.site?.nom && (
            <div className="text-sm text-gray-500">{item.site.nom}</div>
          )}
        </div>
      ),
    },
    {
      key: 'locked',
      label: 'Statut',
      render: (value: any, item: any) => (
        <div className="flex space-x-2">
          {item.locked === 1 ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Verrouillé
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Actif
            </span>
          )}
          {item.initPassword === 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Mot de passe initial
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <AppShell>
      <CrudForm
        endpoint="/api/rbac/utilisateurs"
        title="Utilisateurs"
        fields={fields}
        columns={columns}
      />
    </AppShell>
  );
};

export default UtilisateursPage;
