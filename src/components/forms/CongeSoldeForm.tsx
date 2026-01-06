import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiGet } from '@/lib/fetcher';
import React, { useEffect, useState } from 'react';

interface CongeSoldeFormData {
  fkUtilisateur?: number;
  solde?: number;
  soldeConsomme?: number;
}

interface CongeSoldeFormProps {
  onSubmit: (data: CongeSoldeFormData) => void;
  initialData?: CongeSoldeFormData;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

interface User {
  id: string;
  nom: string;
  prenom: string;
  username: string;
  label: string;
}

const CongeSoldeForm: React.FC<CongeSoldeFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<CongeSoldeFormData>({
    fkUtilisateur: undefined,
    solde: undefined,
    soldeConsomme: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [utilisateurs, setUtilisateurs] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingSolde, setLoadingSolde] = useState(false);
  const [soldeRestant, setSoldeRestant] = useState<number | null>(null);

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await apiGet<Array<User>>(
          '/api/admin/users/autocomplete?q=&limit=200'
        );

        if (Array.isArray(response)) {
          const mappedUsers = response
            .map((u) => {
              const userId = parseInt(u.id);
              if (isNaN(userId)) {
                return null;
              }
              return {
                value: userId,
                label:
                  u.label ||
                  `${u.nom || ''} ${u.prenom || ''}`.trim() ||
                  u.username ||
                  '',
              };
            })
            .filter((u) => u !== null) as Array<{
            value: number;
            label: string;
          }>;

          setUtilisateurs(mappedUsers);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Charger le solde existant quand un utilisateur est sélectionné
  useEffect(() => {
    const fetchSolde = async () => {
      if (formData.fkUtilisateur) {
        try {
          setLoadingSolde(true);
          const response = await apiGet<{
            success: boolean;
            solde: {
              id: number | null;
              solde: number;
              soldeConsomme: number;
              soldeRestant: number;
            };
          }>(`/api/conge/solde?userId=${formData.fkUtilisateur}`);

          if (response.success && response.solde) {
            setFormData((prev) => ({
              ...prev,
              solde: response.solde.solde || 0,
              soldeConsomme: response.solde.soldeConsomme || 0,
            }));
            setSoldeRestant(response.solde.soldeRestant || 0);
          } else {
            // Pas de solde existant, initialiser à 0
            setFormData((prev) => ({
              ...prev,
              solde: 0,
              soldeConsomme: 0,
            }));
            setSoldeRestant(0);
          }
        } catch (error) {
          console.error('Erreur lors du chargement du solde:', error);
        } finally {
          setLoadingSolde(false);
        }
      } else {
        setSoldeRestant(null);
      }
    };

    fetchSolde();
  }, [formData.fkUtilisateur]);

  // Initialiser avec les données initiales
  useEffect(() => {
    if (initialData) {
      setFormData({
        fkUtilisateur: initialData.fkUtilisateur,
        solde: initialData.solde,
        soldeConsomme: initialData.soldeConsomme,
      });
    }
  }, [initialData]);

  // Calculer le solde restant quand solde ou soldeConsomme change
  useEffect(() => {
    if (formData.solde !== undefined && formData.soldeConsomme !== undefined) {
      const restant = formData.solde - formData.soldeConsomme;
      setSoldeRestant(restant);
    }
  }, [formData.solde, formData.soldeConsomme]);

  const handleChange = (field: keyof CongeSoldeFormData, value: any) => {
    if (field === 'fkUtilisateur') {
      setFormData((prev) => ({
        ...prev,
        [field]: value ? Number(value) : undefined,
        solde: undefined,
        soldeConsomme: undefined,
      }));
      setSoldeRestant(null);
    } else {
      const numericValue = value === '' ? undefined : parseFloat(value);
      setFormData((prev) => ({
        ...prev,
        [field]:
          numericValue !== undefined && !isNaN(numericValue)
            ? numericValue
            : undefined,
      }));
    }

    // Effacer l'erreur
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.fkUtilisateur) {
      newErrors.fkUtilisateur = "L'utilisateur est requis";
    }

    if (formData.solde === undefined || formData.solde === null) {
      newErrors.solde = 'Le solde est requis';
    } else if (formData.solde < 0) {
      newErrors.solde = 'Le solde ne peut pas être négatif';
    }

    if (
      formData.soldeConsomme === undefined ||
      formData.soldeConsomme === null
    ) {
      newErrors.soldeConsomme = 'Le solde consommé est requis';
    } else if (formData.soldeConsomme < 0) {
      newErrors.soldeConsomme = 'Le solde consommé ne peut pas être négatif';
    }

    if (
      formData.solde !== undefined &&
      formData.soldeConsomme !== undefined &&
      formData.soldeConsomme > formData.solde
    ) {
      newErrors.soldeConsomme =
        'Le solde consommé ne peut pas dépasser le solde total';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Utilisateur */}
      <div>
        <AutocompleteSelect
          label="Utilisateur"
          placeholder="Rechercher un utilisateur..."
          options={utilisateurs}
          value={formData.fkUtilisateur || null}
          onChange={(value) => handleChange('fkUtilisateur', value)}
          error={errors.fkUtilisateur}
          required
          disabled={loading || loadingUsers}
        />
        {loadingSolde && (
          <p className="mt-1 text-xs text-blue-600">Chargement du solde...</p>
        )}
      </div>

      {/* Solde total */}
      <div>
        <label
          htmlFor="solde"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Solde total (jours) <span className="text-red-500">*</span>
        </label>
        <Input
          id="solde"
          type="number"
          min="0"
          step="0.5"
          value={formData.solde !== undefined ? formData.solde : ''}
          onChange={(e) => handleChange('solde', e.target.value)}
          placeholder="Ex: 30"
          error={errors.solde}
          required
          disabled={loading || loadingSolde}
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre total de jours de congé disponibles
        </p>
      </div>

      {/* Solde consommé */}
      <div>
        <label
          htmlFor="soldeConsomme"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Solde consommé (jours) <span className="text-red-500">*</span>
        </label>
        <Input
          id="soldeConsomme"
          type="number"
          min="0"
          step="0.5"
          value={
            formData.soldeConsomme !== undefined ? formData.soldeConsomme : ''
          }
          onChange={(e) => handleChange('soldeConsomme', e.target.value)}
          placeholder="Ex: 5"
          error={errors.soldeConsomme}
          required
          disabled={loading || loadingSolde}
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre de jours de congé déjà utilisés
        </p>
      </div>

      {/* Solde restant (calculé automatiquement) */}
      {soldeRestant !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              Solde restant :
            </span>
            <span
              className={`text-lg font-bold ${
                soldeRestant >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {soldeRestant.toFixed(1)} jour{soldeRestant !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Boutons */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={loading || loadingUsers || loadingSolde}
        >
          {loading ? 'Enregistrement...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CongeSoldeForm;

