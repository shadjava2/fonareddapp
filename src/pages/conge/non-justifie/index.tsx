import CongeAppShell from '@/components/layout/CongeAppShell';
import AutocompleteSelect from '@/components/ui/AutocompleteSelect';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  formatDateTimeShortFR,
  formatDecimalFR,
} from '@/lib/formatDate';
import { apiGet, apiPost, getAxiosErrorMessage } from '@/lib/fetcher';
import {
  ArrowDownTrayIcon,
  DocumentMagnifyingGlassIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

type AgentOption = { value: string; label: string };

type Retrait = {
  id: string;
  fkUtilisateur: string;
  nbrjours: number;
  commentaire: string | null;
  resteApres: number | null;
  datecreate: string;
  utilisateur?: {
    nom: string;
    prenom: string | null;
    username: string;
  };
};

const NonJustifiePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [agentOptions, setAgentOptions] = useState<AgentOption[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [selectedAgentOption, setSelectedAgentOption] =
    useState<AgentOption | null>(null);
  const [retraits, setRetraits] = useState<Retrait[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [plafondConfig, setPlafondConfig] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [fkUtilisateur, setFkUtilisateur] = useState('');
  const [nbrjours, setNbrjours] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    agent?: string;
    jours?: string;
  }>({});

  const fetchAgentOptions = useCallback(async (query: string) => {
    setAgentsLoading(true);
    try {
      const params = new URLSearchParams({
        searchUsers: '1',
        q: query,
        limit: '50',
      });
      const res = await apiGet<{
        success: boolean;
        users?: { id: string; label: string }[];
      }>(`/api/conge/non-justifie-retrait?${params.toString()}`);

      if (res.success && Array.isArray(res.users)) {
        setAgentOptions(
          res.users.map((u) => ({ value: u.id, label: u.label }))
        );
      } else {
        setAgentOptions([]);
      }
    } catch {
      setAgentOptions([]);
    } finally {
      setAgentsLoading(false);
    }
  }, []);

  const handleAgentSearch = useCallback(
    (query: string) => {
      void fetchAgentOptions(query);
    },
    [fetchAgentOptions]
  );

  const comboOptions = useMemo(() => {
    const map = new Map(agentOptions.map((o) => [o.value, o]));
    if (
      selectedAgentOption &&
      !map.has(selectedAgentOption.value)
    ) {
      map.set(selectedAgentOption.value, selectedAgentOption);
    }
    return [...map.values()];
  }, [agentOptions, selectedAgentOption]);

  const fetchRetraits = useCallback(async (uid: string) => {
    setHistoryLoading(true);
    try {
      const rRes = await apiGet<{
        success: boolean;
        retraits?: Retrait[];
      }>(
        `/api/conge/non-justifie-retrait?fkUtilisateur=${encodeURIComponent(uid)}`
      );
      if (rRes.success && Array.isArray(rRes.retraits)) {
        setRetraits(rRes.retraits);
      } else {
        setRetraits([]);
      }
    } catch {
      setRetraits([]);
      showError('Erreur', 'Impossible de charger l’historique.');
    } finally {
      setHistoryLoading(false);
    }
  }, [showError]);

  const fetchAgentMailPrefill = useCallback(async (uid: string) => {
    try {
      const r = await apiGet<{ success: boolean; mail?: string | null }>(
        `/api/conge/non-justifie-retrait?agentMeta=1&fkUtilisateur=${encodeURIComponent(uid)}`
      );
      if (r.success && r.mail && typeof r.mail === 'string') {
        setRecipientEmail(r.mail.trim());
      } else {
        setRecipientEmail('');
      }
    } catch {
      setRecipientEmail('');
    }
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const cfgRes = await apiGet<{
        success: boolean;
        configConge: { congenonjustifie?: number | null } | null;
      }>('/api/admin/personnel/config-conge');

      if (cfgRes.success && cfgRes.configConge) {
        const v = cfgRes.configConge.congenonjustifie;
        setPlafondConfig(
          v != null && Number.isFinite(Number(v)) ? Number(v) : null
        );
      } else {
        setPlafondConfig(null);
      }

      await fetchAgentOptions('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chargement impossible';
      showError('Erreur', msg);
    } finally {
      setLoading(false);
    }
  }, [fetchAgentOptions, showError]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!fkUtilisateur) {
      setRetraits([]);
      setRecipientEmail('');
      return;
    }
    void fetchRetraits(fkUtilisateur);
    void fetchAgentMailPrefill(fkUtilisateur);
  }, [fkUtilisateur, fetchRetraits, fetchAgentMailPrefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof fieldErrors = {};

    const j = Number.parseFloat(nbrjours.replace(',', '.'));
    if (!fkUtilisateur) {
      nextErrors.agent = 'Sélectionnez un agent dans la liste.';
    }
    if (!Number.isFinite(j) || j <= 0) {
      nextErrors.jours = 'Indiquez un nombre de jours valide (> 0).';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showError('Formulaire', 'Corrigez les champs indiqués.');
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        fkUtilisateur,
        nbrjours: j,
        commentaire: commentaire.trim() || undefined,
      };
      if (user?.id != null) {
        body.usercreateid = String(user.id);
      }

      const res = await apiPost<{
        success: boolean;
        message?: string;
        retrait?: Retrait;
      }>('/api/conge/non-justifie-retrait', body);

      if (res.success) {
        showSuccess('Enregistré', 'Retrait enregistré et solde mis à jour.');
        setNbrjours('');
        setCommentaire('');
        setFieldErrors({});
        if (fkUtilisateur) {
          await fetchRetraits(fkUtilisateur);
        }
        await fetchAgentOptions('');
      } else {
        showError('Erreur', res.message || 'Enregistrement impossible');
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Enregistrement impossible';
      showError('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const closePdfPreview = useCallback(() => {
    setShowPdfPreview(false);
    setPdfPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!showPdfPreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePdfPreview();
    };
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
  }, [showPdfPreview, closePdfPreview]);

  const fetchPdfBlob = useCallback(async (): Promise<Blob> => {
    const res = await fetch(
      `/api/conge/non-justifie-retrait-pdf?fkUtilisateur=${encodeURIComponent(fkUtilisateur)}`,
      { credentials: 'include' }
    );
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(j.message || 'Génération du PDF impossible');
    }
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/pdf')) {
      const j = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(j.message || 'Réponse inattendue du serveur');
    }
    return res.blob();
  }, [fkUtilisateur]);

  const handleOpenPdfPreview = async () => {
    if (!fkUtilisateur) {
      showError('PDF', 'Sélectionnez un agent pour générer le rapport.');
      return;
    }
    setPdfPreviewLoading(true);
    try {
      setPdfPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      setShowPdfPreview(true);
    } catch (e: unknown) {
      showError('PDF', e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!fkUtilisateur) {
      showError('PDF', 'Sélectionnez un agent pour générer le rapport.');
      return;
    }
    setPdfLoading(true);
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conges_non_justifies_${fkUtilisateur}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess('PDF', 'Le fichier PDF a été téléchargé.');
    } catch (e: unknown) {
      showError('PDF', e instanceof Error ? e.message : 'Erreur');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fkUtilisateur) return;
    const to = recipientEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      showError('E-mail', 'Indiquez une adresse e-mail valide.');
      return;
    }
    setSendingEmail(true);
    try {
      const r = await apiPost<{ success: boolean; message?: string }>(
        '/api/conge/non-justifie-retrait-email',
        { fkUtilisateur, to },
        { timeout: 180_000 }
      );
      if (r.success) {
        showSuccess('E-mail', r.message || 'Rapport envoyé avec succès.');
        setShowEmailModal(false);
      } else {
        showError('E-mail', r.message || 'Envoi impossible');
      }
    } catch (e: unknown) {
      showError('E-mail', getAxiosErrorMessage(e));
    } finally {
      setSendingEmail(false);
    }
  };

  const agentLabelForHistory =
    selectedAgentOption?.label ||
    (fkUtilisateur ? `ID ${fkUtilisateur}` : null);

  return (
    <CongeAppShell>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="space-y-5 sm:space-y-8">
        <div className="no-print rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white shadow-sm ring-1 ring-amber-900/10">
          <div className="p-5 sm:p-6 md:p-8 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <ExclamationTriangleIcon className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 space-y-2 sm:space-y-3">
              <h1 className="text-[1.375rem] sm:text-2xl font-bold tracking-tight text-gray-900 leading-tight">
                Congés non justifiés
              </h1>
              <p className="text-[0.9375rem] sm:text-sm text-gray-600 leading-relaxed">
                Retraits sur le solde annuel (
                <code className="rounded-md bg-amber-100/90 px-1.5 py-0.5 text-[0.7rem] sm:text-xs break-all align-middle">
                  congesolde.congenonjustifie
                </code>
                ) avec historique et rapport imprimable.
              </p>
              <p className="text-[0.9375rem] sm:text-sm text-gray-600 border-t border-amber-200/60 pt-3 sm:pt-4 leading-relaxed">
                Plafond configuré (référence)&nbsp;:{' '}
                <span className="font-semibold text-gray-900">
                  {formatDecimalFR(plafondConfig)} jour(s) / an
                </span>
                . Réinitialisation en janvier (scheduler)&nbsp;; solde non justifié à
                zéro en décembre avec les autres soldes.
              </p>
            </div>
          </div>
        </div>

        <div className="no-print w-full max-w-2xl mx-auto md:mx-0">
          <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 md:p-8 shadow-sm ring-1 ring-gray-900/5">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Nouveau retrait
            </h2>
            <p className="mt-2 text-[0.9375rem] sm:text-sm text-gray-500 leading-relaxed">
              Recherchez un agent par nom, prénom ou identifiant — la liste se
              met à jour pendant la saisie.
            </p>

            {loading ? (
              <div className="mt-8 flex items-center gap-3 text-[0.9375rem] sm:text-sm text-gray-500 min-h-[3rem]">
                <span
                  className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"
                  aria-hidden
                />
                Chargement du formulaire…
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mt-6 space-y-5 sm:space-y-6"
                noValidate
              >
                <AutocompleteSelect
                  inputId="nj-agent"
                  label="Agent"
                  placeholder="Tapez pour rechercher un agent…"
                  options={comboOptions}
                  value={fkUtilisateur || null}
                  externalFilter
                  loading={agentsLoading}
                  onSearchQueryChange={handleAgentSearch}
                  searchDebounceMs={280}
                  onChange={(v) => {
                    if (v == null) {
                      setFkUtilisateur('');
                      setSelectedAgentOption(null);
                      setFieldErrors((prev) => ({ ...prev, agent: undefined }));
                      return;
                    }
                    const id = String(v);
                    setFkUtilisateur(id);
                    const found = agentOptions.find((o) => o.value === id);
                    if (found) {
                      setSelectedAgentOption({
                        value: found.value,
                        label: found.label,
                      });
                    } else {
                      setSelectedAgentOption((prev) =>
                        prev?.value === id ? prev : { value: id, label: `ID ${id}` }
                      );
                    }
                    setFieldErrors((prev) => ({ ...prev, agent: undefined }));
                  }}
                  error={fieldErrors.agent}
                  required
                />

                <div>
                  <label
                    htmlFor="nj-jours"
                    className="block text-[0.9375rem] sm:text-sm font-semibold text-gray-800 mb-2"
                  >
                    Nombre de jours <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="nj-jours"
                    type="text"
                    inputMode="decimal"
                    value={nbrjours}
                    onChange={(e) => {
                      setNbrjours(e.target.value);
                      setFieldErrors((prev) => ({ ...prev, jours: undefined }));
                    }}
                    placeholder="Ex. 1 ou 0,5"
                    error={fieldErrors.jours}
                    required
                    className="min-h-[48px] py-3.5 text-base sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="nj-commentaire"
                    className="block text-[0.9375rem] sm:text-sm font-semibold text-gray-800 mb-2"
                  >
                    Commentaire
                  </label>
                  <textarea
                    id="nj-commentaire"
                    className="block w-full min-h-[7.5rem] sm:min-h-0 rounded-xl sm:rounded-lg border border-gray-300 px-4 py-3.5 text-base sm:text-sm shadow-sm transition-colors placeholder:text-gray-400 hover:border-indigo-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    rows={4}
                    value={commentaire}
                    onChange={(e) => setCommentaire(e.target.value)}
                    placeholder="Motif ou référence (optionnel)"
                    maxLength={500}
                  />
                  <p className="mt-2 text-xs text-gray-500 tabular-nums">
                    {commentaire.length}/500 caractères
                  </p>
                </div>

                <div className="pt-1 sm:pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    loading={submitting}
                    className="w-full sm:w-auto min-h-[48px] text-base sm:text-sm px-6 sm:px-4"
                  >
                    Enregistrer le retrait
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div
          className="bg-white shadow-sm sm:shadow rounded-xl sm:rounded-lg overflow-hidden ring-1 ring-gray-900/5"
          id="rapport-non-justifie"
        >
          <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-gray-200 flex flex-col gap-4">
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Historique & rapport
              </h2>
              <p className="mt-1.5 text-[0.9375rem] sm:text-sm text-gray-600 leading-relaxed">
                {fkUtilisateur ? (
                  <>
                    Historique de{' '}
                    <span className="font-semibold text-gray-900">
                      {agentLabelForHistory}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Sélectionnez un agent dans le formulaire pour afficher ses
                    retraits et générer le PDF ou l’envoi par e-mail.
                  </>
                )}
              </p>
            </div>

            <div className="no-print flex flex-col sm:flex-row flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleOpenPdfPreview()}
                disabled={!fkUtilisateur || pdfPreviewLoading}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:py-2 border border-emerald-300 shadow-sm text-[0.9375rem] sm:text-sm font-medium rounded-xl sm:rounded-md text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DocumentMagnifyingGlassIcon
                  className="h-5 w-5 shrink-0"
                  aria-hidden
                />
                {pdfPreviewLoading ? 'Chargement…' : 'Aperçu PDF'}
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                disabled={!fkUtilisateur || pdfLoading}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:py-2 border border-indigo-200 shadow-sm text-[0.9375rem] sm:text-sm font-medium rounded-xl sm:rounded-md text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowDownTrayIcon className="h-5 w-5 shrink-0" aria-hidden />
                {pdfLoading ? 'PDF…' : 'Télécharger PDF'}
              </button>
              <button
                type="button"
                onClick={() => setShowEmailModal(true)}
                disabled={!fkUtilisateur}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[48px] sm:min-h-0 px-4 py-3 sm:py-2 border border-emerald-200 shadow-sm text-[0.9375rem] sm:text-sm font-medium rounded-xl sm:rounded-md text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <EnvelopeIcon className="h-5 w-5 shrink-0" aria-hidden />
                Envoyer par e-mail (PDF)
              </button>
            </div>
          </div>

          {/* Mobile : cartes ; masqué à l’impression */}
          <div className="md:hidden print:hidden p-4 sm:p-5 pb-6">
            {!fkUtilisateur ? (
              <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 px-4 py-12 text-center text-[0.9375rem] text-amber-900/90 leading-relaxed">
                Choisissez un agent dans le formulaire pour voir son historique
                ici.
              </div>
            ) : historyLoading ? (
              <div className="flex items-center justify-center gap-3 py-14 text-gray-500 text-sm">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                Chargement de l’historique…
              </div>
            ) : retraits.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/90 px-4 py-12 text-center text-[0.9375rem] text-gray-500">
                Aucun retrait enregistré pour cet agent.
              </div>
            ) : (
              <ul className="flex flex-col gap-4">
                {retraits.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-gray-200/90 bg-gradient-to-b from-white to-slate-50/50 p-4 sm:p-5 shadow-sm ring-1 ring-gray-900/[0.04]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                            Date
                          </p>
                          <p className="text-[0.9375rem] font-medium text-gray-900">
                            {formatDateTimeShortFR(r.datecreate)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right space-y-1">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Jours
                          </p>
                          <p className="text-lg font-bold tabular-nums text-indigo-700">
                            {formatDecimalFR(r.nbrjours)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Reste&nbsp;:{' '}
                            <span className="font-semibold text-gray-800 tabular-nums">
                              {formatDecimalFR(r.resteApres)}
                            </span>
                          </p>
                        </div>
                      </div>
                      {(r.commentaire?.trim() || '') !== '' && (
                        <div className="pt-3 border-t border-gray-200/80">
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5">
                            Commentaire
                          </p>
                          <p className="text-[0.9375rem] text-gray-700 leading-relaxed break-words">
                            {r.commentaire}
                          </p>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tableau : tablette, desktop et impression */}
          <div className="hidden md:block print:!block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 print:table-header-group">
                <tr>
                  <th className="px-4 lg:px-6 py-3.5 text-left font-medium text-gray-700">
                    Date
                  </th>
                  <th className="px-4 lg:px-6 py-3.5 text-right font-medium text-gray-700">
                    Jours
                  </th>
                  <th className="px-4 lg:px-6 py-3.5 text-right font-medium text-gray-700">
                    Reste après
                  </th>
                  <th className="px-4 lg:px-6 py-3.5 text-left font-medium text-gray-700">
                    Commentaire
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {!fkUtilisateur ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Sélectionnez un agent pour afficher l’historique.
                    </td>
                  </tr>
                ) : historyLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Chargement…
                    </td>
                  </tr>
                ) : retraits.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Aucun retrait enregistré pour cet agent.
                    </td>
                  </tr>
                ) : (
                  retraits.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 lg:px-6 py-3.5 whitespace-nowrap text-gray-900">
                        {formatDateTimeShortFR(r.datecreate)}
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 text-right tabular-nums">
                        {formatDecimalFR(r.nbrjours)}
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 text-right tabular-nums">
                        {formatDecimalFR(r.resteApres)}
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 text-gray-600 max-w-md">
                        {r.commentaire || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="px-4 sm:px-6 py-3.5 text-[0.6875rem] sm:text-xs text-gray-500 print:text-gray-600 leading-relaxed border-t border-gray-100 md:border-t-0 space-y-1">
            {fkUtilisateur ? (
              <p className="print:block">
                <span className="font-medium text-gray-600">Agent :</span>{' '}
                {agentLabelForHistory}
              </p>
            ) : null}
            <p>
              Document généré le {formatDateTimeShortFR(new Date())} — Module
              Congé Fonaredd
            </p>
          </div>
        </div>

        {showPdfPreview && pdfPreviewUrl ? (
          <div
            className="no-print fixed inset-0 z-[70] flex flex-col bg-zinc-950/90 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nj-pdf-preview-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-emerald-900/40 bg-gradient-to-r from-emerald-900 to-emerald-800 px-4 py-3 sm:px-5 text-white shadow-md">
              <div className="min-w-0">
                <h3
                  id="nj-pdf-preview-title"
                  className="truncate text-base font-semibold sm:text-lg"
                >
                  Aperçu du rapport PDF
                </h3>
                <p className="truncate text-xs text-emerald-100/90 sm:text-sm">
                  Même document que le fichier téléchargé ou envoyé par e-mail
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadPdf()}
                  disabled={!fkUtilisateur || pdfLoading}
                  className="hidden sm:inline-flex items-center justify-center rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 disabled:opacity-50"
                >
                  Télécharger
                </button>
                <button
                  type="button"
                  onClick={closePdfPreview}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/25 bg-white/10 text-white hover:bg-white/20"
                  aria-label="Fermer l’aperçu"
                >
                  <XMarkIcon className="h-6 w-6" aria-hidden />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 p-2 sm:p-4">
              <iframe
                title="Aperçu du rapport congés non justifiés (PDF)"
                src={`${pdfPreviewUrl}#view=FitH`}
                className="h-full min-h-[50dvh] w-full rounded-lg border border-zinc-700 bg-zinc-900 shadow-inner"
              />
            </div>
          </div>
        ) : null}

        {showEmailModal && (
          <div
            className="no-print fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nj-email-title"
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 p-5 sm:p-6 max-h-[90vh] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
              <h3
                id="nj-email-title"
                className="text-lg font-semibold text-gray-900"
              >
                Envoyer le rapport PDF
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Le PDF joint reprend l’historique des congés non justifiés pour{' '}
                <span className="font-medium text-gray-900">
                  {agentLabelForHistory}
                </span>
                . L’e-mail part du serveur (SMTP) — vérifiez la configuration si
                l’envoi échoue.
              </p>
              <form onSubmit={handleEmailSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="nj-email-to"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Destinataire
                  </label>
                  <input
                    id="nj-email-to"
                    type="email"
                    autoComplete="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="adresse@exemple.org"
                    required
                    className="block w-full min-h-[48px] rounded-lg border border-gray-300 px-3 py-2.5 text-base sm:text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                  />
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={sendingEmail}
                    className="w-full sm:w-auto min-h-[48px] justify-center"
                  >
                    Envoyer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </CongeAppShell>
  );
};

export default NonJustifiePage;
