import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ModernSelect from '@/components/ui/ModernSelect';
import { apiGet } from '@/lib/fetcher';
import React, { useEffect, useState } from 'react';

interface UrgenceIndisponibiliteFormData {
  fkUtilisateur1?: number; // Agent indisponible
  fkUtilisateur2?: number; // Remplaçant
  observations?: string;
  du?: string; // Date début (obligatoire)
  au?: string; // Date fin (optionnelle)
  statut?: 'indisponible' | 'disponible';
}

interface UrgenceIndisponibiliteFormProps {
  onSubmit: (data: UrgenceIndisponibiliteFormData) => void;
  initialData?: UrgenceIndisponibiliteFormData;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

const UrgenceIndisponibiliteForm: React.FC<UrgenceIndisponibiliteFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<UrgenceIndisponibiliteFormData>({
    fkUtilisateur1: undefined,
    fkUtilisateur2: undefined,
    observations: '',
    du: '',
    au: '',
    statut: 'indisponible',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [utilisateurs, setUtilisateurs] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [canEditStatut, setCanEditStatut] = useState(false);

  // Charger les utilisateurs
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiGet<
          Array<{
            id: string;
            nom: string;
            prenom: string;
            username: string;
            label: string;
          }>
        >('/api/admin/users/autocomplete?q=&limit=200');
        if (Array.isArray(response)) {
          setUtilisateurs(
            response.map((u) => ({
              value: parseInt(u.id),
              label: u.label,
            }))
          );
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (initialData) {
      const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return dateStr;
        }
      };

      setFormData({
        fkUtilisateur1: initialData.fkUtilisateur1,
        fkUtilisateur2: initialData.fkUtilisateur2,
        observations: initialData.observations || '',
        du: formatDate(initialData.du),
        au: formatDate(initialData.au),
        statut: initialData.statut || 'indisponible',
      });

      // Si date fin n'est pas définie, on peut modifier le statut
      setCanEditStatut(!initialData.au);
    }
  }, [initialData]);

  // Mettre à jour canEditStatut quand la date fin change
  useEffect(() => {
    setCanEditStatut(!formData.au);
  }, [formData.au]);

  const handleChange = (
    field: keyof UrgenceIndisponibiliteFormData,
    value: string | number | undefined
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validation: utilisateur 1 (agent) obligatoire
    if (!formData.fkUtilisateur1) {
      newErrors.fkUtilisateur1 = "L'agent (utilisateur 1) est obligatoire";
    }

    // Validation: date début obligatoire
    if (!formData.du || formData.du.trim() === '') {
      newErrors.du = 'La date de début est obligatoire';
    }

    // Validation: date fin >= date début si définie
    if (formData.au && formData.du) {
      const dateDebut = new Date(formData.du);
      const dateFin = new Date(formData.au);
      if (dateFin < dateDebut) {
        newErrors.au =
          'La date de fin doit être supérieure ou égale à la date de début';
      }
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

  const statutOptions = [
    { value: 'indisponible', label: 'Indisponible' },
    { value: 'disponible', label: 'Disponible' },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Agent indisponible (Utilisateur 1) */}
      <div>
        <AutocompleteSelect
          label="Agent indisponible"
          placeholder="Rechercher un agent..."
          options={utilisateurs}
          value={formData.fkUtilisateur1 || null}
          onChange={(value) =>
            handleChange('fkUtilisateur1', value ? Number(value) : undefined)
          }
          error={errors.fkUtilisateur1}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Agent qui sera indisponible pendant la période d'urgence
        </p>
      </div>

      {/* Remplaçant (Utilisateur 2) */}
      <div>
        <AutocompleteSelect
          label="Remplaçant (optionnel)"
          placeholder="Rechercher un remplaçant..."
          options={utilisateurs}
          value={formData.fkUtilisateur2 || null}
          onChange={(value) =>
            handleChange('fkUtilisateur2', value ? Number(value) : undefined)
          }
        />
        <p className="mt-1 text-xs text-gray-500">
          Agent qui remplacera pendant la période d'urgence (optionnel)
        </p>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="du"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date de début <span className="text-red-500">*</span>
          </label>
          <Input
            id="du"
            type="date"
            value={formData.du || ''}
            onChange={(e) => handleChange('du', e.target.value)}
            error={errors.du}
            required
          />
        </div>
        <div>
          <label
            htmlFor="au"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Date de fin (optionnelle)
          </label>
          <Input
            id="au"
            type="date"
            value={formData.au || ''}
            onChange={(e) => handleChange('au', e.target.value)}
            error={errors.au}
          />
          <p className="mt-1 text-xs text-gray-500">
            Si non définie, vous pourrez modifier le statut manuellement. Si
            définie, le scheduler passera automatiquement le statut à
            "disponible" une fois la date passée.
          </p>
        </div>
      </div>

      {/* Statut */}
      <div>
        <label
          htmlFor="statut"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Statut
          {!canEditStatut && (
            <span className="ml-2 text-xs text-gray-500">
              (sera géré automatiquement par le scheduler si date fin définie)
            </span>
          )}
        </label>
        <ModernSelect
          options={statutOptions}
          value={formData.statut || null}
          onChange={(value) =>
            handleChange(
              'statut',
              value as 'indisponible' | 'disponible' | undefined
            )
          }
          placeholder="Sélectionnez un statut"
          disabled={!canEditStatut && !!formData.au}
        />
        {!canEditStatut && formData.au && (
          <p className="mt-1 text-xs text-blue-600">
            ⚠️ Le statut ne peut pas être modifié manuellement car une date de
            fin est définie. Il sera automatiquement passé à "disponible" par le
            scheduler une fois la date passée.
          </p>
        )}
        {canEditStatut && (
          <p className="mt-1 text-xs text-gray-500">
            Vous pouvez modifier le statut manuellement car aucune date de fin
            n'est définie.
          </p>
        )}
      </div>

      {/* Observations */}
      <div>
        <label
          htmlFor="observations"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Observations
        </label>
        <textarea
          id="observations"
          value={formData.observations || ''}
          onChange={(e) => handleChange('observations', e.target.value)}
          placeholder="Observations sur l'indisponibilité d'urgence..."
          rows={4}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            errors.observations
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : ''
          }`}
        />
        {errors.observations && (
          <p className="mt-1 text-sm text-red-600">{errors.observations}</p>
        )}
      </div>

      {/* Information box */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Information</h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>La date de début est obligatoire.</li>
                <li>La date de fin est optionnelle.</li>
                <li>
                  Si la date de fin n'est pas définie, vous pouvez modifier le
                  statut manuellement.
                </li>
                <li>
                  Si la date de fin est définie, le scheduler passera
                  automatiquement le statut à "disponible" une fois la date
                  passée.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
        <Button type="submit" variant="primary" loading={loading}>
          {loading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Traitement...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
};

export default UrgenceIndisponibiliteForm;
