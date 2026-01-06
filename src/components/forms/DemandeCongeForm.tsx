import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ModernSelect from '@/components/ui/ModernSelect';
import { apiGet } from '@/lib/fetcher';
import React, { useEffect, useRef, useState } from 'react';

// Styles pour le placeholder du contentEditable
const contentEditableStyles = `
  [contenteditable][data-placeholder]:empty:before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }
`;

interface DemandeCongeFormData {
  fkTypeConge?: number;
  du: string; // Date de début
  au: string; // Date de fin
  nbrjour?: number;
  soldeconge?: number;
  soldeConsomme?: number;
  section?: string;
  demandeur?: string; // Nom complet de l'utilisateur (nom + prénom)
  remiseetreprise?: string;
  nomsremplacant?: string;
  idremplacant?: number; // ID utilisateur pour remplaçant
  statut?: string;
  niveau?: number;
  fkSoldes?: string;
  idSuperviseur?: number; // ID utilisateur pour superviseur (phase 3)
}

// Interface locale pour gérer l'ID du demandeur (non envoyé à l'API)
interface LocalFormState {
  fkDemandeurId?: number; // ID temporaire pour charger le solde uniquement
}

interface TypeConge {
  id: number;
  nom: string;
}

interface CalendrierEntry {
  id: number;
  d: string;
  label?: string;
}

interface DemandeCongeFormProps {
  onSubmit: (data: DemandeCongeFormData) => void;
  initialData?: DemandeCongeFormData;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  typesConges?: TypeConge[];
}

const STATUT_OPTIONS = [
  { value: 'BROUILLON', label: 'Brouillon' },
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'EN_COURS', label: 'En cours' },
  { value: 'A_VALIDER', label: 'À valider' },
  { value: 'A_APPROUVER', label: 'À approuver' },
  { value: 'APPROUVEE', label: 'Approuvée' },
  { value: 'REFUSEE', label: 'Refusée' },
  { value: 'ANNULEE', label: 'Annulée' },
];

