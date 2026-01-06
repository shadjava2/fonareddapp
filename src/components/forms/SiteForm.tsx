import React, { useEffect, useState } from 'react';

interface SiteFormData {
  designation: string;
  abbreviation: string;
  adresse: string;
}

interface SiteFormProps {
  onSubmit: (data: SiteFormData) => void;
  initialData?: SiteFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
}

const SiteForm: React.FC<SiteFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<SiteFormData>({
    designation: '',
    abbreviation: '',
    adresse: '',
  });

  const [errors, setErrors] = useState<Partial<SiteFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Effacer l'erreur pour ce champ
    if (errors[name as keyof SiteFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<SiteFormData> = {};

    if (!formData.designation.trim()) {
      newErrors.designation = 'La désignation du site est requise';
    }

    if (formData.designation.trim().length < 2) {
      newErrors.designation =
        'La désignation doit contenir au moins 2 caractères';
    }

    if (
      formData.abbreviation.trim().length > 0 &&
      formData.abbreviation.trim().length < 2
    ) {
      newErrors.abbreviation =
        "L'abréviation doit contenir au moins 2 caractères";
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
      {/* Désignation du site */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Désignation du site
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          name="designation"
          value={formData.designation}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            errors.designation ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: DIRECTION GENERALE, KISANGANI, etc."
          disabled={loading}
        />
        {errors.designation && (
          <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
        )}
      </div>

      {/* Abréviation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Abréviation
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="text"
          name="abbreviation"
          value={formData.abbreviation}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            errors.abbreviation ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: DG, KSI, etc."
          disabled={loading}
        />
        {errors.abbreviation && (
          <p className="mt-1 text-sm text-red-600">{errors.abbreviation}</p>
        )}
      </div>

      {/* Adresse */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Adresse
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="text"
          name="adresse"
          value={formData.adresse}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            errors.adresse ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: KISANGANI, Avenue de la Paix, etc."
          disabled={loading}
        />
        {errors.adresse && (
          <p className="mt-1 text-sm text-red-600">{errors.adresse}</p>
        )}
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Informations</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• La désignation doit être unique</p>
          <p>• L'abréviation est optionnelle mais recommandée</p>
          <p>• Les dates de création/modification sont automatiques</p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
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
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
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

export default SiteForm;
