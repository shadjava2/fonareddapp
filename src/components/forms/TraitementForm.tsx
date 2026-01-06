import Button from '@/components/ui/Button';
import { ButtonWithProgress } from '@/components/ui/ButtonWithProgress';
import {
  FormProgressIndicator,
  StatusBadge,
} from '@/components/ui/FormProgressIndicator';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface TraitementFormData {
  fkDemande?: number;
  fkPhase?: number;
  observations?: string;
  conformite?: boolean;
  approbation?: boolean;
}

interface TraitementFormProps {
  onSubmit: (data: TraitementFormData) => void;
  initialData?: TraitementFormData;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  loading?: boolean;
  demandes?: Array<{ id: number; label: string }>;
  phases?: Array<{ id: number; designation: string }>;
  readOnly?: boolean; // Mode lecture seule (pas de création)
}

const TraitementForm: React.FC<TraitementFormProps> = ({
  onSubmit,
  initialData,
  submitLabel = 'Traiter',
  cancelLabel = 'Annuler',
  onCancel,
  loading = false,
  demandes = [],
  phases = [],
  readOnly = false,
}) => {
  const [formData, setFormData] = useState<TraitementFormData>({
    fkDemande: initialData?.fkDemande,
    fkPhase: initialData?.fkPhase,
    observations: initialData?.observations || '',
    conformite: initialData?.conformite ?? undefined,
    approbation: initialData?.approbation ?? undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formProgress, setFormProgress] = useState(0);
  const [savingStatus, setSavingStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  useEffect(() => {
    if (initialData) {
      setFormData({
        fkDemande: initialData.fkDemande,
        fkPhase: initialData.fkPhase,
        observations: initialData.observations || '',
        conformite: initialData.conformite ?? undefined,
        approbation: initialData.approbation ?? undefined,
      });
    }
  }, [initialData]);

  // Fonctions helper pour afficher les labels
  const getDemandeLabel = (fkDemande?: number) => {
    if (!fkDemande) return 'Non définie';
    const demande = demandes.find((d) => d.id === fkDemande);
    return demande?.label || `Demande #${fkDemande}`;
  };

  const getPhaseLabel = (fkPhase?: number) => {
    if (!fkPhase) return 'Non définie';
    const phase = phases.find((p) => p.id === fkPhase);
    // Toujours retourner la désignation, jamais le numéro
    if (phase?.designation) {
      return phase.designation;
    }
    // Fallback : mapper les IDs aux désignations connues
    const designationMap: Record<number, string> = {
      1: 'REMPLACANT(E)',
      2: 'ADMINISTRATION',
      3: 'VISA SUPERVISEUR',
      4: 'APPROBATION COORDINA',
      5: 'APPROBATION COORDINA',
    };
    return designationMap[fkPhase] || 'Phase inconnue';
  };

  const handleChange = (
    field: keyof TraitementFormData,
    value: string | number | boolean | undefined
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

    // Calculer la progression du formulaire
    const filledFields = [
      formData.observations,
      formData.conformite !== undefined,
      formData.approbation !== undefined,
    ].filter(Boolean).length;
    const newProgress = Math.min(100, (filledFields / 3) * 100);
    setFormProgress(newProgress);

    // Réinitialiser le statut si on modifie après sauvegarde
    if (savingStatus === 'success') {
      setSavingStatus('idle');
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    // Pas de validation requise pour fkDemande et fkPhase car en lecture seule
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      setSavingStatus('loading');
      setFormProgress(0);

      // Animation de progression simulée pour feedback visuel
      const progressSteps = [20, 40, 60, 80, 95];
      progressSteps.forEach((step, index) => {
        setTimeout(() => {
          setFormProgress(step);
        }, index * 100);
      });

      try {
        // Si observation est vide, mettre "-"
        const submitData = {
          ...formData,
          observations:
            !formData.observations || formData.observations.trim() === ''
              ? '-'
              : formData.observations.trim(),
        };

        // Wrapper l'onSubmit pour gérer le statut
        await new Promise<void>((resolve) => {
          onSubmit(submitData);
          setTimeout(() => {
            setFormProgress(100);
            setSavingStatus('success');
            resolve();
          }, 500);
        });
      } catch (error) {
        setSavingStatus('error');
        setFormProgress(0);
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 animate-in fade-in duration-300"
    >
      {/* Indicateur de progression globale */}
      <FormProgressIndicator
        loading={loading || savingStatus === 'loading'}
        step={Math.floor(formProgress / 33.33)}
        totalSteps={3}
        currentStep={
          savingStatus === 'loading'
            ? 'Enregistrement en cours...'
            : formProgress > 0
              ? 'Formulaire en cours de remplissage'
              : undefined
        }
        message={
          savingStatus === 'loading'
            ? 'Veuillez patienter, traitement en cours...'
            : undefined
        }
      />

      {/* Badge de statut */}
      {savingStatus !== 'idle' && (
        <div className="flex justify-end">
          <StatusBadge
            status={savingStatus}
            message={
              savingStatus === 'loading'
                ? 'Sauvegarde...'
                : savingStatus === 'success'
                  ? 'Sauvegardé avec succès'
                  : 'Erreur de sauvegarde'
            }
          />
        </div>
      )}
      {/* Demande - Lecture seule */}
      <div className="transform transition-all duration-200">
        <label
          htmlFor="fkDemande"
          className="flex items-center text-sm font-medium text-gray-700 mb-2"
        >
          <span>Demande de congé</span>
          {errors.fkDemande && (
            <ExclamationCircleIcon className="ml-2 h-4 w-4 text-red-500" />
          )}
        </label>
        <input
          id="fkDemande"
          type="text"
          value={
            formData.fkDemande
              ? getDemandeLabel(formData.fkDemande)
              : 'Non définie'
          }
          readOnly
          className={`block w-full rounded-md border-gray-300 bg-gray-50 cursor-not-allowed shadow-sm sm:text-sm transition-all ${
            errors.fkDemande ? 'border-red-300' : ''
          }`}
        />
        {errors.fkDemande && (
          <p className="mt-1 text-sm text-red-600 animate-in slide-in-from-top duration-200">
            {errors.fkDemande}
          </p>
        )}
      </div>

      {/* Phase - Lecture seule */}
      <div className="transform transition-all duration-200">
        <label
          htmlFor="fkPhase"
          className="flex items-center text-sm font-medium text-gray-700 mb-2"
        >
          <span>Phase</span>
          {errors.fkPhase && (
            <ExclamationCircleIcon className="ml-2 h-4 w-4 text-red-500" />
          )}
        </label>
        <input
          id="fkPhase"
          type="text"
          value={
            formData.fkPhase ? getPhaseLabel(formData.fkPhase) : 'Non définie'
          }
          readOnly
          className={`block w-full rounded-md border-gray-300 bg-gray-50 cursor-not-allowed shadow-sm sm:text-sm transition-all ${
            errors.fkPhase ? 'border-red-300' : ''
          }`}
        />
        {errors.fkPhase && (
          <p className="mt-1 text-sm text-red-600 animate-in slide-in-from-top duration-200">
            {errors.fkPhase}
          </p>
        )}
      </div>

      {/* Observations */}
      <div className="transform transition-all duration-200">
        <label
          htmlFor="observations"
          className="flex items-center text-sm font-medium text-gray-700 mb-2"
        >
          <span>Observations</span>
          {errors.observations && (
            <ExclamationCircleIcon className="ml-2 h-4 w-4 text-red-500" />
          )}
        </label>
        <div className="relative">
          <textarea
            id="observations"
            value={formData.observations || ''}
            onChange={(e) => handleChange('observations', e.target.value)}
            rows={4}
            disabled={loading || savingStatus === 'loading'}
            className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 sm:text-sm transition-all ${
              errors.observations
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'hover:border-gray-400'
            } ${loading || savingStatus === 'loading' ? 'opacity-75 cursor-wait' : ''}`}
            placeholder="Notes et observations sur le traitement..."
          />
          {/* Indicateur de caractères */}
          {formData.observations && (
            <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-1 rounded">
              {formData.observations.length} caractères
            </div>
          )}
        </div>
        {/* Barre de progression pour observations */}
        {formData.observations && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
              style={{
                width: `${Math.min(100, (formData.observations.length / 500) * 100)}%`,
              }}
            />
          </div>
        )}
        {errors.observations && (
          <p className="mt-1 text-sm text-red-600 flex items-center animate-in slide-in-from-top duration-200">
            <ExclamationCircleIcon className="h-4 w-4 mr-1" />
            {errors.observations}
          </p>
        )}
        {!errors.observations && formData.observations && (
          <p className="mt-1 text-sm text-green-600 flex items-center animate-in slide-in-from-top duration-200">
            <CheckCircleIcon className="h-4 w-4 mr-1" />
            Champ valide
          </p>
        )}
      </div>

      {/* Conformité */}
      <div className="transform transition-all duration-200 hover:bg-gray-50 p-3 rounded-lg border border-transparent hover:border-indigo-200">
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.conformite === true}
            onChange={(e) => handleChange('conformite', e.target.checked)}
            disabled={loading || savingStatus === 'loading'}
            className="rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
            Conformité
          </span>
          {formData.conformite && (
            <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500 animate-in zoom-in duration-200" />
          )}
          {formData.conformite && (
            <div className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </label>
        <p className="mt-1 ml-6 text-xs text-gray-500">
          Cochez si la demande est conforme aux exigences
        </p>
        {/* Barre de progression visuelle */}
        {formData.conformite && (
          <div className="mt-2 ml-6 w-full bg-gray-200 rounded-full h-1">
            <div
              className="h-full bg-green-500 rounded-full animate-pulse"
              style={{ width: '100%' }}
            ></div>
          </div>
        )}
      </div>

      {/* Approbation */}
      <div className="transform transition-all duration-200 hover:bg-gray-50 p-3 rounded-lg border border-transparent hover:border-indigo-200">
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={formData.approbation === true}
            onChange={(e) => handleChange('approbation', e.target.checked)}
            disabled={loading || savingStatus === 'loading'}
            className="rounded border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all h-4 w-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-indigo-600 transition-colors">
            Approbation
          </span>
          {formData.approbation && (
            <CheckCircleIcon className="ml-2 h-5 w-5 text-green-500 animate-in zoom-in duration-200" />
          )}
          {formData.approbation && (
            <div className="ml-auto">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            </div>
          )}
        </label>
        <p className="mt-1 ml-6 text-xs text-gray-500">
          Cochez pour approuver définitivement la demande
        </p>
        {/* Barre de progression visuelle */}
        {formData.approbation && (
          <div className="mt-2 ml-6 w-full bg-gray-200 rounded-full h-1">
            <div
              className="h-full bg-green-500 rounded-full animate-pulse"
              style={{ width: '100%' }}
            ></div>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:scale-105 active:scale-95"
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
        {!readOnly && (
          <ButtonWithProgress
            type="submit"
            variant="primary"
            loading={loading || savingStatus === 'loading'}
            progress={savingStatus === 'loading' ? formProgress : undefined}
            showProgressBar={savingStatus === 'loading'}
            loadingText="Traitement en cours..."
          >
            {savingStatus === 'success' ? '✓ Sauvegardé' : submitLabel}
          </ButtonWithProgress>
        )}
      </div>
    </form>
  );
};

export default TraitementForm;
