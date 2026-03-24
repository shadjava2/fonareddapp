import PersonnelLayout from '@/components/layout/PersonnelLayout';
import Pagination from '@/components/ui/Pagination';
import SearchBar from '@/components/ui/SearchBar';
import { useToast } from '@/hooks/useToast';
import { formatDateFR, formatDateTimeFR } from '@/lib/formatDate';
import { apiGet } from '@/lib/fetcher';
import { ArrowPathIcon, ClockIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface Event {
  id: string;
  device_ip: string;
  event_index: string;
  event_time: string;
  event_type: string;
  door_no?: number;
  direction?: string;
  card_no?: string;
  employee_no?: string;
  raw: any;
}

const EventsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async (
    page = currentPage,
    limit = itemsPerPage,
    search = searchQuery,
    period?: { start: string; end: string }
  ) => {
    try {
      setLoading(true);
      const start = period?.start ?? startDate;
      const end = period?.end ?? endDate;
      console.log('🔍 Chargement des événements...', { page, limit, search, start, end });

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(search && { employee_no: search }),
        ...(start && { startTime: new Date(start + 'T00:00:00.000Z').toISOString() }),
        ...(end && { endTime: new Date(end + 'T23:59:59.999Z').toISOString() }),
      });

      const response = await apiGet<{
        success: boolean;
        events: Event[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
        message: string;
      }>(`/api/hikvision/events?${params.toString()}`);

      console.log('🔍 Réponse API événements:', response);

      if (response.success && response.events) {
        setEvents(response.events);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
        console.log('✅ Événements chargés:', response.events.length);
      } else {
        console.error('❌ Erreur dans la réponse API:', response);
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des événements:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchEvents(page, itemsPerPage, searchQuery);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchEvents(1, newItemsPerPage, searchQuery);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
    fetchEvents(1, itemsPerPage, query);
  };

  const handleApplyPeriod = () => {
    setCurrentPage(1);
    fetchEvents(1, itemsPerPage, searchQuery, (startDate || endDate) ? { start: startDate, end: endDate } : undefined);
  };

  const handleClearPeriod = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    fetchEvents(1, itemsPerPage, searchQuery);
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      console.log('🔄 Synchronisation des événements depuis Hikvision...');

      const params = new URLSearchParams();
      if (startDate) {
        params.set('startTime', new Date(startDate + 'T00:00:00.000Z').toISOString());
      }
      if (endDate) {
        params.set('endTime', new Date(endDate + 'T23:59:59.999Z').toISOString());
      }
      const url = params.toString() ? `/api/hikvision/ingest?${params.toString()}` : '/api/hikvision/ingest';
      const response = await fetch(url);
      const data = await response.json();

      if (data.ok) {
        showSuccess(
          `${data.inserted || 0} événement(s) synchronisé(s) depuis Hikvision`
        );
        await fetchEvents();
      } else {
        if (data.code === 'DEVICE_UNSUPPORTED') {
          showError(
            "Cet appareil ne supporte pas la synchronisation des événements. Les données affichées sont celles déjà en base."
          );
        } else {
          showError(data.error || 'Erreur lors de la synchronisation');
        }
      }
    } catch (error: any) {
      console.error('❌ Erreur lors de la synchronisation:', error);
      showError(
        "Erreur lors de la synchronisation. Si vous utilisez un lecteur DS-K1T, cet appareil ne supporte pas l'API événements."
      );
    } finally {
      setSyncing(false);
    }
  };

  const formatEventTime = (eventTime: string) => formatDateTimeFR(eventTime);

  const getEventTypeLabel = (eventType: string) => {
    const labels: { [key: string]: string } = {
      fingerprint: 'Empreinte digitale',
      card: 'Badge',
      door_open: 'Ouverture porte',
      door_close: 'Fermeture porte',
      access_granted: 'Accès autorisé',
      access_denied: 'Accès refusé',
      alarm: 'Alarme',
      button: 'Bouton',
    };
    return labels[eventType] || eventType;
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: { [key: string]: string } = {
      fingerprint: 'bg-blue-100 text-blue-800',
      card: 'bg-green-100 text-green-800',
      door_open: 'bg-orange-100 text-orange-800',
      door_close: 'bg-gray-100 text-gray-800',
      access_granted: 'bg-green-100 text-green-800',
      access_denied: 'bg-red-100 text-red-800',
      alarm: 'bg-red-100 text-red-800',
      button: 'bg-purple-100 text-purple-800',
    };
    return colors[eventType] || 'bg-gray-100 text-gray-800';
  };

  const getDirectionIcon = (direction?: string) => {
    if (!direction) return '↔️';
    return direction.toLowerCase() === 'in' ? '⬇️' : '⬆️';
  };

  return (
    <PersonnelLayout
      title="Événements d'Accès"
      description="Historique des événements du lecteur d'empreinte"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Événements d'Accès
                </h1>
                <p className="text-sm text-gray-600">
                  Historique des événements du lecteur d'empreinte
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {startDate || endDate ? (
                <p className="text-xs text-gray-500">
                  La synchro utilisera la période : {startDate ? formatDateFR(startDate + 'T12:00:00') : '…'} → {endDate ? formatDateFR(endDate + 'T12:00:00') : '…'}
                </p>
              ) : null}
              <div className="flex space-x-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 disabled:opacity-50"
                  title={startDate || endDate ? 'Synchroniser uniquement la période choisie (Du / Au)' : 'Synchroniser les nouveaux événements depuis le lecteur'}
                >
                  <ArrowPathIcon
                    className={`h-5 w-5 mr-2 ${syncing ? 'animate-spin' : ''}`}
                  />
                  {syncing
                    ? 'Synchronisation...'
                    : (startDate || endDate)
                      ? 'Synchroniser la période choisie'
                      : 'Synchroniser depuis Hikvision'}
                </button>
                <button
                  onClick={() => fetchEvents()}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
                >
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Période et recherche */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Rechercher des événements
            </h3>
            <button
              onClick={() => fetchEvents()}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Actualiser
            </button>
          </div>

          {/* Choix de la période */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Période</h4>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="startDate" className="block text-xs font-medium text-gray-500 mb-1">
                  Du
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-xs font-medium text-gray-500 mb-1">
                  Au
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyPeriod}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Appliquer
              </button>
              <button
                type="button"
                onClick={handleClearPeriod}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Toute la période
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Filtrer les événements par date. Sans période, tous les événements sont affichés.
            </p>
          </div>

          <SearchBar
            onSearch={handleSearch}
            placeholder="Rechercher par numéro d'employé..."
            loading={loading}
            className="w-full"
          />
        </div>

        {/* Contenu principal */}
        {loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">
              Chargement des événements...
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              Aucun événement trouvé
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Les événements du lecteur d'empreinte apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type d'événement
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Employé
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Direction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Porte
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date/Heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lecteur
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(event.event_type)}`}
                        >
                          {getEventTypeLabel(event.event_type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {event.employee_no || 'N/A'}
                        </div>
                        {event.card_no && (
                          <div className="text-sm text-gray-500">
                            Badge: {event.card_no}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getDirectionIcon(event.direction)}
                          </span>
                          <span className="text-sm text-gray-900">
                            {event.direction || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.door_no ? `Porte ${event.door_no}` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatEventTime(event.event_time)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {event.device_ip}
                        </div>
                        <div className="text-xs text-gray-500">
                          Index: {event.event_index}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && events.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
            loading={loading}
          />
        )}
      </div>
    </PersonnelLayout>
  );
};

export default EventsPage;
