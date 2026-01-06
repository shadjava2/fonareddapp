import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ModernSelect from '@/components/ui/ModernSelect';
import { apiGet } from '@/lib/fetcher';
import React, { useEffect, useState } from 'react';

interface RetourCongeFormData {
  fkDemande?: number;
  fkUtilisateur?: number;
  fkSoldes?: number;
  observations?: string;
  nbrjour?: number;
}

interface DemandeApprouvee {
  id: number;
  demandeur?: string;
  du?: string;
  au?: string;
  nbrjour?: number;
  section?: string;
}

interface RetourCongeFormProps {
  onSubmit: (data: RetourCongeFormData) => void;
  initialData?: RetourCongeFormData;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
}

const RetourCongeForm: React.FC<RetourCongeFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState<RetourCongeFormData>({
    fkDemande: undefined,
    fkUtilisateur: undefined,
    fkSoldes: undefined,
    observations: '',
    nbrjour: undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [demandesApprouvees, setDemandesApprouvees] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [loadingSolde, setLoadingSolde] = useState(false);

  // Charger les utilisateurs au chargement
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

  // Charger le solde (fkSoldes) quand un utilisateur est sélectionné
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

          if (response.success && response.solde && response.solde.id) {
            setFormData((prev) => ({
              ...prev,
              fkSoldes: response.solde.id || undefined,
            }));
            console.log(
              `✅ Solde chargé pour l'utilisateur ${formData.fkUtilisateur}: fkSoldes=${response.solde.id}`
            );
          } else {
            console.warn(
              `⚠️ Aucun solde trouvé pour l'utilisateur ${formData.fkUtilisateur}`
            );
            setFormData((prev) => ({
              ...prev,
              fkSoldes: undefined,
            }));
          }
        } catch (error) {
          console.error('Erreur lors du chargement du solde:', error);
          setFormData((prev) => ({
            ...prev,
            fkSoldes: undefined,
          }));
        } finally {
          setLoadingSolde(false);
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          fkSoldes: undefined,
        }));
      }
    };
    fetchSolde();
  }, [formData.fkUtilisateur]);

  // Charger les demandes approuvées au chargement
  useEffect(() => {
    const fetchDemandesApprouvees = async () => {
      try {
        setLoadingDemandes(true);
        const response = await apiGet<{
          success: boolean;
          demandes: DemandeApprouvee[];
        }>('/api/conge/demandes?limit=1000');

        if (response.success && Array.isArray(response.demandes)) {
          // Filtrer uniquement les demandes avec statut APPROUVEE
          const approuvees = response.demandes.filter(
            (d: any) => d.statut === 'APPROUVEE'
          );

          // Formater pour le select : "ID - Demandeur (Du Au) - Section"
          const options = approuvees.map((demande) => {
            const demandeurStr = demande.demandeur || 'Non spécifié';
            // Extraire le nom si format "ID | nom"
            const demandeurNom = demandeurStr.includes('|')
              ? demandeurStr.split('|')[1]?.trim() || demandeurStr
              : demandeurStr;

            const duStr = demande.du
              ? new Date(demande.du).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '';
            const auStr = demande.au
              ? new Date(demande.au).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '';
            const periode =
              duStr && auStr ? `${duStr} - ${auStr}` : duStr || auStr;
            const section = demande.section || '';

            let label = `${demandeurNom}`;
            if (periode) {
              label += ` (${periode})`;
            }
            if (section) {
              label += ` - ${section}`;
            }

            return {
              value: Number(demande.id),
              label: label,
            };
          });

          setDemandesApprouvees(options);
          console.log(
            `✅ ${options.length} demande(s) approuvée(s) chargée(s) pour le retour de congé`
          );
        }
      } catch (error) {
        console.error(
          'Erreur lors du chargement des demandes approuvées:',
          error
        );
      } finally {
        setLoadingDemandes(false);
      }
    };

    fetchDemandesApprouvees();
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        fkDemande: initialData.fkDemande,
        fkUtilisateur: initialData.fkUtilisateur,
        fkSoldes: initialData.fkSoldes,
        observations: initialData.observations || '',
        nbrjour: initialData.nbrjour,
      });
    }
  }, [initialData]);

  const handleChange = (
    field: keyof RetourCongeFormData,
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

    // Validation obligatoire: utilisateur
    if (!formData.fkUtilisateur) {
      newErrors.fkUtilisateur = "L'utilisateur est obligatoire";
    }

    // Validation obligatoire: fkSoldes (doit être chargé)
    if (!formData.fkSoldes) {
      if (formData.fkUtilisateur) {
        newErrors.fkUtilisateur =
          "Aucun solde trouvé pour cet utilisateur. Veuillez en créer un d'abord.";
      }
    }

    // Validation obligatoire: demande
    if (!formData.fkDemande) {
      newErrors.fkDemande = 'La demande de congé est obligatoire';
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
      {/* Utilisateur - Pour récupérer fkSoldes */}
      <div>
        <label
          htmlFor="fkUtilisateur"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Utilisateur <span className="text-red-500">*</span>
        </label>
        <AutocompleteSelect
          label=""
          placeholder="Rechercher un utilisateur..."
          options={utilisateurs}
          value={formData.fkUtilisateur || null}
          onChange={(value) => {
            const userId = value ? Number(value) : undefined;
            setFormData((prev) => ({
              ...prev,
              fkUtilisateur: userId,
              fkSoldes: undefined, // Réinitialiser car le solde sera rechargé
            }));
          }}
          error={errors.fkUtilisateur}
          required
        />
        {loadingSolde && (
          <p className="mt-1 text-xs text-blue-600">
            Chargement du solde de congé...
          </p>
        )}
        {formData.fkSoldes && !loadingSolde && (
          <p className="mt-1 text-xs text-green-600">
            ✓ Solde trouvé (ID: {formData.fkSoldes})
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Sélectionnez l'utilisateur pour récupérer automatiquement son solde de
          congé
        </p>
      </div>

      {/* Demande de congé approuvée */}
      <div>
        <label
          htmlFor="fkDemande"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Demande de congé approuvée <span className="text-red-500">*</span>
        </label>
        {loadingDemandes ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="animate-spin h-4 w-4 text-indigo-600"
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
            Chargement des demandes approuvées...
          </div>
        ) : demandesApprouvees.length === 0 ? (
          <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-md p-3">
            Aucune demande approuvée disponible
          </div>
        ) : (
          <ModernSelect
            options={demandesApprouvees}
            value={formData.fkDemande || null}
            onChange={(value) =>
              handleChange('fkDemande', value ? Number(value) : undefined)
            }
            placeholder="Sélectionnez une demande approuvée"
            error={errors.fkDemande}
            required
            searchable
          />
        )}
        <p className="mt-1 text-xs text-gray-500">
          Seules les demandes avec le statut "APPROUVEE" sont affichées
        </p>
      </div>

      {/* Nombre de jours */}
      <div>
        <label
          htmlFor="nbrjour"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Nombre de jours retournés
        </label>
        <Input
          id="nbrjour"
          type="number"
          step="1"
          min="0"
          value={formData.nbrjour || ''}
          onChange={(e) =>
            handleChange(
              'nbrjour',
              e.target.value ? parseInt(e.target.value, 10) : undefined
            )
          }
          placeholder="Ex: 2"
        />
        <p className="mt-1 text-xs text-gray-500">
          Nombre de jours de congé retournés (optionnel)
        </p>
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
          placeholder="Observations sur le retour de congé..."
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
        <p className="mt-1 text-xs text-gray-500">
          Détails sur le retour de congé (optionnel)
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
                Vous pouvez créer un retour de congé uniquement pour les
                demandes ayant le statut "APPROUVEE". Le nombre de jours
                retournés et les observations sont optionnels.
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

export default RetourCongeForm;
