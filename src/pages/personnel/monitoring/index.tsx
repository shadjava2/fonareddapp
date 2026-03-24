import { useToast } from '@/hooks/useToast';
import { formatDateTimeFR, formatDateTimeShortFR, formatTimeFR } from '@/lib/formatDate';
import { apiGet } from '@/lib/fetcher';
import { useCallback, useEffect, useState } from 'react';
import MonitoringView, {
  type MonitoringData,
  type RecentEvent,
} from './MonitoringView';

const MonitoringPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [monitoringData, setMonitoringData] = useState<MonitoringData | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingEvents, setSyncingEvents] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      const [syncResponse, eventsResponse] = await Promise.all([
        apiGet<{ success: boolean; device: MonitoringData }>('/api/hikvision/sync'),
        apiGet<{ success: boolean; events: RecentEvent[] }>(
          '/api/hikvision/events?limit=10'
        ),
      ]);
      if (syncResponse.success) setMonitoringData(syncResponse.device);
      if (eventsResponse.success) setRecentEvents(eventsResponse.events);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur chargement monitoring:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringData();
    const interval = setInterval(() => {
      if (autoRefresh) fetchMonitoringData();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchMonitoringData]);

  const handleSyncEvents = async () => {
    setSyncingEvents(true);
    try {
      const res = await fetch('/api/hikvision/ingest');
      const data = await res.json();
      if (data.ok) {
        showSuccess(
          `${data.inserted ?? 0} événement(s) synchronisé(s) le ${formatDateTimeShortFR(new Date())}. Actualisation...`
        );
        await fetchMonitoringData();
      } else {
        if (data.code === 'DEVICE_UNSUPPORTED') {
          showError(
            "Ce lecteur (ex. DS-K1T) ne supporte pas la récupération des événements. Les données affichées sont celles déjà en base."
          );
        } else {
          showError(data.error || 'Erreur lors de la synchronisation');
        }
      }
    } catch (err: unknown) {
      console.error('Sync événements:', err);
      showError(
        "Impossible de synchroniser les événements. Vérifiez que le lecteur supporte l'API AcsEvent."
      );
    } finally {
      setSyncingEvents(false);
    }
  };

  const formatEventTime = (eventTime: string) => formatTimeFR(eventTime, true);

  const getEventTypeLabel = (eventType: string) => {
    const labels: Record<string, string> = {
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
    const colors: Record<string, string> = {
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
    <MonitoringView
      monitoringData={monitoringData}
      recentEvents={recentEvents}
      loading={loading}
      syncingEvents={syncingEvents}
      autoRefresh={autoRefresh}
      lastUpdate={lastUpdate}
      onRefresh={fetchMonitoringData}
      onSyncEvents={handleSyncEvents}
      onAutoRefreshChange={setAutoRefresh}
      formatEventTime={formatEventTime}
      getEventTypeLabel={getEventTypeLabel}
      getEventTypeColor={getEventTypeColor}
      getDirectionIcon={getDirectionIcon}
    />
  );
};

export default MonitoringPage;
