import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import React, { useEffect, useState } from 'react';

interface ConfigCongeFormData {
  nbjourMois: number;
}

interface ConfigCongeFormProps {
  onSubmit: (data: ConfigCongeFormData) => void;
  initialData?: ConfigCongeFormData;
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
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        nbjourMois: initialData.nbjourMois || 0,
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof ConfigCongeFormData, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setFormData((prev) => ({
      ...prev,
      [field]: numericValue,
    }));

    // Effacer l'erreur quand l'utilisateur commence à taper
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
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          title="Imprimer le formulaire"
        >
          <svg
            className="h-5 w-5 mr-2"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Imprimer
        </button>
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

export default ConfigCongeForm;
