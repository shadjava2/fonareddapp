import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { useToast } from '@/hooks/useToast';
import { formatDateTimeFR } from '@/lib/formatDate';
import { apiGet, apiPost } from '@/lib/fetcher';
import {
  ArrowDownTrayIcon,
  ClockIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  FingerPrintIcon,
  UserCircleIcon,
  UserGroupIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface CapacityStats {
  person: number;
  face: number;
  card: number;
  fingerprint: number;
  event: number;
}

interface PersonnelStats {
  totalEvents: number;
  totalUsers: number;
  onlineDevices: number;
  recentEvents: number;
  capacity: CapacityStats | null;
}

interface RecentEvent {
  id: string;
  device_ip: string;
  event_type: string;
  employee_no: string;
  event_time: string;
  direction?: string;
}

const PersonnelPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [stats, setStats] = useState<PersonnelStats>({
    totalEvents: 0,
    totalUsers: 0,
    onlineDevices: 0,
    recentEvents: 0,
    capacity: null,
  });
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [importingAll, setImportingAll] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<
    'online' | 'offline' | 'checking'
  >('checking');

  useEffect(() => {
    fetchPersonnelData();
    checkDeviceStatus();
  }, []);

  const fetchPersonnelData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement des données du personnel...');

      // Récupérer les statistiques et les stats séparées (Person, Face, Card, FingerPrint, Event)
      const [eventsResponse, usersResponse, syncResponse, statsResponse] =
        await Promise.all([
          apiGet<{ success: boolean; pagination: { total: number } }>(
            '/api/hikvision/events?limit=1'
          ),
          apiGet<{ success: boolean; pagination: { total: number } }>(
            '/api/hikvision/users?limit=1'
          ),
          apiGet<{ success: boolean; device: any }>('/api/hikvision/sync'),
          apiGet<{ success: boolean; stats: CapacityStats }>(
            '/api/hikvision/stats'
          ),
        ]);

      // Récupérer les événements récents
      const recentEventsResponse = await apiGet<{
        success: boolean;
        events: RecentEvent[];
      }>('/api/hikvision/events?limit=5');

      const newStats: PersonnelStats = {
        totalEvents: eventsResponse.success
          ? eventsResponse.pagination.total
          : 0,
        totalUsers: usersResponse.success ? usersResponse.pagination.total : 0,
        onlineDevices:
          syncResponse.success && syncResponse.device?.status === 'online'
            ? 1
            : 0,
        recentEvents: recentEventsResponse.success
          ? recentEventsResponse.events.length
          : 0,
        capacity:
          statsResponse.success && statsResponse.stats
            ? statsResponse.stats
            : null,
      };

      setStats(newStats);
      setRecentEvents(
        recentEventsResponse.success ? recentEventsResponse.events : []
      );
      setDeviceStatus(
        syncResponse.success && syncResponse.device?.status === 'online'
          ? 'online'
          : 'offline'
      );

      console.log('✅ Données du personnel chargées:', newStats);
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceStatus = async () => {
    try {
      const response = await apiGet<{ success: boolean; device: any }>(
        '/api/hikvision/sync'
      );
      if (response.success) {
        setDeviceStatus(
          response.device?.status === 'online' ? 'online' : 'offline'
        );
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du statut:', error);
      setDeviceStatus('offline');
    }
  };

  const handleImportAll = async () => {
    try {
      setImportingAll(true);
      const res = await apiPost<{
        success: boolean;
        message?: string;
        users?: { imported: number; created: number; updated: number };
        events?: { inserted: number; skipped: number; batches: number; error?: string };
      }>('/api/hikvision/import-all', {});
      if (res.success) {
        const u = res.users;
        const e = res.events;
        const parts = [];
        if (u) parts.push(`${u.imported} personne(s) (${u.created} créées, ${u.updated} mises à jour)`);
        if (e?.error) parts.push(`Événements : ${e.error}`);
        else if (e && e.inserted > 0) parts.push(`${e.inserted} événement(s) importés`);
        showSuccess(parts.length ? parts.join(' • ') : res.message ?? 'Import terminé.');
        await fetchPersonnelData();
      } else {
        showError(res.message ?? 'Erreur lors de l\'import.');
      }
    } catch (error) {
      console.error('❌ Import complet:', error);
      showError('Erreur lors de l\'import complet.');
    } finally {
      setImportingAll(false);
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
    };
    return labels[eventType] || eventType;
  };

  const getEventTypeColor = (eventType: string) => {
    const colors: { [key: string]: string } = {
      fingerprint: 'text-blue-600',
      card: 'text-green-600',
      door_open: 'text-orange-600',
      door_close: 'text-gray-600',
      access_granted: 'text-green-600',
      access_denied: 'text-red-600',
    };
    return colors[eventType] || 'text-gray-600';
  };

  return (
    <PersonnelLayout
      title="Module Personnel"
      description="Gestion du personnel et monitoring des accès"
    >
      <div className="space-y-6">
        {/* En-tête avec statut du lecteur */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 text-blue-600 mr-3 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Module Personnel
                </h1>
                <p className="text-sm text-gray-600">
                  Gestion du personnel et monitoring des accès
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <WifiIcon
                  className={`h-5 w-5 mr-2 ${
                    deviceStatus === 'online'
                      ? 'text-green-500'
                      : deviceStatus === 'offline'
                        ? 'text-red-500'
                        : 'text-yellow-500'
                  }`}
                />
                <span
                  className={`text-sm font-medium ${
                    deviceStatus === 'online'
                      ? 'text-green-600'
                      : deviceStatus === 'offline'
                        ? 'text-red-600'
                        : 'text-yellow-600'
                  }`}
                >
                  {deviceStatus === 'online'
                    ? 'Lecteur en ligne'
                    : deviceStatus === 'offline'
                      ? 'Lecteur hors ligne'
                      : 'Vérification...'}
                </span>
              </div>
              <button
                onClick={checkDeviceStatus}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition duration-200"
              >
                Actualiser
              </button>
              <button
                onClick={handleImportAll}
                disabled={importingAll || deviceStatus !== 'online'}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                {importingAll ? 'Import en cours...' : 'Tout importer'}
              </button>
            </div>
          </div>
        </div>

        {/* Statistiques séparées : Person, Face, Card, FingerPrint, Event */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Informations / Capacité (séparées)
            </h3>
            <details className="text-right">
              <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700 list-none">
                D&apos;où viennent ces chiffres ?
              </summary>
              <div className="mt-2 p-3 bg-gray-50 rounded text-left text-xs text-gray-600 max-w-md">
                <p className="font-medium text-gray-700 mb-1">Source des données :</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li><strong>Person</strong> : base (personnes importées depuis l&apos;appareil).</li>
                  <li><strong>Face</strong> : appareil (bibliothèque visage FDLib).</li>
                  <li><strong>Card</strong> : base ou appareil si l&apos;API Cartes est supportée (certains lecteurs comme DS-K1T n&apos;en ont pas).</li>
                  <li><strong>FingerPrint</strong> : appareil (bibliothèque empreintes FDLib). On n&apos;importe pas les templates pour des raisons de sécurité.</li>
                  <li><strong>Event</strong> : base (import possible seulement si l&apos;appareil expose l&apos;API AcsEvent ; le DS-K1T ne la supporte pas).</li>
                </ul>
              </div>
            </details>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserCircleIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500">Person</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {loading || stats.capacity === null
                      ? '...'
                      : stats.capacity.person.toLocaleString()}
                  </dd>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500">Face</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {loading || stats.capacity === null
                      ? '...'
                      : stats.capacity.face.toLocaleString()}
                  </dd>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500">Card</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {loading || stats.capacity === null
                      ? '...'
                      : stats.capacity.card.toLocaleString()}
                  </dd>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FingerPrintIcon className="h-8 w-8 text-amber-600" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500">
                    FingerPrint
                  </dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {loading || stats.capacity === null
                      ? '...'
                      : stats.capacity.fingerprint.toLocaleString()}
                  </dd>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-8 w-8 text-sky-600" />
                </div>
                <div className="ml-3">
                  <dt className="text-sm font-medium text-gray-500">Event</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {loading || stats.capacity === null
                      ? '...'
                      : stats.capacity.event.toLocaleString()}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Statut lecteur + Événements récents */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WifiIcon
                    className={`h-8 w-8 ${deviceStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Lecteurs en ligne
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : stats.onlineDevices}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Événements récents (aperçu)
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {loading ? '...' : stats.recentEvents}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation vers les sous-modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/personnel/events"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200"
          >
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Événements
                </h3>
                <p className="text-sm text-gray-500">
                  Consulter l'historique des accès
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/personnel/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200"
          >
            <div className="flex items-center">
              <UserGroupIcon className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Utilisateurs ACS
                </h3>
                <p className="text-sm text-gray-500">
                  Gérer les utilisateurs du système
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/personnel/monitoring"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition duration-200"
          >
            <div className="flex items-center">
              <WifiIcon className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Monitoring
                </h3>
                <p className="text-sm text-gray-500">
                  Surveillance en temps réel
                </p>
              </div>
            </div>
          </Link>
        </div>

        {/* Événements récents */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Événements récents
            </h3>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-500">
                  Chargement des événements...
                </p>
              </div>
            ) : recentEvents.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucun événement récent
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Les événements du lecteur d'empreinte apparaîtront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-bold">
                            {event.employee_no?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {getEventTypeLabel(event.event_type)}
                        </p>
                        <p className="text-sm text-gray-500">
                          Employé: {event.employee_no || 'N/A'} •
                          {event.direction && ` Direction: ${event.direction}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${getEventTypeColor(event.event_type)}`}
                      >
                        {formatEventTime(event.event_time)}
                      </p>
                      <p className="text-xs text-gray-500">{event.device_ip}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default PersonnelPage;
