import React, { useEffect, useState } from 'react';

interface UserFormData {
  nom: string;
  postnom?: string;
  prenom?: string;
  username: string;
  mail?: string;
  phone?: string;
  fkFonction?: number | null;
  fkRole?: number | null;
}

interface Role {
  id: number | string;
  nom: string;
}

interface Fonction {
  id: number | string;
  nom: string;
}

interface UserFormProps {
  onSubmit: (data: UserFormData) => void;
  initialData?: UserFormData;
  submitLabel?: string;
  onCancel: () => void;
  loading?: boolean;
  roles: Role[];
  fonctions?: Fonction[];
}

const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Enregistrer',
  onCancel,
  loading = false,
  roles = [],
  fonctions = [],
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    nom: '',
    postnom: '',
    prenom: '',
    username: '',
    mail: '',
    phone: '',
    fkFonction: null,
    fkRole: null,
  });

  const [errors, setErrors] = useState<Partial<UserFormData>>({});

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]:
        name === 'fkRole' || name === 'fkFonction'
          ? value
            ? Number(value)
            : null
          : type === 'checkbox'
            ? checked
            : value,
    }));

    // Effacer l'erreur pour ce champ
    if (errors[name as keyof UserFormData]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UserFormData> = {};

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
    }

    if (formData.nom.trim().length < 2) {
      newErrors.nom = 'Le nom doit contenir au moins 2 caractères';
    }

    if (!formData.username.trim()) {
      newErrors.username = "Le nom d'utilisateur est requis";
    } else if (formData.username.trim().length < 3) {
      newErrors.username =
        "Le nom d'utilisateur doit contenir au moins 3 caractères";
    }

    if (
      formData.mail &&
      formData.mail.trim() &&
      !/\S+@\S+\.\S+/.test(formData.mail)
    ) {
      newErrors.mail = "L'email n'est pas valide";
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
      {/* Nom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom
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
          placeholder="Entrez le nom"
          disabled={loading}
        />
        {errors.nom && (
          <p className="mt-1 text-sm text-red-600">{errors.nom}</p>
        )}
      </div>

      {/* Postnom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Postnom
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="text"
          name="postnom"
          value={formData.postnom || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Entrez le postnom"
          disabled={loading}
        />
      </div>

      {/* Prénom */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prénom
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="text"
          name="prenom"
          value={formData.prenom || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Entrez le prénom"
          disabled={loading}
        />
      </div>

      {/* Nom d'utilisateur */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nom d'utilisateur
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.username ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Entrez le nom d'utilisateur"
          disabled={loading}
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">{errors.username}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="email"
          name="mail"
          value={formData.mail || ''}
          onChange={handleChange}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.mail ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Entrez l'email"
          disabled={loading}
        />
        {errors.mail && (
          <p className="mt-1 text-sm text-red-600">{errors.mail}</p>
        )}
      </div>

      {/* Téléphone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Téléphone
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Entrez le numéro de téléphone"
          disabled={loading}
        />
      </div>

      {/* Fonction */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Fonction
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <select
          name="fkFonction"
          value={formData.fkFonction || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">Sélectionnez une fonction (optionnel)</option>
          {fonctions.map((fonction) => (
            <option key={fonction.id} value={Number(fonction.id)}>
              {fonction.nom}
            </option>
          ))}
        </select>
        {fonctions.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">
            Aucune fonction disponible.
          </p>
        )}
      </div>

      {/* Rôle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rôle
          <span className="text-gray-400 ml-1">(optionnel)</span>
        </label>
        <select
          name="fkRole"
          value={formData.fkRole || ''}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={loading}
        >
          <option value="">Sélectionnez un rôle (optionnel)</option>
          {roles.map((role) => (
            <option key={role.id} value={Number(role.id)}>
              {role.nom}
            </option>
          ))}
        </select>
        {roles.length === 0 && (
          <p className="mt-1 text-sm text-gray-500">Aucun rôle disponible.</p>
        )}
      </div>

      {/* Informations supplémentaires */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Informations</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>• Le nom d'utilisateur doit être unique</p>
          <p>• Le prénom et postnom sont optionnels</p>
          <p>• Le rôle et la fonction peuvent être assignés plus tard</p>
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

export default UserForm;
