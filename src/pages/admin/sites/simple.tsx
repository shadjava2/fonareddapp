import { apiGet } from '@/lib/fetcher';
import { useEffect, useState } from 'react';

interface Site {
  id: number | string;
  designation: string;
  abbreviation?: string;
  adresse?: string;
  datecreate: string;
  dateupdate: string;
  usercreateid?: number | string;
  userupdateid?: number | string;
}

const SimpleSitesPage: React.FC = () => {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Simple - Début du chargement des sites...');

      const response = await apiGet<{
        success: boolean;
        sites: Site[];
      }>('/api/admin/sites');

      console.log('🔍 Simple - Réponse complète:', response);
      console.log('🔍 Simple - response.success:', response.success);
      console.log('🔍 Simple - response.sites:', response.sites);
      console.log('🔍 Simple - typeof response.sites:', typeof response.sites);
      console.log(
        '🔍 Simple - Array.isArray(response.sites):',
        Array.isArray(response.sites)
      );

      if (response && response.success && response.sites) {
        console.log('🔍 Simple - Sites trouvés:', response.sites.length);
        setSites(response.sites);
      } else {
        console.error('❌ Simple - Pas de sites dans la réponse');
        setError('Pas de sites dans la réponse');
      }
    } catch (error) {
      console.error('❌ Simple - Erreur:', error);
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Sites Simple</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Liste des Sites
            </h2>
            <button
              onClick={fetchSites}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Recharger
            </button>
          </div>

          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Chargement...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-500">Erreur: {error}</p>
            </div>
          ) : sites.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-500">Aucun site trouvé.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {sites.length} site(s) trouvé(s)
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Désignation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Abréviation
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Adresse
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sites.map((site) => (
                      <tr key={site.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {site.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {site.designation}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {site.abbreviation || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {site.adresse || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SimpleSitesPage;
