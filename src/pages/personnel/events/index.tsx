import PersonnelLayout from '@/components/layout/PersonnelLayout';
import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Pagination from '@/components/ui/Pagination';
import { useToast } from '@/hooks/useToast';
import { formatDateFR, formatDateTimeFR } from '@/lib/formatDate';
import { apiDelete, apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import {
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useMemo, useState } from 'react';

type AgentOption = { value: string; label: string };

interface Event {
  id: string;
  device_ip: string;
  event_index: string;
  event_time: string;
  event_type: string;
  event_type_effective?: string;
  door_no?: number;
  direction?: string;
  direction_effective?: string | null;
  presence_label?: string;
  card_no?: string;
  employee_no?: string;
  employee_name?: string;
  source?: string | null;
  data_source?: string | null;
  custom_status?: string | null;
  raw: any;
}

type ManualDayEvent = {
  id: string;
  time: string;
  custom_status: string;
  event_time: string;
};

function isManualEventRow(event: Event): boolean {
  const src = String(event.source || event.data_source || '').toLowerCase();
  return src === 'manual' || event.device_ip === 'manual';
}

const EventsPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualEmployeeNo, setManualEmployeeNo] = useState<string>('');
  const [manualDate, setManualDate] = useState('');
  const [manualArrivee, setManualArrivee] = useState('');
  const [manualDepart, setManualDepart] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualExisting, setManualExisting] = useState<ManualDayEvent[]>([]);
  const [manualLoadingExisting, setManualLoadingExisting] = useState(false);
  const [manualDeletingId, setManualDeletingId] = useState<string | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  const agentComboOptions = useMemo(() => {
    const emp = searchQuery.trim();
    if (!emp) return agentOptions;
    if (agentOptions.some((o) => o.value === emp)) return agentOptions;
    return [{ value: emp, label: `ID ${emp}` }, ...agentOptions];
  }, [agentOptions, searchQuery]);

  const loadAgents = useCallback(async () => {
    try {
      setAgentsLoading(true);
      const res = await apiGet<{
        success: boolean;
        users: Array<{ employee_no: string; name?: string }>;
      }>('/api/hikvision/users?limit=500&page=1');
      setAgentOptions(
        (res.users || []).map((u) => {
          const id = String(u.employee_no || '').trim();
          const name = (u.name || '').trim();
          return {
            value: id,
            label: name ? `${name} — ${id}` : `ID ${id}`,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setAgentOptions([]);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async (
    page = currentPage,
    limit = itemsPerPage,
    search = searchQuery,
    period?: { start: string; end: string },
    options?: { silent?: boolean }
  ) => {
    try {
      if (!options?.silent) setLoading(true);
      const start = period?.start ?? startDate;
      const end = period?.end ?? endDate;

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

      if (response.success && response.events) {
        setEvents(response.events);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } else {
        setEvents([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des événements:', error);
      if (!options?.silent) setEvents([]);
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, [itemsPerPage, searchQuery, startDate, endDate]);

  useEffect(() => {
    void loadAgents();
    void fetchEvents(1, itemsPerPage, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial
  }, []);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchEvents(page, itemsPerPage, searchQuery);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchEvents(1, newItemsPerPage, searchQuery);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    void fetchEvents(1, itemsPerPage, searchQuery.trim());
  };

  const handleClearEmployee = () => {
    setSearchQuery('');
    setCurrentPage(1);
    void fetchEvents(1, itemsPerPage, '');
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
        const ins = data.inserted ?? 0;
        const skip = data.skipped ?? 0;
        const recv = data.fetched ?? 0;
        const retry = data.widenedRetry
          ? ' Une seconde passe sur 30 jours a été tentée (fenêtre vide).'
          : '';
        showSuccess(
          `${ins} nouveau(x) en base, ${skip} ignoré(s) (déjà présents), ${recv} événement(s) renvoyé(s) par le lecteur.${retry}`
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

  const loadManualExisting = useCallback(async () => {
    if (!manualEmployeeNo.trim() || !manualDate) {
      setManualExisting([]);
      return;
    }
    setManualLoadingExisting(true);
    try {
      const res = await apiGet<{
        success: boolean;
        events?: ManualDayEvent[];
      }>(
        `/api/hikvision/manual-attendance?employeeNo=${encodeURIComponent(manualEmployeeNo.trim())}&date=${encodeURIComponent(manualDate)}`
      );
      setManualExisting(res.success ? res.events || [] : []);
    } catch {
      setManualExisting([]);
    } finally {
      setManualLoadingExisting(false);
    }
  }, [manualEmployeeNo, manualDate]);

  useEffect(() => {
    if (!manualOpen) return;
    void loadManualExisting();
  }, [manualOpen, loadManualExisting]);

  const handleManualSubmit = async () => {
    setManualError(null);
    if (!manualEmployeeNo.trim()) {
      setManualError('Sélectionnez un agent.');
      return;
    }
    if (!manualDate) {
      setManualError('Indiquez la date.');
      return;
    }
    if (!manualArrivee.trim() && !manualDepart.trim()) {
      setManualError('Indiquez au moins une heure d’arrivée ou de départ.');
      return;
    }
    setManualSaving(true);
    try {
      const agentLabel =
        agentOptions.find((o) => o.value === manualEmployeeNo.trim())
          ?.label || '';
      const personName = agentLabel.includes(' — ')
        ? agentLabel.split(' — ')[0].trim()
        : agentLabel.replace(/^ID\s+/i, '').trim();

      const res = await apiPost<{
        success: boolean;
        message?: string;
        events?: ManualDayEvent[];
      }>(
        '/api/hikvision/manual-attendance',
        {
          employeeNo: manualEmployeeNo.trim(),
          date: manualDate,
          heureArrivee: manualArrivee.trim() || undefined,
          heureDepart: manualDepart.trim() || undefined,
          personName: personName || undefined,
        },
        { timeout: 30_000 }
      );
      if (res.success) {
        showSuccess(res.message || 'Pointage manuel enregistré.');
        setManualArrivee('');
        setManualDepart('');
        setManualError(null);
        // Mise à jour locale immédiate (pas d’attente GET)
        if (res.events?.length) {
          setManualExisting((prev) => {
            const byId = new Map(prev.map((e) => [e.id, e]));
            for (const ev of res.events || []) {
              byId.set(ev.id, {
                id: ev.id,
                time: ev.time,
                custom_status: ev.custom_status,
                event_time: ev.event_time,
              });
            }
            return Array.from(byId.values()).sort((a, b) =>
              a.time.localeCompare(b.time)
            );
          });
        }
        void fetchEvents(currentPage, itemsPerPage, searchQuery, undefined, {
          silent: true,
        });
      } else {
        setManualError(res.message || 'Enregistrement impossible');
      }
    } catch (e: unknown) {
      setManualError(getAxiosErrorMessage(e) || 'Enregistrement impossible');
    } finally {
      setManualSaving(false);
    }
  };

  const handleDeleteManualId = async (id: string) => {
    if (
      !window.confirm(
        'Supprimer ce pointage manuel ? Vous pourrez en saisir un nouveau.'
      )
    ) {
      return;
    }
    setManualDeletingId(id);
    setManualError(null);
    try {
      const res = await apiDelete<{ success: boolean; message?: string }>(
        `/api/hikvision/manual-attendance?id=${encodeURIComponent(id)}`
      );
      if (res.success) {
        showSuccess(res.message || 'Pointage manuel supprimé.');
        setManualExisting((prev) => prev.filter((e) => e.id !== id));
        void fetchEvents(currentPage, itemsPerPage, searchQuery, undefined, {
          silent: true,
        });
      } else {
        setManualError(res.message || 'Suppression impossible');
      }
    } catch (e: unknown) {
      setManualError(getAxiosErrorMessage(e) || 'Suppression impossible');
    } finally {
      setManualDeletingId(null);
    }
  };

  const handleDeleteManualDay = async () => {
    if (!manualEmployeeNo.trim() || !manualDate) return;
    if (
      !window.confirm(
        `Supprimer tous les pointages manuels du ${formatDateFR(manualDate)} pour cet agent ?`
      )
    ) {
      return;
    }
    setManualSaving(true);
    setManualError(null);
    try {
      const res = await apiDelete<{ success: boolean; message?: string }>(
        `/api/hikvision/manual-attendance?employeeNo=${encodeURIComponent(manualEmployeeNo.trim())}&date=${encodeURIComponent(manualDate)}`
      );
      if (res.success) {
        showSuccess(res.message || 'Pointages manuels supprimés.');
        setManualArrivee('');
        setManualDepart('');
        setManualExisting([]);
        void fetchEvents(currentPage, itemsPerPage, searchQuery, undefined, {
          silent: true,
        });
      } else {
        setManualError(res.message || 'Suppression impossible');
      }
    } catch (e: unknown) {
      setManualError(getAxiosErrorMessage(e) || 'Suppression impossible');
    } finally {
      setManualSaving(false);
    }
  };

  const handleDeleteEventFromList = async (event: Event) => {
    if (!isManualEventRow(event)) return;
    if (
      !window.confirm(
        'Supprimer ce pointage manuel ? Vous pourrez en saisir un nouveau.'
      )
    ) {
      return;
    }
    setDeletingEventId(event.id);
    try {
      const res = await apiDelete<{ success: boolean; message?: string }>(
        `/api/hikvision/manual-attendance?id=${encodeURIComponent(event.id)}`
      );
      if (res.success) {
        showSuccess(res.message || 'Pointage manuel supprimé.');
        setEvents((prev) => prev.filter((e) => e.id !== event.id));
        setManualExisting((prev) => prev.filter((e) => e.id !== event.id));
        void fetchEvents(currentPage, itemsPerPage, searchQuery, undefined, {
          silent: true,
        });
      } else {
        showError(res.message || 'Suppression impossible');
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Suppression impossible');
    } finally {
      setDeletingEventId(null);
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
    const t = eventType.toLowerCase();
    if (t.includes('check-in') || t === 'checkin') {
      return 'bg-blue-100 text-blue-900';
    }
    if (t.includes('check-out') || t === 'checkout') {
      return 'bg-sky-100 text-sky-900';
    }
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
                  type="button"
                  onClick={() => {
                    setManualOpen(true);
                    setManualError(null);
                    if (!manualDate) {
                      setManualDate(new Date().toISOString().slice(0, 10));
                    }
                  }}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
                >
                  <PencilSquareIcon className="h-5 w-5 mr-2" />
                  Pointage manuel
                </button>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AutocompleteSelect
                inputId="events-agent"
                label="Agent (nom)"
                placeholder="Rechercher par nom… — vide = tous"
                options={agentComboOptions}
                value={searchQuery.trim() || null}
                loading={agentsLoading}
                onChange={(v) => {
                  const id = v == null ? '' : String(v).trim();
                  setSearchQuery(id);
                  setCurrentPage(1);
                  void fetchEvents(1, itemsPerPage, id);
                }}
              />
            </div>
            <div>
              <label
                htmlFor="events-employee-id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ID personne
              </label>
              <div className="flex gap-2">
                <input
                  id="events-employee-id"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch();
                  }}
                  placeholder="ex. 004"
                  className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  title="Rechercher"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
              {searchQuery.trim() ? (
                <button
                  type="button"
                  onClick={handleClearEmployee}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-800"
                >
                  Effacer le filtre employé
                </button>
              ) : null}
            </div>
          </div>
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
                      Présence (entrée / sortie)
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event) => {
                    const typeUi =
                      event.event_type_effective ?? event.event_type;
                    const dirUi =
                      event.direction_effective ?? event.direction;
                    const manual = isManualEventRow(event);
                    return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(typeUi)}`}
                        >
                          {getEventTypeLabel(typeUi)}
                        </span>
                        {manual && (
                          <div className="mt-1 text-xs font-medium text-indigo-600">
                            Manuel
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {event.employee_name || event.employee_no || 'N/A'}
                        </div>
                        {(event.employee_name || event.employee_no) && (
                          <div className="text-sm text-gray-500">
                            ID {event.employee_no || '—'}
                          </div>
                        )}
                        {event.card_no && (
                          <div className="text-sm text-gray-500">
                            Badge: {event.card_no}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-lg mr-2">
                            {getDirectionIcon(dirUi ?? undefined)}
                          </span>
                          <span className="text-sm text-gray-900">
                            {event.presence_label ??
                              dirUi ??
                              event.direction ??
                              '—'}
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
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        {manual ? (
                          <button
                            type="button"
                            disabled={deletingEventId === event.id}
                            onClick={() => void handleDeleteEventFromList(event)}
                            className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                            title="Supprimer le pointage manuel"
                          >
                            <TrashIcon className="mr-1 h-3.5 w-3.5" />
                            {deletingEventId === event.id
                              ? '…'
                              : 'Supprimer'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
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

      {manualOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Fermer"
            onClick={() => !manualSaving && setManualOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Pointage manuel
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  Saisir les heures de la feuille papier (arrivée / départ).
                  En cas d’erreur, supprimez le pointage puis recommencez.
                </p>
              </div>
              <button
                type="button"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                onClick={() => !manualSaving && setManualOpen(false)}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <AutocompleteSelect
                label="Agent (lecteur)"
                options={agentOptions}
                value={manualEmployeeNo || null}
                onChange={(v) =>
                  setManualEmployeeNo(v != null ? String(v) : '')
                }
                placeholder="Rechercher un agent…"
                required
              />
              <div>
                <label
                  htmlFor="manual-date"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Date
                </label>
                <input
                  id="manual-date"
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="manual-arrivee"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Heure d&apos;arrivée
                  </label>
                  <input
                    id="manual-arrivee"
                    type="time"
                    step={60}
                    value={manualArrivee}
                    onChange={(e) => setManualArrivee(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="manual-depart"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Heure de départ
                  </label>
                  <input
                    id="manual-depart"
                    type="time"
                    step={60}
                    value={manualDepart}
                    onChange={(e) => setManualDepart(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {manualEmployeeNo && manualDate && (
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-600">
                      Déjà saisis ce jour
                    </p>
                    {manualExisting.length > 0 && (
                      <button
                        type="button"
                        disabled={manualSaving}
                        onClick={() => void handleDeleteManualDay()}
                        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-50"
                      >
                        Tout supprimer
                      </button>
                    )}
                  </div>
                  {manualLoadingExisting ? (
                    <p className="text-xs text-gray-500">Chargement…</p>
                  ) : manualExisting.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Aucun pointage manuel pour cette date.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {manualExisting.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-center justify-between gap-2 rounded bg-white px-2 py-1.5 text-sm"
                        >
                          <span className="text-gray-800">
                            <span className="font-medium tabular-nums">
                              {ev.time}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              {ev.custom_status}
                            </span>
                          </span>
                          <button
                            type="button"
                            disabled={manualDeletingId === ev.id}
                            onClick={() => void handleDeleteManualId(ev.id)}
                            className="inline-flex items-center rounded border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            <TrashIcon className="mr-1 h-3 w-3" />
                            {manualDeletingId === ev.id ? '…' : 'Supprimer'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {manualError && (
                <p className="text-sm text-red-600">{manualError}</p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={manualSaving}
                  onClick={() => setManualOpen(false)}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  disabled={manualSaving}
                  onClick={() => void handleManualSubmit()}
                  className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {manualSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PersonnelLayout>
  );
};

export default EventsPage;
