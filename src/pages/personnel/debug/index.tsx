import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { useToast } from '@/hooks/useToast';
import { apiGet } from '@/lib/fetcher';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

interface DiagnosticTest {
  name: string;
  success: boolean;
  message: string;
  error?: string;
  count?: number;
  data?: any;
  status?: number;
}

interface DiagnosticResult {
  config: {
    ip: string;
    username: string;
    port: number;
  };
  tests: DiagnosticTest[];
  summary: {
    connectivity: boolean;
    deviceInfo: boolean;
    events: boolean;
    users: boolean;
  };
}

const DebugPage: React.FC = () => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  const runDiagnostic = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        diagnostic: DiagnosticResult;
      }>('/api/hikvision/debug');

      if (response.success) {
        setDiagnostic(response.diagnostic);
        showSuccess('Diagnostic terminé');
      } else {
        showError('Erreur lors du diagnostic');
      }
    } catch (error: any) {
      console.error('Erreur lors du diagnostic:', error);
      showError('Erreur lors du diagnostic');
    } finally {
      setLoading(false);
    }
  };

  const testEndpoints = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{ success: boolean; results: any[] }>(
        '/api/hikvision/test-endpoints'
      );

      if (response.success) {
        console.log('Résultats des endpoints:', response.results);
        showSuccess(
          `Test des endpoints terminé - ${response.results.length} endpoints testés`
        );

        // Afficher les résultats dans la console pour debug
        response.results.forEach((result) => {
          console.log(
            `${result.success ? '✅' : '❌'} ${result.name}: ${result.status || 'ERROR'}`
          );
        });
      } else {
        showError('Erreur lors du test des endpoints');
      }
    } catch (error: any) {
      console.error('Erreur lors du test des endpoints:', error);
      showError('Erreur lors du test des endpoints');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (success: boolean) => {
    return success ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50';
  };

  const getStatusIcon = (success: boolean) => {
    return success ? '✅' : '❌';
  };

  return (
    <PersonnelLayout
      title="Diagnostic Lecteur"
      description="Diagnostic complet du lecteur Hikvision"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cog6ToothIcon className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Diagnostic Lecteur
                </h1>
                <p className="text-sm text-gray-600">
                  Diagnostic complet du lecteur Hikvision
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={runDiagnostic}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-200 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <span className="mr-2">🔍</span>
                )}
                {loading ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
              </button>

              <button
                onClick={testEndpoints}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <span className="mr-2">🧪</span>
                )}
                {loading ? 'Test en cours...' : 'Tester les endpoints'}
              </button>
            </div>
          </div>
        </div>

        {/* Résumé du diagnostic */}
        {diagnostic && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Résumé du diagnostic
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div
                className={`p-4 rounded-lg ${getStatusColor(diagnostic.summary.connectivity)}`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-2">
                    {getStatusIcon(diagnostic.summary.connectivity)}
                  </span>
                  <div>
                    <p className="font-medium">Connectivité</p>
                    <p className="text-sm">
                      {diagnostic.summary.connectivity ? 'OK' : 'Échec'}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`p-4 rounded-lg ${getStatusColor(diagnostic.summary.deviceInfo)}`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-2">
                    {getStatusIcon(diagnostic.summary.deviceInfo)}
                  </span>
                  <div>
                    <p className="font-medium">Infos Dispositif</p>
                    <p className="text-sm">
                      {diagnostic.summary.deviceInfo ? 'OK' : 'Échec'}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`p-4 rounded-lg ${getStatusColor(diagnostic.summary.events)}`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-2">
                    {getStatusIcon(diagnostic.summary.events)}
                  </span>
                  <div>
                    <p className="font-medium">Événements</p>
                    <p className="text-sm">
                      {diagnostic.summary.events ? 'Données' : 'Vide'}
                    </p>
                  </div>
                </div>
              </div>
              <div
                className={`p-4 rounded-lg ${getStatusColor(diagnostic.summary.users)}`}
              >
                <div className="flex items-center">
                  <span className="text-2xl mr-2">
                    {getStatusIcon(diagnostic.summary.users)}
                  </span>
                  <div>
                    <p className="font-medium">Utilisateurs</p>
                    <p className="text-sm">
                      {diagnostic.summary.users ? 'Données' : 'Vide'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration */}
        {diagnostic && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configuration actuelle
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Adresse IP</p>
                <p className="text-lg font-semibold text-gray-900">
                  {diagnostic.config.ip}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Utilisateur</p>
                <p className="text-lg font-semibold text-gray-900">
                  {diagnostic.config.username}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Port</p>
                <p className="text-lg font-semibold text-gray-900">
                  {diagnostic.config.port}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tests détaillés */}
        {diagnostic && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Tests détaillés
              </h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {diagnostic.tests.map((test, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <span className="text-xl mr-3">
                          {getStatusIcon(test.success)}
                        </span>
                        <h4 className="font-medium text-gray-900">
                          {test.name}
                        </h4>
                      </div>
                      {test.status && (
                        <span className="text-sm text-gray-500">
                          Status: {test.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{test.message}</p>
                    {test.error && (
                      <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        Erreur: {test.error}
                      </p>
                    )}
                    {test.count !== undefined && (
                      <p className="text-sm text-blue-600">
                        Nombre d'éléments: {test.count}
                      </p>
                    )}
                    {test.data && (
                      <details className="mt-2">
                        <summary className="text-sm text-gray-500 cursor-pointer">
                          Voir les données
                        </summary>
                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-auto max-h-32">
                          {JSON.stringify(test.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Instructions de débogage */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">
            Instructions de débogage
          </h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              <strong>Si la connectivité échoue :</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Vérifiez que l'IP est correcte (192.168.10.50)</li>
              <li>Vérifiez que le lecteur est sur le même réseau</li>
              <li>
                Vérifiez que l'authentification DIGEST est activée sur le
                lecteur
              </li>
            </ul>

            <p className="mt-4">
              <strong>Si les événements/utilisateurs sont vides :</strong>
            </p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Le lecteur peut ne pas avoir d'événements enregistrés</li>
              <li>Les endpoints peuvent être différents selon le modèle</li>
              <li>Vérifiez les permissions de l'utilisateur admin</li>
              <li>
                Testez manuellement avec curl :{' '}
                <code className="bg-yellow-100 px-1 rounded">
                  curl --digest -u admin:Fonaredd
                  http://192.168.10.50/ISAPI/AccessControl/AcsEvent
                </code>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default DebugPage;
