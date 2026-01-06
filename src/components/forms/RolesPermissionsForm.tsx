import React, { useEffect, useState } from 'react';

interface RolesPermissionsFormData {
  fkRole: number | null;
  fkPermission: number | null;
}

interface Role {
  id: number;
  nom: string;
}

interface Permission {
  id: number;
  nom: string;
  description: string;
}

interface RolesPermissionsFormProps {
  onSubmit: (data: RolesPermissionsFormData) => void;
  initialData?: RolesPermissionsFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
  roles: Role[];
  permissions: Permission[];
}

const RolesPermissionsForm: React.FC<RolesPermissionsFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
  roles,
  permissions,
}) => {
  const [formData, setFormData] = useState<RolesPermissionsFormData>({
    fkRole: null,
    fkPermission: null,
  });

  const [errors, setErrors] = useState<Partial<RolesPermissionsFormData>>({});

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

    if (errors[name as keyof RolesPermissionsFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<RolesPermissionsFormData> = {};

    if (!formData.fkRole) {
      newErrors.fkRole = 'Le rôle est requis';
    }

    if (!formData.fkPermission) {
      newErrors.fkPermission = 'La permission est requise';
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
      {/* Rôle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rôle
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          name="fkRole"
          value={formData.fkRole || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
            errors.fkRole ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        >
          <option value="">Sélectionnez un rôle</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.nom}
            </option>
          ))}
        </select>
        {errors.fkRole && (
          <p className="mt-1 text-sm text-red-600">{errors.fkRole}</p>
        )}
      </div>

      {/* Permission */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permission
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          name="fkPermission"
          value={formData.fkPermission || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 ${
            errors.fkPermission ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={loading}
        >
          <option value="">Sélectionnez une permission</option>
          {permissions.map((permission) => (
            <option key={permission.id} value={permission.id}>
              {permission.nom} - {permission.description}
            </option>
          ))}
        </select>
        {errors.fkPermission && (
          <p className="mt-1 text-sm text-red-600">{errors.fkPermission}</p>
        )}
      </div>

      {/* Boutons */}
      <div className="flex justify-end space-x-3">
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

export default RolesPermissionsForm;



