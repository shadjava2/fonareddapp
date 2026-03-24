import PersonnelLayout from '@/components/layout/PersonnelLayout';
import Pagination from '@/components/ui/Pagination';
import { formatDateTimeFR } from '@/lib/formatDate';
import { apiGet } from '@/lib/fetcher';
import { ArrowDownTrayIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
}

const ReportsPage: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setDate(1);
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

  const fetchRecords = async (
    page = currentPage,
    limit = itemsPerPage,
    filters?: {
      startTime?: string;
      endTime?: string;
      department?: string;
      name?: string;
      employee_no?: string;
    }
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters?.startTime)
        params.set('startTime', new Date(filters.startTime).toISOString());
      if (filters?.endTime)
        params.set('endTime', new Date(filters.endTime).toISOString());
      if (filters?.department) params.set('department', filters.department);
      if (filters?.name) params.set('name', filters.name);
      if (filters?.employee_no) params.set('employee_no', filters.employee_no);

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
    fetchRecords();
  }, []);

  const handleSearch = () => {
    setCurrentPage(1);
    fetchRecords(1, itemsPerPage, {
      startTime,
      endTime,
      department: department || undefined,
      name: name || undefined,
      employee_no: personId || undefined,
    });
  };

  const handleReset = () => {
    const d = new Date();
    const start = new Date(d);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    setStartTime(start.toISOString().slice(0, 16));
    setEndTime(end.toISOString().slice(0, 16));
    setDepartment('');
    setName('');
    setPersonId('');
    setCurrentPage(1);
    fetchRecords(1, itemsPerPage);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchRecords(page, itemsPerPage, {
      startTime,
      endTime,
      department: department || undefined,
      name: name || undefined,
      employee_no: personId || undefined,
    });
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
    fetchRecords(1, newItemsPerPage, {
      startTime,
      endTime,
      department: department || undefined,
      name: name || undefined,
      employee_no: personId || undefined,
    });
  };

  const formatTime = (timeStr: string) => formatDateTimeFR(timeStr);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Check-in':
      case 'Entrée':
        return 'bg-green-100 text-green-800';
      case 'Check-out':
      case 'Sortie':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
              Les rapports ci-dessous utilisent les événements déjà importés en base. Certains lecteurs (ex. DS-K1T) n’exposent pas l’API AcsEvent : dans ce cas les pointages ne peuvent pas être importés ici.
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
          <div className="flex gap-2">
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
                      ID personne
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nom
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Département
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Heure
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Statut présence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Point de contrôle
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Custom
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
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.attendanceStatus)}`}
                        >
                          {record.attendanceStatus}
                        </span>
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
