import React, { useEffect, useState } from 'react';

interface Site {
  id: number | string;
  designation: string;
  abbreviation?: string;
}

interface ServiceFormData {
  designation: string;
  fkSite?: number | null;
}

interface ServiceFormProps {
  onSubmit: (data: ServiceFormData) => void;
  initialData?: ServiceFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
  sites?: Site[];
}

const ServiceForm: React.FC<ServiceFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
  sites = [],
}) => {
  const [formData, setFormData] = useState<ServiceFormData>({
    designation: '',
    fkSite: null,
  });

  const [errors, setErrors] = useState<Partial<ServiceFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  useEffect(() => {
    console.log('🔍 ServiceForm - Sites reçus:', sites);
    console.log('🔍 ServiceForm - Nombre de sites:', sites.length);
  }, [sites]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'fkSite' ? (value ? Number(value) : null) : value,
    }));

    // Effacer l'erreur pour ce champ
    if (errors[name as keyof ServiceFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ServiceFormData> = {};

    if (!formData.designation.trim()) {
      newErrors.designation = 'La désignation du service est requise';
    }

    if (formData.designation.trim().length < 2) {
      newErrors.designation =
        'La désignation doit contenir au moins 2 caractères';
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
      {/* Désignation du service */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Désignation du service
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          name="designation"
          value={formData.designation}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
            errors.designation ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: PERSONNEL, PLANNING, REPORTING, etc."
          disabled={loading}
        />
        {errors.designation && (
          <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
        )}
      </div>

      {/* Site associé */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Site associé
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <select
          name="fkSite"
          value={formData.fkSite || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
            errors.fkSite ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        >
          <option value="">Sélectionner un site (optionnel)</option>
          {sites.map((site) => (
            <option key={site.id} value={Number(site.id)}>
              {site.designation} {site.abbreviation && `(${site.abbreviation})`}
            </option>
          ))}
        </select>
        {errors.fkSite && (
          <p className="mt-1 text-sm text-red-600">{errors.fkSite}</p>
        )}
        {sites.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Aucun site disponible. Le service sera créé sans site associé.
          </p>
        )}
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Informations</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• La désignation doit être unique</p>
          <p>• Le site peut être assigné plus tard</p>
          <p>• Les dates de création/modification sont automatiques</p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
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
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enregistrement...
            </div>
          ) : (
            submitLabel
          )}
        </button>
      </div>
    </form>
  );
};

export default ServiceForm;