const DemandeCongeForm: React.FC<DemandeCongeFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Sauvegarder',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
  typesConges = [],
}) => {
  const [formData, setFormData] = useState<DemandeCongeFormData>({
    du: '',
    au: '',
    statut: 'BROUILLON',
    niveau: 0, // Toujours 0, masqué dans le formulaire
  });
  const [localState, setLocalState] = useState<LocalFormState>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [calendrierDates, setCalendrierDates] = useState<CalendrierEntry[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [utilisateurs, setUtilisateurs] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [loadingSolde, setLoadingSolde] = useState(false);
  const remiseEditorRef = useRef<HTMLDivElement>(null);
  const [isRemiseFocused, setIsRemiseFocused] = useState(false);
  const [isRemiseInitialized, setIsRemiseInitialized] = useState(false);

  // Charger les dates du calendrier au chargement
  useEffect(() => {
    const fetchCalendrier = async () => {
      try {
        const response = await apiGet<{
          success: boolean;
          calendrier: CalendrierEntry[];
        }>('/api/conge/calendrier?limit=1000');
        if (response.success) {
          setCalendrierDates(response.calendrier || []);
        }
      } catch (error) {
        console.error('Erreur lors du chargement du calendrier:', error);
      }
    };
    fetchCalendrier();
  }, []);

  // Initialiser le contenu de l'éditeur seulement au chargement initial
  // Ne pas utiliser dangerouslySetInnerHTML après, pour permettre la saisie normale
  useEffect(() => {
    if (remiseEditorRef.current && !isRemiseInitialized) {
      if (initialData?.remiseetreprise) {
        remiseEditorRef.current.innerHTML = initialData.remiseetreprise || '';
      } else {
        remiseEditorRef.current.innerHTML = '';
      }
      setIsRemiseInitialized(true);
    }
  }, [initialData?.remiseetreprise, isRemiseInitialized]);

  // Mettre à jour le contenu seulement si on change de demande (mode édition)
  useEffect(() => {
    if (
      remiseEditorRef.current &&
      isRemiseInitialized &&
      initialData?.remiseetreprise
    ) {
      // Ne mettre à jour que si le contenu a vraiment changé (éviter les boucles)
      const currentContent = remiseEditorRef.current.innerHTML.trim();
      const newContent = (initialData.remiseetreprise || '').trim();
      if (currentContent !== newContent && !isRemiseFocused) {
        remiseEditorRef.current.innerHTML = newContent;
      }
    }
  }, [initialData?.remiseetreprise, isRemiseInitialized, isRemiseFocused]);

  // Charger les utilisateurs pour autocomplete (charger tous au démarrage)
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        console.log('🔍 Chargement des utilisateurs pour les combos...');
        const response = await apiGet<
          Array<{
            id: string;
            nom: string;
            prenom: string;
            username: string;
            label: string;
          }>
        >('/api/admin/users/autocomplete?q=&limit=200');

        console.log('🔍 Réponse API utilisateurs:', response);

        if (Array.isArray(response)) {
          const mappedUsers = response
            .map((u) => {
              const userId = parseInt(u.id);
              if (isNaN(userId)) {
                console.warn('⚠️ ID utilisateur invalide:', u.id);
                return null;
              }
              return {
                value: userId,
                label:
                  u.label ||
                  `${u.nom || ''} ${u.prenom || ''}`.trim() ||
                  u.username ||
                  '',
              };
            })
            .filter((u) => u !== null) as Array<{
            value: number;
            label: string;
          }>;

          console.log('✅ Utilisateurs mappés:', mappedUsers.length);
          if (mappedUsers.length > 0) {
            console.log('🔍 Premier utilisateur mappé:', mappedUsers[0]);
          }

          setUtilisateurs(mappedUsers);
        } else {
          console.error("❌ Réponse API n'est pas un tableau:", response);
          setUtilisateurs([]);
        }
      } catch (error: any) {
        console.error('❌ Erreur lors du chargement des utilisateurs:', error);
        console.error("❌ Détails de l'erreur:", error.message, error.stack);
        setUtilisateurs([]);
      }
    };
    fetchUsers();
  }, []);

  // Mettre à jour les combos quand les utilisateurs sont chargés (après initialData)
  useEffect(() => {
    if (utilisateurs.length === 0) return;

    // Mettre à jour le remplaçant si présent dans formData
    if (formData.idremplacant !== undefined && formData.idremplacant !== null) {
      const foundRemplacant = utilisateurs.find(
        (u) => u.value === Number(formData.idremplacant)
      );
      if (foundRemplacant) {
        setFormData((prev) => ({
          ...prev,
          idremplacant: foundRemplacant.value,
          nomsremplacant: foundRemplacant.label,
        }));
      }
    }

    // Mettre à jour le superviseur si présent dans formData
    if (
      formData.idSuperviseur !== undefined &&
      formData.idSuperviseur !== null
    ) {
      const foundSuperviseur = utilisateurs.find(
        (u) => u.value === Number(formData.idSuperviseur)
      );
      if (foundSuperviseur) {
        setFormData((prev) => ({
          ...prev,
          idSuperviseur: foundSuperviseur.value,
        }));
      }
    }

    // Mettre à jour le demandeur si présent dans formData mais pas encore trouvé
    if (localState.fkDemandeurId && formData.demandeur) {
      const foundDemandeur = utilisateurs.find(
        (u) => u.value === Number(localState.fkDemandeurId)
      );
      if (foundDemandeur && !formData.demandeur.includes('|')) {
        setFormData((prev) => ({
          ...prev,
          demandeur: `${foundDemandeur.value} | ${foundDemandeur.label}`,
        }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [utilisateurs]);

  // Charger le solde depuis congesolde quand le demandeur est sélectionné
  // fkUtilisateur dans congesolde = ID du demandeur
  useEffect(() => {
    const fetchSolde = async () => {
      if (localState.fkDemandeurId) {
        try {
          setLoadingSolde(true);
          console.log(
            '📊 Chargement du solde pour fkUtilisateur (demandeur):',
            localState.fkDemandeurId
          );

          // Charger depuis l'API qui interroge la table congesolde avec fkUtilisateur = ID du demandeur
          const response = await apiGet<{
            success: boolean;
            solde: {
              id: number | null; // ID du congesolde pour fkSoldes
              solde: number; // Solde total depuis congesolde.solde
              soldeConsomme: number; // Solde consommé depuis congesolde.soldeConsomme
              soldeRestant: number; // Solde restant calculé (solde - soldeConsomme)
            };
          }>(`/api/conge/solde?userId=${localState.fkDemandeurId}`);

          console.log('📊 Réponse API solde:', response);

          if (response.success && response.solde) {
            // Charger directement les valeurs depuis congesolde
            // solde = congesolde.solde (solde total)
            // soldeConsomme = congesolde.soldeConsomme (solde consommé)
            // fkSoldes = ID du congesolde (string)
            setFormData((prev) => ({
              ...prev,
              soldeconge: response.solde.solde, // Solde total depuis congesolde.solde
              soldeConsomme: response.solde.soldeConsomme, // Solde consommé depuis congesolde.soldeConsomme
              fkSoldes: response.solde.id
                ? String(response.solde.id)
                : undefined, // ID du congesolde pour fkSoldes
            }));

            console.log('✅ Solde chargé depuis congesolde:', {
              id: response.solde.id,
              fkUtilisateur: localState.fkDemandeurId,
              solde: response.solde.solde,
              soldeConsomme: response.solde.soldeConsomme,
              soldeRestant: response.solde.soldeRestant,
              fkSoldes: response.solde.id
                ? String(response.solde.id)
                : undefined,
            });
          } else {
            console.warn(
              '⚠️ Aucun solde trouvé pour fkUtilisateur:',
              localState.fkDemandeurId
            );
          }
        } catch (error) {
          console.error(
            '❌ Erreur lors du chargement du solde depuis congesolde:',
            error
          );
        } finally {
          setLoadingSolde(false);
        }
      } else {
        // Réinitialiser le solde si aucun demandeur n'est sélectionné
        setFormData((prev) => ({
          ...prev,
          soldeconge: undefined,
          soldeConsomme: undefined,
          fkSoldes: undefined,
        }));
      }
    };
    fetchSolde();
  }, [localState.fkDemandeurId]);

  useEffect(() => {
    if (initialData) {
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return dateStr;
        }
      };

      // Initialiser formData d'abord
      const newFormData: DemandeCongeFormData = {
        fkTypeConge: initialData.fkTypeConge,
        du: formatDate(initialData.du || ''),
        au: formatDate(initialData.au || ''),
        nbrjour: initialData.nbrjour,
        soldeconge: initialData.soldeconge,
        section: initialData.section || '',
        demandeur: initialData.demandeur || '',
        remiseetreprise: initialData.remiseetreprise || '',
        nomsremplacant: initialData.nomsremplacant || '',
        statut: initialData.statut || 'BROUILLON',
        niveau: 0, // Toujours 0
        fkSoldes: initialData.fkSoldes || '',
        idSuperviseur: initialData.idSuperviseur,
        idremplacant: initialData.idremplacant,
      };

      setFormData(newFormData);

      // Parser et charger le demandeur (même si utilisateurs pas encore chargés, extraire l'ID pour le solde)
      if (initialData.demandeur) {
        const demandeurStr = initialData.demandeur.trim();
        let demandeurId: number | undefined;

        // Extraire l'ID du format "id | nom"
        if (demandeurStr.includes('|')) {
          const parts = demandeurStr.split('|').map((p) => p.trim());
          const idPart = parts[0];
          const parsedId = parseInt(idPart, 10);
          if (!isNaN(parsedId)) {
            demandeurId = parsedId;
          }
        }

        // Charger le solde immédiatement si on a l'ID (pas besoin d'attendre utilisateurs)
        if (demandeurId) {
          setLocalState((prev) => ({
            ...prev,
            fkDemandeurId: demandeurId,
          }));
        }

        // Si utilisateurs sont chargés, mettre à jour le combo
        if (utilisateurs.length > 0) {
          let foundDemandeur;
          if (demandeurId) {
            foundDemandeur = utilisateurs.find((u) => u.value === demandeurId);
          }

          // Si pas trouvé par ID, chercher par nom
          if (!foundDemandeur && demandeurStr) {
            const demandeurNormalized = demandeurStr.toLowerCase();
            foundDemandeur = utilisateurs.find((user) => {
              const userLabelNormalized = user.label.trim().toLowerCase();
              return (
                userLabelNormalized === demandeurNormalized ||
                userLabelNormalized.includes(demandeurNormalized) ||
                demandeurNormalized.includes(userLabelNormalized)
              );
            });
          }

          if (foundDemandeur) {
            setLocalState((prev) => ({
              ...prev,
              fkDemandeurId: foundDemandeur.value,
            }));
            setFormData((prev) => ({
              ...prev,
              demandeur: `${foundDemandeur.value} | ${foundDemandeur.label}`,
            }));
          }
        }
      }

      // Charger et sélectionner le remplaçant si présent
      if (
        initialData.idremplacant !== undefined &&
        initialData.idremplacant !== null
      ) {
        if (utilisateurs.length > 0) {
          const foundRemplacant = utilisateurs.find(
            (user) => user.value === Number(initialData.idremplacant)
          );
          if (foundRemplacant) {
            setFormData((prev) => ({
              ...prev,
              idremplacant: Number(initialData.idremplacant),
              nomsremplacant: foundRemplacant.label,
            }));
          }
        } else {
          // Si utilisateurs pas encore chargés, juste définir l'ID
          setFormData((prev) => ({
            ...prev,
            idremplacant: Number(initialData.idremplacant),
          }));
        }
      }

      // Charger et sélectionner le superviseur si présent
      if (
        initialData.idSuperviseur !== undefined &&
        initialData.idSuperviseur !== null
      ) {
        if (utilisateurs.length > 0) {
          const foundSuperviseur = utilisateurs.find(
            (user) => user.value === Number(initialData.idSuperviseur)
          );
          if (foundSuperviseur) {
            setFormData((prev) => ({
              ...prev,
              idSuperviseur: Number(initialData.idSuperviseur),
            }));
          }
        } else {
          // Si utilisateurs pas encore chargés, juste définir l'ID
          setFormData((prev) => ({
            ...prev,
            idSuperviseur: Number(initialData.idSuperviseur),
          }));
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData, utilisateurs]);

  // Calculer la date de fin à partir de la durée et de la date de début
  useEffect(() => {
    if (formData.du && formData.nbrjour && formData.nbrjour > 0) {
      calculateDateFin();
    } else {
      setFormData((prev) => ({ ...prev, au: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.du, formData.nbrjour, calendrierDates]);

  // Fonction pour vérifier si une date est dans le calendrier (même jour/mois, année différente OK)
  const isDateInCalendrier = (date: Date): boolean => {
    const dateMonth = date.getMonth() + 1; // 1-12
    const dateDay = date.getDate();

    return calendrierDates.some((entry) => {
      try {
        const calDate = new Date(entry.d);
        const calMonth = calDate.getMonth() + 1;
        const calDay = calDate.getDate();
        return calMonth === dateMonth && calDay === dateDay;
      } catch {
        return false;
      }
    });
  };

  // Fonction pour calculer la date de fin en excluant samedi, dimanche et dates du calendrier
  const calculateDateFin = () => {
    if (!formData.du || !formData.nbrjour || formData.nbrjour <= 0) {
      return;
    }

    try {
      setCalculating(true);
      const dateDebut = new Date(formData.du);
      if (isNaN(dateDebut.getTime())) {
        return;
      }

      let currentDate = new Date(dateDebut);
      let joursComptes = 0;
      const joursDemandes = Math.ceil(formData.nbrjour);

      // Avancer jour par jour jusqu'à avoir le nombre de jours demandés
      while (joursComptes < joursDemandes) {
        const jourSemaine = currentDate.getDay(); // 0 = dimanche, 6 = samedi

        // Vérifier si c'est un jour ouvrable (pas samedi ni dimanche)
        if (jourSemaine !== 0 && jourSemaine !== 6) {
          // Vérifier si la date n'est pas dans le calendrier
          if (!isDateInCalendrier(currentDate)) {
            joursComptes++;
          }
        }

        // Si on n'a pas encore assez de jours, avancer d'un jour
        if (joursComptes < joursDemandes) {
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      // Formater la date de fin
      const dateFinStr = currentDate.toISOString().split('T')[0];
      setFormData((prev) => ({ ...prev, au: dateFinStr }));
    } catch (error) {
      console.error('Erreur lors du calcul de la date de fin:', error);
    } finally {
      setCalculating(false);
    }
  };

  const handleChange = (
    field: keyof DemandeCongeFormData,
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

    // Validation obligatoire: nombre de jours
    if (!formData.nbrjour || formData.nbrjour <= 0) {
      newErrors.nbrjour =
        'Le nombre de jours est obligatoire et doit être supérieur à 0';
    }

    // Validation obligatoire: date de début
    if (!formData.du || formData.du.trim() === '') {
      newErrors.du = 'La date de début est obligatoire';
    }

    // Validation obligatoire: date de fin
    if (!formData.au || formData.au.trim() === '') {
      if (formData.du && formData.nbrjour && formData.nbrjour > 0) {
        newErrors.au = 'Calcul de la date de fin en cours...';
      } else {
        newErrors.au = 'La date de fin est obligatoire';
      }
    }

    // Validation obligatoire: section
    if (!formData.section || formData.section.trim() === '') {
      newErrors.section = 'La section est obligatoire';
    } else if (formData.section.length > 255) {
      newErrors.section = 'La section ne peut pas dépasser 255 caractères';
    }

    // Validation obligatoire: demandeur
    if (!formData.demandeur || formData.demandeur.trim() === '') {
      newErrors.demandeur = 'Le demandeur est obligatoire';
    } else if (formData.demandeur.length > 255) {
      newErrors.demandeur = 'Le demandeur ne peut pas dépasser 255 caractères';
    }

    // Validation obligatoire: type de congé
    if (!formData.fkTypeConge) {
      newErrors.fkTypeConge = 'Le type de congé est obligatoire';
    }

    // Validation obligatoire: remplaçant
    if (!formData.idremplacant) {
      newErrors.idremplacant = 'Le remplaçant est obligatoire';
    }

    // Validation obligatoire: superviseur
    if (!formData.idSuperviseur) {
      newErrors.idSuperviseur = 'Le superviseur est obligatoire';
    }

    if (formData.nomsremplacant && formData.nomsremplacant.length > 255) {
      newErrors.nomsremplacant =
        'Le nom du remplaçant ne peut pas dépasser 255 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Récupérer le contenu HTML de l'éditeur de texte enrichi
    if (remiseEditorRef.current) {
      const content = remiseEditorRef.current.innerHTML;
      setFormData((prev) => ({ ...prev, remiseetreprise: content }));
    }

    if (validateForm()) {
      // S'assurer que le statut est toujours BROUILLON et niveau toujours 0
      const finalData = {
        ...formData,
        statut: 'BROUILLON',
        niveau: 0,
      };
      onSubmit(finalData);
    }
  };

  return (
    <>
      <style>{contentEditableStyles}</style>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type de congé */}
        <div>
          <label
            htmlFor="fkTypeConge"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Type de congé <span className="text-red-500">*</span>
          </label>
          <ModernSelect
            options={typesConges.map((type) => ({
              value: type.id,
              label: type.nom,
            }))}
            value={formData.fkTypeConge || null}
            onChange={(value) =>
              handleChange('fkTypeConge', value ? Number(value) : undefined)
            }
            placeholder="Sélectionnez un type de congé"
            error={errors.fkTypeConge}
            required
          />
        </div>

        {/* Nombre de jours - EN PREMIER */}
        <div>
          <label
            htmlFor="nbrjour"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nombre de jours <span className="text-red-500">*</span>
          </label>
          <Input
            id="nbrjour"
            type="number"
            step="0.5"
            min="0.5"
            value={formData.nbrjour || ''}
            onChange={(e) =>
              handleChange(
                'nbrjour',
                e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
            placeholder="Ex: 5"
            error={errors.nbrjour}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Durée du congé (samedis, dimanches et jours fériés exclus)
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
              value={formData.du}
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
              Date de fin <span className="text-red-500">*</span>
              {calculating && (
                <span className="ml-2 text-xs text-blue-600">(calcul...)</span>
              )}
            </label>
            <Input
              id="au"
              type="date"
              value={formData.au}
              onChange={(e) => handleChange('au', e.target.value)}
              error={errors.au}
              required
              readOnly
              className="bg-gray-50 cursor-not-allowed"
            />
            {formData.au && formData.du && formData.nbrjour && (
              <p className="mt-1 text-xs text-blue-600">
                Calculée automatiquement en excluant samedis, dimanches et jours
                fériés
              </p>
            )}
          </div>
        </div>

        {/* Solde de congé - Chargé depuis congesolde avec fkUtilisateur = ID du demandeur */}
        {localState.fkDemandeurId && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solde total (congesolde.solde)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.soldeconge ?? 0}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
              />
              {loadingSolde && (
                <p className="mt-1 text-xs text-blue-600">
                  Chargement depuis congesolde (fkUtilisateur=
                  {localState.fkDemandeurId})...
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Solde total depuis congesolde où fkUtilisateur ={' '}
                {localState.fkDemandeurId}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Solde consommé (congesolde.soldeConsomme)
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={formData.soldeConsomme ?? 0}
                readOnly
                className="bg-gray-50 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-500">
                Solde consommé depuis congesolde où fkUtilisateur ={' '}
                {localState.fkDemandeurId}
              </p>
            </div>
          </div>
        )}

        {/* Section */}
        <div>
          <label
            htmlFor="section"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Section <span className="text-red-500">*</span>
          </label>
          <Input
            id="section"
            type="text"
            value={formData.section || ''}
            onChange={(e) => handleChange('section', e.target.value)}
            placeholder="Ex: Direction, RH, etc."
            error={errors.section}
            maxLength={255}
            required
          />
        </div>

        {/* Demandeur - Autocomplete */}
        <div>
          <AutocompleteSelect
            label="Demandeur"
            placeholder="Rechercher un utilisateur..."
            options={utilisateurs}
            value={localState.fkDemandeurId || null}
            onChange={(value) => {
              const userId = value ? Number(value) : undefined;
              const selectedUser = utilisateurs.find((u) => u.value === userId);
              // Mettre à jour l'ID local pour charger le solde
              setLocalState((prev) => ({
                ...prev,
                fkDemandeurId: userId,
              }));
              // Enregistrer au format "id | nom" pour pouvoir récupérer l'ID plus tard
              setFormData((prev) => ({
                ...prev,
                demandeur: selectedUser
                  ? `${selectedUser.value} | ${selectedUser.label}`
                  : '',
              }));
            }}
            error={errors.demandeur}
            required
          />
        </div>

        {/* Remplaçant - Autocomplete */}
        <div>
          <AutocompleteSelect
            label="Remplaçant"
            placeholder="Rechercher un utilisateur..."
            options={utilisateurs}
            value={formData.idremplacant || null}
            onChange={(value) => {
              const userId = value ? Number(value) : undefined;
              const selectedUser = utilisateurs.find((u) => u.value === userId);
              setFormData((prev) => ({
                ...prev,
                idremplacant: userId,
                nomsremplacant: selectedUser ? selectedUser.label : '',
              }));
            }}
            error={errors.idremplacant || errors.nomsremplacant}
            required
          />
        </div>

        {/* Remise et reprise - Texte enrichi */}
        <div>
          <label
            htmlFor="remiseetreprise"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Remise et reprise
          </label>
          <div className="border border-gray-300 rounded-lg shadow-sm overflow-hidden transition-all duration-200 hover:border-gray-400 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-opacity-20">
            {/* Barre d'outils améliorée */}
            <div className="flex items-center gap-1 p-2.5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('bold', false, undefined);
                  remiseEditorRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm font-bold border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm active:scale-95"
                title="Gras (Ctrl+B)"
                onMouseDown={(e) => e.preventDefault()}
              >
                B
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('italic', false, undefined);
                  remiseEditorRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm italic border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm active:scale-95"
                title="Italique (Ctrl+I)"
                onMouseDown={(e) => e.preventDefault()}
              >
                I
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('underline', false, undefined);
                  remiseEditorRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm underline border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm active:scale-95"
                title="Souligné (Ctrl+U)"
                onMouseDown={(e) => e.preventDefault()}
              >
                U
              </button>
              <div className="w-px h-6 bg-gray-300 mx-1.5"></div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('insertUnorderedList', false, undefined);
                  remiseEditorRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm active:scale-95"
                title="Liste à puces"
                onMouseDown={(e) => e.preventDefault()}
              >
                •
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  document.execCommand('insertOrderedList', false, undefined);
                  remiseEditorRef.current?.focus();
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 hover:border-gray-400 transition-all duration-150 shadow-sm active:scale-95"
                title="Liste numérotée"
                onMouseDown={(e) => e.preventDefault()}
              >
                1.
              </button>
            </div>
            {/* Zone d'édition */}
            <div
              ref={remiseEditorRef}
              contentEditable
              onInput={(e) => {
                const content = e.currentTarget.innerHTML;
                handleChange('remiseetreprise', content);
              }}
              onFocus={(e) => {
                setIsRemiseFocused(true);
                const element = e.currentTarget;
                // Nettoyer le contenu vide au focus
                if (
                  !element.innerHTML ||
                  element.innerHTML === '<br>' ||
                  element.innerHTML.trim() === ''
                ) {
                  element.innerHTML = '';
                }
                // S'assurer que le curseur est bien positionné pour la saisie à gauche
                setTimeout(() => {
                  const selection = window.getSelection();
                  const range = document.createRange();

                  // Positionner le curseur au début si vide, sinon à la fin
                  if (
                    !element.textContent ||
                    element.textContent.trim() === ''
                  ) {
                    range.setStart(element, 0);
                    range.collapse(true);
                  } else {
                    // Trouver le dernier nœud texte et positionner le curseur dedans
                    const walker = document.createTreeWalker(
                      element,
                      NodeFilter.SHOW_TEXT,
                      null
                    );
                    let lastTextNode = null;
                    let node;
                    while ((node = walker.nextNode())) {
                      lastTextNode = node;
                    }

                    if (lastTextNode && lastTextNode.textContent) {
                      range.setStart(
                        lastTextNode,
                        lastTextNode.textContent.length
                      );
                    } else {
                      range.setStart(element, element.childNodes.length);
                    }
                    range.collapse(true);
                  }

                  selection?.removeAllRanges();
                  selection?.addRange(range);
                }, 0);
              }}
              onBlur={(e) => {
                setIsRemiseFocused(false);
                const element = e.currentTarget;
                // Normaliser le contenu mais ne pas le vider
                if (element.innerHTML === '<br>') {
                  element.innerHTML = '';
                }
              }}
              onKeyDown={(e) => {
                // Permettre la saisie normale - pas d'interférence
                if (e.key === 'Enter' && !e.shiftKey) {
                  // Entrée crée une nouvelle ligne normalement
                  return;
                }
              }}
              className={`min-h-[180px] max-h-[400px] overflow-y-auto p-4 bg-white text-gray-900 focus:outline-none cursor-text ${
                isRemiseFocused ? 'ring-2 ring-indigo-500 ring-opacity-20' : ''
              }`}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                textAlign: 'left',
                lineHeight: '1.6',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
              data-placeholder="Détails sur la remise et reprise de service..."
              suppressContentEditableWarning={true}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 bg-indigo-400 rounded-full"></span>
            Utilisez les outils de formatage pour enrichir votre texte
          </p>
        </div>

        {/* Statut - Toujours BROUILLON, non éditable */}
        <div>
          <label
            htmlFor="statut"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Statut
          </label>
          <Input
            id="statut"
            type="text"
            value="Brouillon"
            readOnly
            className="bg-gray-50 cursor-not-allowed"
          />
          <input type="hidden" name="statut" value="BROUILLON" />
        </div>

        {/* Superviseur - Phase 3 */}
        <div>
          <AutocompleteSelect
            label="Superviseur"
            placeholder="Rechercher un superviseur..."
            options={utilisateurs}
            value={formData.idSuperviseur || null}
            onChange={(value) => {
              const userId = value ? Number(value) : undefined;
              setFormData((prev) => ({
                ...prev,
                idSuperviseur: userId,
              }));
            }}
            error={errors.idSuperviseur}
            required
          />
          <p className="mt-1 text-xs text-gray-500">
            Superviseur responsable de l'approbation (Phase 3){' '}
            <span className="text-red-500">*</span>
          </p>
        </div>

        {/* Niveau - Toujours 0, masqué */}
        <input type="hidden" name="niveau" value="0" />

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
                  Saisissez d'abord le nombre de jours, puis la date de début.
                  La date de fin sera calculée automatiquement en excluant les
                  samedis, dimanches et les jours fériés du calendrier (même
                  jour et mois, quelle que soit l'année).
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
    </>
  );
};

export default DemandeCongeForm;
