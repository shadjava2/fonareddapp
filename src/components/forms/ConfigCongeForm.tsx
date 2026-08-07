import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { apiGet } from '@/lib/fetcher';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import React, { useEffect, useState } from 'react';

interface ConfigCongeFormData {
  nbjourMois: number;
  congenonjustifie: number | '';
  fkSuperviseurPrincipal: number | null;
}

interface ConfigCongeFormProps {
  onSubmit: (data: {
    nbjourMois: number;
    congenonjustifie?: number;
    fkSuperviseurPrincipal?: number | null;
  }) => void;
  initialData?: {
    nbjourMois: number;
    congenonjustifie?: number | null;
    fkSuperviseurPrincipal?: number | null;
  };
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

const ConfigCongeForm: React.FC<ConfigCongeFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<ConfigCongeFormData>({
    nbjourMois: 0,
    congenonjustifie: '',
    fkSuperviseurPrincipal: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [utilisateurs, setUtilisateurs] = useState<
    Array<{ value: number; label: string }>
  >([]);

  useEffect(() => {
    (async () => {
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
            response
              .map((u) => {
                const userId = parseInt(u.id, 10);
                if (isNaN(userId)) return null;
                return {
                  value: userId,
                  label:
                    u.label ||
                    formatPersonDisplayName(u) ||
                    u.username ||
                    `User #${u.id}`,
                };
              })
              .filter(Boolean) as Array<{ value: number; label: string }>
          );
        }
      } catch (e) {
        console.warn('ConfigCongeForm users:', e);
      }
    })();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        nbjourMois: initialData.nbjourMois || 0,
        congenonjustifie:
          initialData.congenonjustifie === undefined ||
          initialData.congenonjustifie === null
            ? ''
            : Number(initialData.congenonjustifie),
        fkSuperviseurPrincipal:
          initialData.fkSuperviseurPrincipal != null
            ? Number(initialData.fkSuperviseurPrincipal)
            : null,
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof ConfigCongeFormData, value: string) => {
    if (field === 'congenonjustifie') {
      const t = value.trim();
      setFormData((prev) => ({
        ...prev,
        congenonjustifie: t === '' ? '' : parseFloat(t) || 0,
      }));
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: '' }));
      }
      return;
    }
    const numericValue = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      [field]: numericValue,
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

    if (!formData.nbjourMois || formData.nbjourMois <= 0) {
      newErrors.nbjourMois = 'Le nombre de jours par mois est requis';
    } else if (formData.nbjourMois > 31) {
      newErrors.nbjourMois = 'Le nombre de jours ne peut pas dépasser 31';
    } else if (formData.nbjourMois < 1) {
      newErrors.nbjourMois = 'Le nombre de jours doit être au moins 1';
    }

    if (formData.congenonjustifie !== '') {
      const nj = Number(formData.congenonjustifie);
      if (isNaN(nj) || nj < 0 || nj > 366) {
        newErrors.congenonjustifie =
          'Indiquez un nombre entre 0 et 366 (ou laissez vide)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit({
        nbjourMois: formData.nbjourMois,
        congenonjustifie:
          formData.congenonjustifie === ''
            ? undefined
            : formData.congenonjustifie,
        fkSuperviseurPrincipal: formData.fkSuperviseurPrincipal,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="nbjourMois"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nombre de jours de congé par mois{' '}
          <span className="text-red-500">*</span>
        </label>
        <Input
          id="nbjourMois"
          type="number"
          min="1"
          max="31"
          step="0.1"
          value={formData.nbjourMois || ''}
          onChange={(e) => handleChange('nbjourMois', e.target.value)}
          placeholder="Ex: 2.5"
          error={errors.nbjourMois}
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre de jours de congé accordés par mois (peut être décimal)
        </p>
      </div>

      <div>
        <label
          htmlFor="congenonjustifie"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Plafond jours non justifiés / an
        </label>
        <Input
          id="congenonjustifie"
          type="number"
          min="0"
          max="366"
          step="0.5"
          value={
            formData.congenonjustifie === ''
              ? ''
              : String(formData.congenonjustifie)
          }
          onChange={(e) => handleChange('congenonjustifie', e.target.value)}
          placeholder="Ex : 5"
          error={errors.congenonjustifie}
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre maximal de jours non justifiés par agent et par an (réinitialisé
          en janvier sur les soldes ; laisser vide si non utilisé).
        </p>
      </div>

      <div>
        <AutocompleteSelect
          label="Superviseur principal"
          placeholder="Rechercher un agent système..."
          options={utilisateurs}
          value={formData.fkSuperviseurPrincipal}
          onChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              fkSuperviseurPrincipal: value != null ? Number(value) : null,
            }));
          }}
        />
        <p className="mt-1 text-xs text-gray-500">
          Si distinct du superviseur de la demande : reçoit une copie email et
          peut laisser une observation optionnelle (non bloquante). Si identique
          : une seule notification / un seul acteur phase 3. Laisser vide =
          comportement actuel.
        </p>
      </div>

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
              <p>
                Cette configuration détermine le nombre de jours de congé
                accordés à chaque employé par mois. Cette valeur est utilisée
                pour calculer automatiquement les soldes de congé.
              </p>
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
          {loading ? 'Traitement...' : submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default ConfigCongeForm;
