import { useEffect, useState } from 'react';

const DebugApiPage: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      console.log("🔍 Debug - Test direct de l'API...");

      // Test direct avec fetch
      const response = await fetch('/api/admin/services', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('🔍 Debug - Response status:', response.status);
      console.log('🔍 Debug - Response headers:', response.headers);

      const data = await response.json();
      console.log('🔍 Debug - Response data:', data);

      setResult({
        status: response.status,
        data: data,
        success: data.success,
        servicesCount: data.services?.length || 0,
        services: data.services,
      });
    } catch (error) {
      console.error('❌ Debug - Erreur:', error);
      setResult({
        error: error,
        message: "Erreur lors du test de l'API",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testApi();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Debug API</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test API Direct</h2>
            <button
              onClick={testApi}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Test en cours...' : 'Tester API'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Test en cours...</p>
            </div>
          ) : result ? (
            <div className="space-y-4">
              <div className="bg-gray-100 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Résultat du test :</h3>
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>

              {result.services && result.services.length > 0 && (
                <div className="bg-green-100 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">
                    ✅ Services trouvés ({result.services.length})
                  </h3>
                  <div className="space-y-2">
                    {result.services.map((service: any, index: number) => (
                      <div key={index} className="text-sm text-green-700">
                        {service.designation} (ID: {service.id})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Cliquez sur "Tester API" pour commencer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DebugApiPage;


