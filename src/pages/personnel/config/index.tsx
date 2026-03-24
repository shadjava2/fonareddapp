import PersonnelLayout from '@/components/layout/PersonnelLayout';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost } from '@/lib/fetcher';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

interface HikvisionConfig {
  ip: string;
  username: string;
  password: string;
  port: number;
  timezone_offset_minutes?: number | null;
}

const TIMEZONE_OPTIONS: { value: number; label: string }[] = [
  { value: -480, label: '(GMT-08:00) Pacific Time (US, Canada, Mexico)' },
  { value: -420, label: '(GMT-07:00) Mountain Time' },
  { value: -360, label: '(GMT-06:00) Central Time' },
  { value: -300, label: '(GMT-05:00) Eastern Time' },
  { value: 0, label: '(GMT+00:00) UTC' },
  { value: 60, label: '(GMT+01:00) Amsterdam, Berlin, Rome, Paris' },
  { value: 120, label: '(GMT+02:00) Bruxelles, Kinshasa' },
  { value: 180, label: '(GMT+03:00) Moscow, Nairobi' },
];

const ConfigPage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [config, setConfig] = useState<HikvisionConfig>({
    ip: '192.168.10.50',
    username: 'admin',
    password: '',
    port: 80,
    timezone_offset_minutes: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        config: HikvisionConfig;
      }>('/api/hikvision/config');

      if (response.success && response.config) {
        const c = response.config as HikvisionConfig;
        setConfig({
          ...c,
          timezone_offset_minutes: c.timezone_offset_minutes ?? null,
        });
        console.log('✅ Configuration récupérée:', response.config);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement de la configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await apiPost<{ success: boolean; message: string }>(
        '/api/hikvision/config',
        config
      );

      if (response.success) {
        showSuccess('Configuration sauvegardée avec succès');
        await fetchConfig();
        window.dispatchEvent(new CustomEvent('personnel:config-updated'));
      } else {
        showError(response.message || 'Erreur lors de la sauvegarde');
      }
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);

      // Tester d'abord la synchronisation DIGEST
      const syncResponse = await apiGet<{ success: boolean; device: any }>(
        '/api/hikvision/sync'
      );

      if (syncResponse.success && syncResponse.device?.status === 'online') {
        showSuccess('Connexion DIGEST réussie ! Le lecteur est accessible');

        // Essayer de récupérer des événements pour vérifier l'accès complet
        try {
          const eventsResponse = await apiGet<{
            success: boolean;
            events: any[];
          }>('/api/hikvision/events-digest');

          if (eventsResponse.success) {
            showSuccess(
              `Connexion complète réussie ! ${eventsResponse.events?.length || 0} événements disponibles`
            );
          }
        } catch (eventsError) {
          console.log(
            '⚠️ Connexion OK mais événements non accessibles:',
            eventsError
          );
          showSuccess(
            'Connexion de base réussie ! (Événements non accessibles)'
          );
        }
      } else {
        showError(
          "Le lecteur n'est pas accessible. Vérifiez les paramètres et l'authentification DIGEST."
        );
      }
    } catch (error: any) {
      console.error('Erreur lors du test de connexion:', error);
      showError('Erreur lors du test de connexion DIGEST');
    } finally {
      setTesting(false);
    }
  };

  const handleInputChange = (
    field: keyof HikvisionConfig,
    value: string | number | null
  ) => {
    setConfig((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <PersonnelLayout
      title="Configuration Lecteur"
      description="Configuration de la connexion au lecteur Hikvision"
    >
      <div className="space-y-6">
        {/* En-tête */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Cog6ToothIcon className="h-8 w-8 text-orange-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Configuration Lecteur
                </h1>
                <p className="text-sm text-gray-600">
                  Configuration de la connexion au lecteur Hikvision
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
              >
                {testing ? 'Test en cours...' : 'Tester la connexion'}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire de configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">
            Paramètres de connexion
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">
                Chargement de la configuration...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="ip"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Adresse IP du lecteur *
                </label>
                <input
                  type="text"
                  id="ip"
                  value={config.ip}
                  onChange={(e) => handleInputChange('ip', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="192.168.10.50"
                />
              </div>

              <div>
                <label
                  htmlFor="port"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Port
                </label>
                <input
                  type="number"
                  id="port"
                  value={config.port}
                  onChange={(e) =>
                    handleInputChange('port', parseInt(e.target.value) || 80)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="80"
                />
              </div>

              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nom d'utilisateur *
                </label>
                <input
                  type="text"
                  id="username"
                  value={config.username}
                  onChange={(e) =>
                    handleInputChange('username', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="admin"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Mot de passe *
                </label>
                <input
                  type="password"
                  id="password"
                  value={config.password}
                  onChange={(e) =>
                    handleInputChange('password', e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Mot de passe du lecteur"
                />
              </div>

              <div className="md:col-span-2">
                <label
                  htmlFor="timezone"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fuseau horaire du lecteur (aligné sur Time Settings)
                </label>
                <select
                  id="timezone"
                  value={config.timezone_offset_minutes ?? ''}
                  onChange={(e) =>
                    handleInputChange(
                      'timezone_offset_minutes',
                      e.target.value === '' ? null : parseInt(e.target.value, 10)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Même que le serveur</option>
                  {TIMEZONE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Choisir le même fuseau que dans Configuration → System → Time Settings du lecteur. Les dates envoyées (startTime/endTime) seront alignées dessus.
                </p>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={fetchConfig}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition duration-200 disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* Informations de connexion */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Informations de connexion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-800">
                Adresse IP actuelle :
              </span>
              <span className="ml-2 text-blue-600">{config.ip}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Port :</span>
              <span className="ml-2 text-blue-600">{config.port}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">Utilisateur :</span>
              <span className="ml-2 text-blue-600">{config.username}</span>
            </div>
            <div>
              <span className="font-medium text-blue-800">
                URL de connexion :
              </span>
              <span className="ml-2 text-blue-600">
                http://{config.ip}:{config.port}
              </span>
            </div>
            <div>
              <span className="font-medium text-blue-800">
                Fuseau lecteur (Time Settings) :
              </span>
              <span className="ml-2 text-blue-600">
                {config.timezone_offset_minutes != null
                  ? TIMEZONE_OPTIONS.find((o) => o.value === config.timezone_offset_minutes)?.label ?? `UTC${config.timezone_offset_minutes >= 0 ? '+' : ''}${config.timezone_offset_minutes / 60}`
                  : 'Même que le serveur'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">
            Instructions
          </h3>
          <div className="text-sm text-yellow-800 space-y-2">
            <p>
              1. <strong>Connectez-vous au lecteur Hikvision</strong> via votre
              navigateur à l'adresse{' '}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                http://{config.ip}
                {config.port !== 80 ? `:${config.port}` : ''}
              </code>
            </p>
            <p>
              2. <strong>Vérifiez les identifiants</strong> par défaut sont
              généralement{' '}
              <code className="bg-yellow-100 px-2 py-1 rounded">
                admin/admin
              </code>
            </p>
            <p>
              3. <strong>Configurez les paramètres réseau</strong> si nécessaire
              dans les paramètres du lecteur
            </p>
            <p>
              4. <strong>Testez la connexion</strong> avec le bouton "Tester la
              connexion" ci-dessus
            </p>
          </div>
        </div>
      </div>
    </PersonnelLayout>
  );
};

export default ConfigPage;
