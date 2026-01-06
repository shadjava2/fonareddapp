import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { apiGet } from '@/lib/fetcher';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  WifiIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface MonitoringData {
  device_ip: string;
  device_name: string;
  status: 'online' | 'offline';
  last_sync: string;
  events_count: number;
  users_count: number;
}

interface RecentEvent {
  id: string;
  device_ip: string;
  event_type: string;
  employee_no: string;
  event_time: string;
  direction?: string;
}

const MonitoringPage: React.FC = () => {
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(
    null
  );
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMonitoringData();

    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchMonitoringData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const fetchMonitoringData = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement des données de monitoring...');

      const [syncResponse, eventsResponse] = await Promise.all([
        apiGet<{ success: boolean; device: MonitoringData }>(
          '/api/hikvision/sync'
        ),
        apiGet<{ success: boolean; events: RecentEvent[] }>(
          '/api/hikvision/events?limit=10'
        ),
      ]);

      if (syncResponse.success) {
        setMonitoringData(syncResponse.device);
      }

      if (eventsResponse.success) {
        setRecentEvents(eventsResponse.events);
      }

      setLastUpdate(new Date());
      console.log('✅ Données de monitoring mises à jour');
    } catch (error) {
      console.error(
        '❌ Erreur lors du chargement des données de monitoring:',
        error
      );
    } finally {
      setLoading(false);
    }
  };

  const formatEventTime = (eventTime: string) => {
    return new Date(eventTime).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getEventTypeLabel = (eventType: string) => {
    const labels: { [key: string]: string } = {
      fingerprint: 'Empreinte',
      card: 'Badge',
      door_open: 'Ouverture',
      door_close: 'Fermeture',
      access_granted: 'Accès OK',
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

  const getDirectionIcon = (direction?: string) => {
    if (!direction) return '↔️';
    return direction.toLowerCase() === 'in' ? '⬇️' : '⬆️';
  };

  return (
    <PersonnelLayout
      title="Monitoring Temps Réel"
      description="Surveillance en temps réel du lecteur d'empreinte"
    >
      <div className="space-y-6">
        {/* En-tête avec contrôles */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <WifiIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Monitoring Temps Réel
                </h1>
                <p className="text-sm text-gray-600">
                  Surveillance en temps réel du lecteur d'empreinte
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="autoRefresh"
                  className="ml-2 text-sm text-gray-700"
                >
                  Actualisation auto
                </label>
              </div>
              <button
                onClick={fetchMonitoringData}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 disabled:opacity-50"
              >
                {loading ? 'Actualisation...' : 'Actualiser'}
              </button>
            </div>
          </div>
        </div>

        {/* Statut du lecteur */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <WifiIcon
                    className={`h-8 w-8 ${
                      monitoringData?.status === 'online'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Statut du lecteur
                    </dt>
                    <dd
                      className={`text-lg font-medium ${
                        monitoringData?.status === 'online'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {monitoringData?.status === 'online'
                        ? 'En ligne'
                        : 'Hors ligne'}
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
                  <ClockIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Dernière sync
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {monitoringData?.last_sync
                        ? new Date(monitoringData.last_sync).toLocaleTimeString(
                            'fr-FR'
                          )
                        : 'N/A'}
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
                      Total événements
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {monitoringData?.events_count?.toLocaleString() || '0'}
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
                  <CheckCircleIcon className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Utilisateurs ACS
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {monitoringData?.users_count?.toLocaleString() || '0'}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Événements en temps réel */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Événements en temps réel
              </h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Dernière mise à jour: {lastUpdate.toLocaleTimeString('fr-FR')}
                </span>
                {autoRefresh && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    <span className="text-sm text-green-600">En direct</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
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
                  Les événements du lecteur d'empreinte apparaîtront ici en
                  temps réel.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition duration-200"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
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
                          Employé: {event.employee_no || 'N/A'}
                          {event.direction &&
                            ` • Direction: ${event.direction}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-sm font-medium ${getEventTypeColor(event.event_type)}`}
                      >
                        {formatEventTime(event.event_time)}
                      </p>
                      <div className="flex items-center">
                        <span className="text-lg mr-2">
                          {getDirectionIcon(event.direction)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {event.device_ip}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Informations du lecteur */}
        {monitoringData && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Informations du lecteur
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Adresse IP
                </dt>
                <dd className="text-sm text-gray-900">
                  {monitoringData.device_ip}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Nom du dispositif
                </dt>
                <dd className="text-sm text-gray-900">
                  {monitoringData.device_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Statut</dt>
                <dd
                  className={`text-sm font-medium ${
                    monitoringData.status === 'online'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {monitoringData.status === 'online'
                    ? 'En ligne'
                    : 'Hors ligne'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Dernière synchronisation
                </dt>
                <dd className="text-sm text-gray-900">
                  {new Date(monitoringData.last_sync).toLocaleString('fr-FR')}
                </dd>
              </div>
            </div>
          </div>
        )}
      </div>
    </PersonnelLayout>
  );
};

export default MonitoringPage;
