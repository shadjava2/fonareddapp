import CongeAppShell from '@/components/layout/CongeAppShell';
import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ModernSelect from '@/components/ui/ModernSelect';
import { useToast } from '@/hooks/useToast';
import { countFonareddWorkingDays } from '@/lib/calendrier';
import { apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import { formatDecimalFR } from '@/lib/formatDate';
import { DocumentPlusIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AgentOption = { value: string; label: string };
type TypeOption = { id: string; designation: string };
type CalendrierEntry = { id?: number | string; d: string; label?: string | null };

const SaisieManuelleCongePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [types, setTypes] = useState<TypeOption[]>([]);
  const [calendrier, setCalendrier] = useState<CalendrierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [soldeLoading, setSoldeLoading] = useState(false);

  const [utilisateurId, setUtilisateurId] = useState('');
  const [fkTypeConge, setFkTypeConge] = useState<string>('');
  const [du, setDu] = useState('');
  const [au, setAu] = useState('');
  const [nbrjour, setNbrjour] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [solde, setSolde] = useState<number | null>(null);
  const [soldeConsomme, setSoldeConsomme] = useState<number | null>(null);
  const [soldeRestant, setSoldeRestant] = useState<number | null>(null);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [metaRes, calRes] = await Promise.all([
        apiGet<{
          success: boolean;
          users?: Array<{ id?: string; value?: string; label: string }>;
          types?: TypeOption[];
          message?: string;
        }>('/api/conge/saisie-manuelle'),
        apiGet<{
          success: boolean;
          calendrier?: CalendrierEntry[];
        }>('/api/conge/calendrier?limit=1000'),
      ]);

      if (metaRes.success) {
        setAgents(
          (metaRes.users || []).map((u) => ({
            value: String(u.value || u.id),
            label: u.label,
          }))
        );
        setTypes(metaRes.types || []);
      } else {
        showError(metaRes.message || 'Chargement impossible');
      }

      if (calRes.success) {
        setCalendrier(calRes.calendrier || []);
      }
    } catch (e: unknown) {
      showError(getAxiosErrorMessage(e) || 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const loadSolde = useCallback(
    async (userId: string) => {
      if (!userId) {
        setSolde(null);
        setSoldeConsomme(null);
        setSoldeRestant(null);
        return;
      }
      setSoldeLoading(true);
      try {
        const res = await apiGet<{
          success: boolean;
          solde?: {
            solde: number;
            soldeConsomme: number;
            soldeRestant: number;
          };
        }>(`/api/conge/solde?userId=${encodeURIComponent(userId)}`);
        if (res.success && res.solde) {
          setSolde(Number(res.solde.solde) || 0);
          setSoldeConsomme(Number(res.solde.soldeConsomme) || 0);
          setSoldeRestant(Number(res.solde.soldeRestant) || 0);
        } else {
          setSolde(0);
          setSoldeConsomme(0);
          setSoldeRestant(0);
        }
      } catch {
        setSolde(null);
        setSoldeConsomme(null);
        setSoldeRestant(null);
        showError('Impossible de charger le solde de cet agent.');
      } finally {
        setSoldeLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    void loadSolde(utilisateurId);
  }, [utilisateurId, loadSolde]);

  /** Calcul auto des jours ouvrés (lun–ven + calendrier Fonaredd) */
  const calculatedDays = useMemo(() => {
    if (!du || !au || du > au) return null;
    return countFonareddWorkingDays(du, au, calendrier);
  }, [du, au, calendrier]);

  useEffect(() => {
    if (calculatedDays == null) {
      setNbrjour('');
      return;
    }
    const restant = soldeRestant ?? Infinity;
    if (Number.isFinite(restant) && calculatedDays > restant) {
      setNbrjour(String(restant));
      setErrors((p) => ({
        ...p,
        jours: `Période = ${calculatedDays} j. ouvrés, plafonné au solde restant (${restant}).`,
      }));
    } else {
      setNbrjour(String(calculatedDays));
      setErrors((p) => {
        const n = { ...p };
        delete n.jours;
        return n;
      });
    }
  }, [calculatedDays, soldeRestant]);

  const typeOptions = useMemo(
    () =>
      types.map((t) => ({
        value: t.id,
        label: t.designation,
      })),
    [types]
  );

  const canSubmit =
    Boolean(utilisateurId) &&
    Boolean(fkTypeConge) &&
    Boolean(du) &&
    Boolean(au) &&
    Number(nbrjour) > 0 &&
    (soldeRestant == null || Number(nbrjour) <= soldeRestant + 1e-9) &&
    (soldeRestant == null || soldeRestant > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    const j = Number.parseFloat(String(nbrjour).replace(',', '.'));
    if (!utilisateurId) next.agent = 'Sélectionnez un agent.';
    if (!fkTypeConge) next.type = 'Sélectionnez un type de congé.';
    if (!du || !au) next.periode = 'Indiquez du / au.';
    else if (du > au)
      next.periode = 'La date de début ne peut pas être après la fin.';
    if (!Number.isFinite(j) || j <= 0) next.jours = 'Nombre de jours invalide.';
    if (soldeRestant != null && soldeRestant <= 0) {
      next.jours = 'Solde insuffisant : aucun jour disponible.';
    } else if (soldeRestant != null && j > soldeRestant + 1e-9) {
      next.jours = `Impossible : ${j} j. demandés > solde restant (${soldeRestant}).`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) {
      showError('Formulaire', 'Corrigez les champs indiqués.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiPost<{
        success: boolean;
        message?: string;
      }>('/api/conge/saisie-manuelle', {
        utilisateurId,
        fkTypeConge,
        du,
        au,
        nbrjour: j,
        commentaire: commentaire.trim() || undefined,
      });
      if (res.success) {
        showSuccess(res.message || 'Congé enregistré.');
        setCommentaire('');
        setDu('');
        setAu('');
        setNbrjour('');
        setErrors({});
        await loadSolde(utilisateurId);
      } else {
        showError('Erreur', res.message || 'Enregistrement impossible');
      }
    } catch (err: unknown) {
      showError(
        'Erreur',
        getAxiosErrorMessage(err) || 'Enregistrement impossible'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CongeAppShell>
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-start gap-3">
            <DocumentPlusIcon className="h-8 w-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Saisie manuelle de congé
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Congé déjà pris : validé immédiatement, débit du solde, sans
                passer par Traitement Demandes. Jours ouvrés calculés
                automatiquement (lun–ven, hors fériés Fonaredd), plafonnés au
                solde restant.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          {loading ? (
            <p className="text-sm text-gray-500">Chargement…</p>
          ) : (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-5 max-w-xl"
            >
              <AutocompleteSelect
                label="Agent"
                options={agents}
                value={utilisateurId || null}
                onChange={(v) => {
                  setUtilisateurId(v != null ? String(v) : '');
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.agent;
                    return n;
                  });
                }}
                error={errors.agent}
                required
                placeholder="Rechercher un agent…"
              />

              {utilisateurId && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                      Solde
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-indigo-950">
                      {soldeLoading
                        ? '…'
                        : formatDecimalFR(solde ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                      Consommé
                    </p>
                    <p className="text-lg font-semibold tabular-nums text-indigo-950">
                      {soldeLoading
                        ? '…'
                        : formatDecimalFR(soldeConsomme ?? 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
                      Restant
                    </p>
                    <p className="text-lg font-bold tabular-nums text-emerald-800">
                      {soldeLoading
                        ? '…'
                        : formatDecimalFR(soldeRestant ?? 0)}
                    </p>
                  </div>
                </div>
              )}

              <ModernSelect
                label="Type de congé"
                options={typeOptions}
                value={fkTypeConge || null}
                onChange={(v) => {
                  setFkTypeConge(v != null ? String(v) : '');
                  setErrors((p) => {
                    const n = { ...p };
                    delete n.type;
                    return n;
                  });
                }}
                error={errors.type}
                required
                placeholder="Choisir un type"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Du"
                  type="date"
                  value={du}
                  onChange={(e) => {
                    setDu(e.target.value);
                    setErrors((p) => {
                      const n = { ...p };
                      delete n.periode;
                      return n;
                    });
                  }}
                  required
                />
                <Input
                  label="Au"
                  type="date"
                  value={au}
                  onChange={(e) => {
                    setAu(e.target.value);
                    setErrors((p) => {
                      const n = { ...p };
                      delete n.periode;
                      return n;
                    });
                  }}
                  required
                />
              </div>
              {errors.periode && (
                <p className="text-sm text-red-600">{errors.periode}</p>
              )}

              <div>
                <Input
                  label="Nombre de jours (ouvrés)"
                  type="text"
                  inputMode="decimal"
                  value={nbrjour}
                  readOnly
                  error={errors.jours}
                  required
                  className="bg-gray-50"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Calcul automatique : lundi–vendredi, hors samedis/dimanches et
                  jours du calendrier Fonaredd
                  {calculatedDays != null
                    ? ` → ${calculatedDays} jour${calculatedDays > 1 ? 's' : ''} ouvré${calculatedDays > 1 ? 's' : ''}`
                    : ''}
                  .
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Commentaire (optionnel)
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Référence feuille, motif…"
                  maxLength={500}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                disabled={!canSubmit || submitting || soldeLoading}
              >
                Enregistrer et valider le congé
              </Button>
            </form>
          )}
        </div>
      </div>
    </CongeAppShell>
  );
};

export default SaisieManuelleCongePage;
