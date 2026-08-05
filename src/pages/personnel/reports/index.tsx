import PersonnelLayout from '@/components/layout/PersonnelLayout';
import Pagination from '@/components/ui/Pagination';
import { formatDateTimeFR } from '@/lib/formatDate';
import { apiGet } from '@/lib/fetcher';
import type { AttendanceSortField } from '@/lib/hikvision/attendance-report-data';
import {
  ArrowDownTrayIcon,
  ArrowsUpDownIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AttendanceRecord {
  id: string;
  personId: string;
  name: string;
  department: string;
  time: string;
  attendanceStatus: string;
  attendanceCheckPoint: string;
  custom: string;
  eventType?: string;
  direction?: string | null;
}

type PdfLoadingState = 'collective' | 'individual' | null;
type SortOrderState = 'asc' | 'desc';
type PointageDirectionFilter = '' | 'in' | 'out';

const ReportsPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  /** Période large par défaut (90 j.) pour inclure les pointages hors du mois courant */
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString().slice(0, 16);
  });
  const [department, setDepartment] = useState('');
  const [name, setName] = useState('');
  const [personId, setPersonId] = useState('');
  const [deviceIpFilter, setDeviceIpFilter] = useState('');
  const [pointageDirection, setPointageDirection] =
    useState<PointageDirectionFilter>('');
  const [sortBy, setSortBy] = useState<AttendanceSortField>('event_time');
  const [sortOrder, setSortOrder] = useState<SortOrderState>('desc');
  const [pdfLoading, setPdfLoading] = useState<PdfLoadingState>(null);

  const fetchRecords = async (
    page = currentPage,
    limit = itemsPerPage,
    filters?: {
      startTime?: string;
      endTime?: string;
      department?: string;
      name?: string;
      employee_no?: string;
    },
    sortOverride?: { sortBy: AttendanceSortField; sortOrder: 'asc' | 'desc' },
    listExtras?: { pointageDirection?: PointageDirectionFilter; deviceIp?: string }
  ) => {
    try {
      setLoading(true);
      const sb = sortOverride?.sortBy ?? sortBy;
      const so = sortOverride?.sortOrder ?? sortOrder;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: sb,
        sortOrder: so,
      });
      if (filters?.startTime)
        params.set('startTime', new Date(filters.startTime).toISOString());
      if (filters?.endTime)
        params.set('endTime', new Date(filters.endTime).toISOString());
      if (filters?.department) params.set('department', filters.department);
      if (filters?.name) params.set('name', filters.name);
      if (filters?.employee_no) params.set('employee_no', filters.employee_no);
      const pd =
        listExtras?.pointageDirection !== undefined
          ? listExtras.pointageDirection
          : pointageDirection;
      if (pd === 'in' || pd === 'out') {
        params.set('pointageDirection', pd);
      }
      const dipSource =
        listExtras?.deviceIp !== undefined
          ? listExtras.deviceIp
          : deviceIpFilter;
      const dip = dipSource.trim();
      if (dip) params.set('deviceIp', dip);

      const response = await apiGet<{
        success: boolean;
        records: AttendanceRecord[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      }>(`/api/hikvision/attendance-reports?${params.toString()}`);

      if (response.success && response.records) {
        setRecords(response.records);
        setTotalPages(response.pagination.totalPages);
        setTotalItems(response.pagination.total);
      } else {
        setRecords([]);
      }
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const start = new Date();
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    void fetchRecords(1, itemsPerPage, {
      startTime: start.toISOString().slice(0, 16),
      endTime: end.toISOString().slice(0, 16),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chargement initial avec période par défaut
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    void fetchRecords(1, itemsPerPage, {
      startTime,
      endTime,
      department: department || undefined,
      name: name || undefined,
      employee_no: personId || undefined,
    });
  };

  const listFilterPayload = () => ({
    pointageDirection,
    deviceIp: deviceIpFilter,
  });

  const handleSortFieldChange = (field: AttendanceSortField) => {
    setSortBy(field);
    setCurrentPage(1);
    void fetchRecords(
      1,
      itemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      { sortBy: field, sortOrder },
      listFilterPayload()
    );
  };

  const handleSortOrderChange = (order: 'asc' | 'desc') => {
    setSortOrder(order);
    setCurrentPage(1);
    void fetchRecords(
      1,
      itemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      { sortBy, sortOrder: order },
      listFilterPayload()
    );
  };

  const handlePointageDirectionChange = (v: PointageDirectionFilter) => {
    setPointageDirection(v);
    setCurrentPage(1);
    void fetchRecords(
      1,
      itemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      { sortBy, sortOrder },
      { pointageDirection: v, deviceIp: deviceIpFilter }
    );
  };

  const handleHeaderSort = (field: AttendanceSortField) => {
    let nextOrder: 'asc' | 'desc';
    if (sortBy === field) {
      nextOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else if (field === 'event_time') {
      nextOrder = 'desc';
    } else {
      nextOrder = 'asc';
    }
    setSortBy(field);
    setSortOrder(nextOrder);
    setCurrentPage(1);
    void fetchRecords(
      1,
      itemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      { sortBy: field, sortOrder: nextOrder },
      listFilterPayload()
    );
  };

  const sortIcon = (field: AttendanceSortField) => {
    if (sortBy !== field) {
      return (
        <ArrowsUpDownIcon
          className="h-4 w-4 shrink-0 text-gray-400"
          aria-hidden
        />
      );
    }
    return sortOrder === 'asc' ? (
      <ChevronUpIcon
        className="h-4 w-4 shrink-0 text-emerald-700"
        aria-hidden
      />
    ) : (
      <ChevronDownIcon
        className="h-4 w-4 shrink-0 text-emerald-700"
        aria-hidden
      />
    );
  };

  const handleReset = () => {
    const d = new Date();
    const start = new Date(d);
    start.setDate(start.getDate() - 90);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    setStartTime(start.toISOString().slice(0, 16));
    setEndTime(end.toISOString().slice(0, 16));
    setDepartment('');
    setName('');
    setPersonId('');
    setDeviceIpFilter('');
    setPointageDirection('');
    setSortBy('event_time');
    setSortOrder('desc');
    setCurrentPage(1);
    void fetchRecords(
      1,
      itemsPerPage,
      {
        startTime: start.toISOString().slice(0, 16),
        endTime: end.toISOString().slice(0, 16),
      },
      { sortBy: 'event_time', sortOrder: 'desc' },
      { pointageDirection: '', deviceIp: '' }
    );
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    void fetchRecords(
      page,
      itemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      undefined,
      listFilterPayload()
    );
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    void fetchRecords(
      1,
      newItemsPerPage,
      {
        startTime,
        endTime,
        department: department || undefined,
        name: name || undefined,
        employee_no: personId || undefined,
      },
      undefined,
      listFilterPayload()
    );
  };

  const formatTime = (timeStr: string) => formatDateTimeFR(timeStr);

  const buildAttendancePdfSearchParams = (scope: 'collective' | 'individual') => {
    const params = new URLSearchParams();
    params.set('scope', scope);
    params.set('startTime', new Date(startTime).toISOString());
    params.set('endTime', new Date(endTime).toISOString());
    params.set('sortBy', sortBy);
    params.set('sortOrder', sortOrder);
    if (department.trim()) params.set('department', department.trim());
    if (name.trim()) params.set('name', name.trim());
    if (personId.trim()) params.set('employee_no', personId.trim());
    if (pointageDirection === 'in' || pointageDirection === 'out') {
      params.set('pointageDirection', pointageDirection);
    }
    const dip = deviceIpFilter.trim();
    if (dip) params.set('deviceIp', dip);
    return params;
  };

  const downloadAttendancePdf = async (scope: 'collective' | 'individual') => {
    if (scope === 'individual' && !personId.trim()) {
      window.alert(
        'Renseignez l’ID personne pour télécharger le PDF individuel, ou utilisez le PDF collectif.'
      );
      return;
    }
    setPdfLoading(scope);
    try {
      const qs = buildAttendancePdfSearchParams(scope).toString();
      const res = await fetch(`/api/hikvision/attendance-reports-pdf?${qs}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || 'Génération du PDF impossible');
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/pdf')) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(j.message || 'Réponse inattendue du serveur');
      }
      const blob = await res.blob();
      const cd = res.headers.get('content-disposition');
      let filename = scope === 'individual' ? 'pointage_individuel.pdf' : 'pointage_collectif.pdf';
      const m = cd?.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)/i);
      if (m?.[1]) filename = decodeURIComponent(m[1].replaceAll('+', ' '));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Téléchargement impossible';
      window.alert(msg);
    } finally {
      setPdfLoading(null);
    }
  };

  const getStatusColor = (status: string, custom?: string) => {
    const bag = `${status} ${custom ?? ''}`.toLowerCase();
    if (
      bag.includes('entrée') ||
      bag.includes('entree') ||
      bag.includes('check-in') ||
      bag.includes('check in') ||
      bag.includes('on duty') ||
      bag.includes('clock in')
    ) {
      return 'bg-green-100 text-green-800';
    }
    if (
      bag.includes('sortie service') ||
      bag.includes('sortie travail') ||
      bag.includes('check-out') ||
      bag.includes('check out') ||
      bag.includes('off duty') ||
      bag.includes('clock out')
    ) {
      return 'bg-orange-100 text-orange-800';
    }
    if (bag.includes('mission')) {
      return 'bg-amber-100 text-amber-900';
    }
    if (bag.includes('heure sup') || bag.includes('overtime')) {
      return 'bg-violet-100 text-violet-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <PersonnelLayout
      title="Rapports et Pointages"
      description="Liste des rapports de présence et pointages"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Rapports et Pointages
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Affichage des pointages avec filtres par période et personne
          </p>
          <p className="mt-3">
            <Link
              href="/personnel/reports/monthly-performance"
              className="inline-flex items-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Rapport performance mensuelle (indices, missions, PDF)
            </Link>
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm font-medium text-blue-900 mb-1">
              Comment importer les pointages pour les rapports ?
            </p>
            <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
              <li>
                <strong>Tableau de bord</strong> : <Link href="/personnel" className="underline hover:no-underline">Personnel</Link> → bouton <strong>« Tout importer »</strong> (personnes + tous les événements du lecteur).
              </li>
              <li>
                <strong>Monitoring</strong> : <Link href="/personnel/monitoring" className="underline hover:no-underline">Monitoring</Link> → <strong>« Synchroniser les événements »</strong> (import incrémental des nouveaux pointages).
              </li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">
              Les rapports ci-dessous utilisent les événements déjà importés en base. Par défaut, la période couvre les{' '}
              <strong>90 derniers jours</strong> (modifiable). Certains lecteurs (ex. DS-K1T) n’exposent pas l’API AcsEvent : dans ce cas les pointages ne peuvent pas être importés ici.
            </p>
            <p className="text-xs text-blue-800 mt-2 border-t border-blue-200 pt-2">
              <strong>Configuration T&A Hikvision :</strong> les rapports reconnaissent les statuts personnalisés du terminal (ex.{' '}
              <strong>Entrée Service</strong> / <strong>Sortie Service</strong>,{' '}
              <strong>Sortie Mission</strong> / <strong>Retour Mission</strong>,{' '}
              <strong>Début Heure Sup.</strong> / <strong>Fin Heure Sup.</strong>) en plus des champs techniques <code className="bg-blue-100 px-1 rounded">direction</code> in/out. Le tableau mensuel individuel retient la <strong>première entrée service</strong> et la <strong>dernière sortie service</strong> de chaque jour.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              <strong>Données en base :</strong> chaque import enregistre dans{' '}
              <code className="bg-blue-100 px-1 rounded">acs_events</code> l’adresse IP du lecteur (<code className="bg-blue-100 px-1 rounded">device_ip</code>), le numéro de porte (<code className="bg-blue-100 px-1 rounded">door_no</code>), le sens (<code className="bg-blue-100 px-1 rounded">direction</code>, issu de <code className="bg-blue-100 px-1 rounded">entryDirection</code> ou <code className="bg-blue-100 px-1 rounded">doorAction</code>) et le type d’événement (<code className="bg-blue-100 px-1 rounded">event_type</code>). La colonne « Point de contrôle » combine IP + porte.
            </p>
          </div>
        </div>

        {/* Filtres (style iVMS-4200) */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label
                htmlFor="start-time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Heure de début
              </label>
              <input
                id="start-time"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="end-time"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Heure de fin
              </label>
              <input
                id="end-time"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="department"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Département
              </label>
              <input
                id="department"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ex: fonaredd"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nom
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Rechercher par nom"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label
                htmlFor="person-id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                ID personne
              </label>
              <input
                id="person-id"
                type="text"
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                placeholder="ex: 45"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 border-t border-gray-100 pt-4">
            <div>
              <label
                htmlFor="sort-by"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Trier par
              </label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) =>
                  handleSortFieldChange(e.target.value as AttendanceSortField)
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="event_time">Date / heure</option>
                <option value="employee_no">ID personne</option>
                <option value="event_type">Type événement</option>
                <option value="direction">Sens (champ lecteur)</option>
                <option value="device_ip">Adresse IP lecteur</option>
                <option value="door_no">Numéro de porte</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="sort-order"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Ordre
              </label>
              <select
                id="sort-order"
                value={sortOrder}
                onChange={(e) =>
                  handleSortOrderChange(e.target.value as 'asc' | 'desc')
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="desc">Décroissant</option>
                <option value="asc">Croissant</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="pointage-dir"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Filtrer entrée / sortie
              </label>
              <select
                id="pointage-dir"
                value={pointageDirection}
                onChange={(e) =>
                  handlePointageDirectionChange(
                    e.target.value as PointageDirectionFilter
                  )
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Tous les pointages</option>
                <option value="in">Entrée (Check-in)</option>
                <option value="out">Sortie (Check-out)</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="device-ip-filter"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Lecteur (IP contient)
              </label>
              <input
                id="device-ip-filter"
                type="text"
                value={deviceIpFilter}
                onChange={(e) => setDeviceIpFilter(e.target.value)}
                placeholder="ex: 192.168."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Appliqué avec <strong>Rechercher</strong> et les exports PDF.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
            >
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Rechercher
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={() => void downloadAttendancePdf('collective')}
              disabled={pdfLoading !== null}
              className="flex items-center px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              {pdfLoading === 'collective' ? 'PDF…' : 'PDF collectif'}
            </button>
            <button
              type="button"
              onClick={() => void downloadAttendancePdf('individual')}
              disabled={pdfLoading !== null || !personId.trim()}
              title={
                !personId.trim()
                  ? 'Renseignez l’ID personne pour activer le PDF individuel'
                  : undefined
              }
              className="flex items-center px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
              {pdfLoading === 'individual' ? 'PDF…' : 'PDF individuel'}
            </button>
          </div>
        </div>

        {/* Tableau des rapports */}
        {loading ? (
          <div className="p-6 bg-white rounded-lg shadow text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto" />
            <p className="mt-2 text-sm text-gray-500">
              Chargement des pointages...
            </p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 bg-white rounded-lg shadow text-center">
            <p className="text-gray-500">Aucun pointage trouvé</p>
            <p className="text-sm text-gray-400 mt-2">
              Ajustez les filtres (dates, département, nom) ou importez les pointages depuis le lecteur.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/personnel"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Tout importer (Tableau de bord)
              </Link>
              <Link
                href="/personnel/monitoring"
                className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
              >
                Synchroniser les événements (Monitoring)
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleHeaderSort('employee_no')}
                        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 uppercase tracking-wider"
                      >
                        ID personne
                        {sortIcon('employee_no')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleHeaderSort('event_time')}
                        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 uppercase tracking-wider"
                      >
                        Heure
                        {sortIcon('event_time')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleHeaderSort('direction')}
                        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 uppercase tracking-wider"
                      >
                        Statut présence
                        {sortIcon('direction')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sens (lecteur)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => handleHeaderSort('device_ip')}
                        className="inline-flex items-center gap-1 font-medium text-gray-600 hover:text-gray-900 uppercase tracking-wider"
                      >
                        Point de contrôle
                        {sortIcon('device_ip')}
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Sens (affiché)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {records.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {record.personId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.department}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTime(record.time)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.attendanceStatus, record.custom)}`}
                        >
                          {record.attendanceStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {record.direction?.trim() ? record.direction : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                        {record.attendanceCheckPoint}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.custom}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && records.length > 0 && (
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

export default ReportsPage;
