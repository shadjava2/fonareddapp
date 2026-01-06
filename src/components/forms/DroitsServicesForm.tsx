import React, { useEffect, useState } from 'react';

interface DroitsServicesFormData {
  fkUtilisateur: number | null;
  fkService: number | null;
}

interface User {
  id: number;
  nom: string;
  prenom: string;
  username: string;
}

interface Service {
  id: number;
  designation: string;
  site?: {
    id: number;
    designation: string;
  };
}

interface DroitsServicesFormProps {
  onSubmit: (data: DroitsServicesFormData) => void;
  initialData?: DroitsServicesFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
  users: User[];
  services: Service[];
}

const DroitsServicesForm: React.FC<DroitsServicesFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
  users,
  services,
}) => {
  const [formData, setFormData] = useState<DroitsServicesFormData>({
    fkUtilisateur: null,
    fkService: null,
  });

  const [errors, setErrors] = useState<Partial<DroitsServicesFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value ? Number(value) : null,
    }));

    if (errors[name as keyof DroitsServicesFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<DroitsServicesFormData> = {};

    if (!formData.fkUtilisateur) {
      newErrors.fkUtilisateur = "L'utilisateur est requis";
    }

    if (!formData.fkService) {
      newErrors.fkService = 'Le service est requis';
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
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Utilisateur
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          name="fkUtilisateur"
          value={formData.fkUtilisateur || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.fkUtilisateur ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        >
          <option value="">Sélectionnez un utilisateur</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.nom} {user.prenom} ({user.username})
            </option>
          ))}
        </select>
        {errors.fkUtilisateur && (
          <p className="mt-1 text-sm text-red-600">{errors.fkUtilisateur}</p>
        )}
      </div>

      {/* Service */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Service
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          name="fkService"
          value={formData.fkService || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.fkService ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        >
          <option value="">Sélectionnez un service</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.designation}
              {service.site && ` - ${service.site.designation}`}
            </option>
          ))}
        </select>
        {errors.fkService && (
          <p className="mt-1 text-sm text-red-600">{errors.fkService}</p>
        )}
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

export default DroitsServicesForm;
