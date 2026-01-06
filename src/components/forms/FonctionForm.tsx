import React, { useEffect, useState } from 'react';

interface FonctionFormData {
  nom: string;
  description: string;
}

interface FonctionFormProps {
  onSubmit: (data: FonctionFormData) => void;
  initialData?: FonctionFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
}

const FonctionForm: React.FC<FonctionFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<FonctionFormData>({
    nom: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<FonctionFormData>>({});

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
    if (errors[name as keyof FonctionFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<FonctionFormData> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom de la fonction est requis';
    }

    if (formData.nom.trim().length < 2) {
      newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }

    if (formData.description.trim().length < 3) {
      newErrors.description =
        'La description doit contenir au moins 3 caractères';
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
      {/* Nom de la fonction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom de la fonction
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          name="nom"
          value={formData.nom}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.nom ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Ex: DIRECTEUR, SECRETAIRE, etc."
          disabled={loading}
        />
        {errors.nom && (
          <p className="mt-1 text-sm text-red-600">{errors.nom}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
          <span className="text-red-500 ml-1">*</span>
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.description ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Description de la fonction et de ses responsabilités"
          disabled={loading}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Informations</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Le nom de la fonction doit être unique</p>
          <p>• La description doit être claire et précise</p>
          <p>• Les dates de création/modification sont automatiques</p>
        </div>
      </div>

      {/* Boutons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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

export default FonctionForm;
