import CongeAppShell from '@/components/layout/CongeAppShell';
import Input from '@/components/ui/Input';
import Pagination from '@/components/ui/Pagination';
import { useAuth } from '@/hooks/useAuth';
import { apiGet } from '@/lib/fetcher';
import { BellIcon } from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface Notification {
  id: string;
  sujet: string | null;
  contenu: string | null;
  statut: string;
  type_notification: string;
  adresse_destinataire: string;
  datecreate: string;
  date_envoi: string;
  dateupdate: string;
}

const HistoriqueNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 25;

  useEffect(() => {
    if (user?.id) {
      console.log(
        `🔍 Historique Notifications: Utilisateur connecté ID ${user.id}`
      );
      fetchNotifications();
    }
  }, [user?.id, currentPage, searchTerm]);

  const fetchNotifications = async () => {
    if (!user?.id) {
      console.error("❌ Historique: Pas d'utilisateur connecté");
      return;
    }

    try {
      setLoading(true);
      const userId = Number(user.id); // S'assurer que c'est un nombre
      console.log(`📡 Historique: Fetch notifications pour userId=${userId}`);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await apiGet<{
        success: boolean;
        notifications: Notification[];
        total?: number;
        pagination?: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/api/notifications/historique?userId=${userId}&${params.toString()}`);

      console.log(
        `📊 Historique: Réponse reçue - ${response.notifications?.length || 0} notification(s) pour userId=${userId}`
      );

      if (response.success && response.notifications) {
        setNotifications(response.notifications);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
          setTotalItems(response.pagination.total);
        } else {
          setTotalItems(response.total || response.notifications.length);
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors du chargement de l'historique:", error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      en_attente: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'En attente',
      },
      envoy_e: { color: 'bg-green-100 text-green-800', label: 'Envoyée' },
      chou_e: { color: 'bg-red-100 text-red-800', label: 'Échouée' },
    };

    const badge = badges[statut] || {
      color: 'bg-gray-100 text-gray-800',
      label: statut,
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
      >
        {badge.label}
      </span>
    );
  };

  const getContenuStatus = (contenu: string | null) => {
    if (!contenu) return { color: 'text-gray-500', label: 'N/A' };
    if (contenu.includes('Non Ouvert')) {
      return { color: 'text-red-600', label: 'Non Ouvert' };
    }
    if (contenu.includes('Ouvert')) {
      return { color: 'text-green-600', label: 'Ouvert' };
    }
    return { color: 'text-gray-600', label: contenu };
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const columns = [
    {
      header: 'ID',
      accessor: 'id',
      className: 'w-20',
    },
    {
      header: 'Sujet',
      accessor: 'sujet',
      className: 'min-w-[200px]',
    },
    {
      header: 'Contenu',
      accessor: (row: Notification) => {
        const status = getContenuStatus(row.contenu);
        return <span className={status.color}>{status.label}</span>;
      },
      className: 'min-w-[150px]',
    },
    {
      header: 'Statut',
      accessor: (row: Notification) => getStatutBadge(row.statut),
      className: 'w-32',
    },
    {
      header: 'Type',
      accessor: 'type_notification',
      className: 'w-24',
    },
    {
      header: 'Email',
      accessor: 'adresse_destinataire',
      className: 'min-w-[200px]',
    },
    {
      header: 'Date création',
      accessor: (row: Notification) => formatDate(row.datecreate),
      className: 'w-40',
    },
    {
      header: 'Date envoi',
      accessor: (row: Notification) =>
        row.date_envoi ? formatDate(row.date_envoi) : '-',
      className: 'w-40',
    },
  ];

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BellIcon className="h-8 w-8 mr-3 text-indigo-600" />
                Historique des Notifications
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Consultez toutes vos notifications reçues et leur statut
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Utilisateur</div>
            <div className="text-lg font-bold text-gray-900">
              {user?.nom || user?.username || 'N/A'}
              {user?.id && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  (ID: {user.id})
                </span>
              )}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Non Ouvert</div>
            <div className="text-2xl font-bold text-red-600">
              {
                notifications.filter(
                  (n) => n.contenu && String(n.contenu).includes('Non Ouvert')
                ).length
              }
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Envoyées</div>
            <div className="text-2xl font-bold text-green-600">
              {notifications.filter((n) => n.statut === 'envoy_e').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-sm text-gray-600">Échouées</div>
            <div className="text-2xl font-bold text-red-600">
              {notifications.filter((n) => n.statut === 'chou_e').length}
            </div>
          </div>
        </div>

        {/* Search and filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <Input
            type="text"
            placeholder="Rechercher par sujet, contenu, email..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Chargement...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Aucune notification trouvée
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={idx}
                          className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                        >
                          {col.header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="hover:bg-gray-50">
                        {columns.map((col, idx) => (
                          <td
                            key={idx}
                            className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${col.className || ''}`}
                          >
                            {typeof col.accessor === 'function'
                              ? col.accessor(notification)
                              : notification[col.accessor]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="px-4 py-4 border-t border-gray-200">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newLimit) => {
                      // Optionnel: permettre de changer le nombre d'items par page
                      setCurrentPage(1);
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </CongeAppShell>
  );
};

export default HistoriqueNotificationsPage;
