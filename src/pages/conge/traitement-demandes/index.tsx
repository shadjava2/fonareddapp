import { Can } from '@/components/auth/Can';
import TraitementForm from '@/components/forms/TraitementForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import { useActionLoader } from '@/components/ui/ActionLoader';
import { Loader } from '@/components/ui/Loader';
import { PageLoader, TableRowSkeleton } from '@/components/ui/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPut } from '@/lib/fetcher';
import { PERMISSIONS } from '@/lib/rbac';
import { cn } from '@/lib/utils';
import { formatPersonDisplayName } from '@/lib/user-display-name';
import {
  ChevronRightIcon,
  ClipboardDocumentCheckIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface Traitement {
  id: number;
  fkDemande?: number;
  fkPhase?: number;
  observations?: string;
  conformite?: boolean | null;
  approbation?: boolean | null;
  datecreate?: string;
  dateupdate?: string;
  usercreateid?: number;
  userupdateid?: number;
}

interface DemandeConge {
  id: number;
  demandeur?: string;
  du?: string;
  au?: string;
  nbrjour?: number;
  statut?: string;
  section?: string;
  nomsremplacant?: string;
  idSuperviseur?: number;
  superviseurNom?: string;
  usercreateid?: number;
}

interface Phase {
  id: number;
  designation?: string;
  ordrephase?: boolean;
}

const TraitementDemandesPage: React.FC = () => {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const isRole5Personnel = String(user?.fkRole ?? '') === '5';

  // Hook pour le loader d'action
  const {
    startLoading: startActionLoader,
    stopLoading: stopActionLoader,
    updateMessage: updateActionMessage,
    ActionLoaderComponent,
  } = useActionLoader();
  const [traitements, setTraitements] = useState<Traitement[]>([]);
  const [demandes, setDemandes] = useState<DemandeConge[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTraitement, setEditingTraitement] = useState<Traitement | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [showTraitesOnly, setShowTraitesOnly] = useState(false);
  /** Panneau détail : groupement par individu (demandeur) */
  const [detailAgentRow, setDetailAgentRow] = useState<{
    agentKey: string;
    demandeurLabel: string;
    demandes: Array<{
      fkDemande: number;
      traitements: Traitement[];
      demande?: DemandeConge;
      canUserAct: boolean;
      phasesTraitees: number;
      phasesTotal: number;
    }>;
  } | null>(null);
  const [expandedDemandeId, setExpandedDemandeId] = useState<number | null>(
    null
  );
  const [fichiersDemande, setFichiersDemande] = useState<
    Array<{ id: number; nom_original: string; url: string; mime?: string }>
  >([]);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  // État pour suivre les chargements individuels
  const [fetchingTraitements, setFetchingTraitements] = useState(false);
  const [fetchingDemandes, setFetchingDemandes] = useState(false);
  const [fetchingPhases, setFetchingPhases] = useState(false);

  // Debounce du terme de recherche pour optimiser les performances
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Définir les fonctions de fetch AVANT le useEffect qui les utilise
  const fetchTraitements = useCallback(async () => {
    try {
      setFetchingTraitements(true);
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        traitements: Traitement[];
      }>('/api/conge/traitements-list');
      if (response.success) {
        setTraitements(
          response.traitements.map((traitement) => ({
            ...traitement,
            id: Number.parseInt(traitement.id.toString(), 10),
            fkDemande:
              traitement.fkDemande !== undefined && traitement.fkDemande !== null
                ? Number.parseInt(String(traitement.fkDemande), 10)
                : undefined,
            fkPhase:
              traitement.fkPhase !== undefined && traitement.fkPhase !== null
                ? Number.parseInt(String(traitement.fkPhase), 10)
                : undefined,
            userupdateid:
              traitement.userupdateid !== undefined &&
              traitement.userupdateid !== null
                ? Number.parseInt(String(traitement.userupdateid), 10)
                : undefined,
            usercreateid:
              traitement.usercreateid !== undefined &&
              traitement.usercreateid !== null
                ? Number.parseInt(String(traitement.usercreateid), 10)
                : undefined,
          }))
        );
      } else {
        showError(
          'Erreur de chargement',
          'Impossible de charger les traitements'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger les traitements'
      );
    } finally {
      setFetchingTraitements(false);
      setLoading(false);
    }
  }, [showError]);

  const fetchDemandes = useCallback(async () => {
    try {
      setFetchingDemandes(true);
      const response = await apiGet<{
        success: boolean;
        demandes: DemandeConge[];
      }>('/api/conge/demandes?assigned=true&limit=1000');
      if (response.success) {
        setDemandes(
          response.demandes.map((demande: any) => ({
            ...demande,
            id: Number.parseInt(String(demande.id), 10),
            usercreateid:
              demande.usercreateid != null
                ? Number.parseInt(String(demande.usercreateid), 10)
                : undefined,
          }))
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    } finally {
      setFetchingDemandes(false);
    }
  }, []);

  const fetchPhases = useCallback(async () => {
    try {
      setFetchingPhases(true);
      const response = await apiGet<Array<Phase>>(
        '/api/admin/personnel/phases'
      );
      if (Array.isArray(response)) {
        setPhases(
          response.map((phase) => ({
            ...phase,
            id: parseInt(phase.id.toString()),
          }))
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des phases:', error);
      // Si l'API n'existe pas, créer des phases par défaut avec les vraies désignations
      setPhases([
        { id: 1, designation: 'REMPLACANT(E)' },
        { id: 2, designation: 'ADMINISTRATION' },
        { id: 3, designation: 'VISA SUPERVISEUR' },
        { id: 4, designation: 'APPROBATION COORDINA' },
        { id: 5, designation: 'APPROBATION COORDINA' },
      ]);
    } finally {
      setFetchingPhases(false);
    }
  }, []);

  // Charger les données avec loaders
  useEffect(() => {
    // Charger en parallèle avec loaders visuels
    Promise.all([fetchTraitements(), fetchDemandes(), fetchPhases()]).catch(
      (error) => {
        console.error('Erreur lors du chargement initial:', error);
      }
    );
  }, [fetchTraitements, fetchDemandes, fetchPhases]);

  // Initialiser le SSE pour les notifications
  useEffect(() => {
    if (!user?.id) return;

    const userId = Number(user.id);
    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'INIT') {
          setNotificationCount(data.count || 0);
          console.log(
            `🔔 Notifications initialisées: ${data.count || 0} non lue(s)`
          );
        } else if (data.type === 'NEW') {
          setNotificationCount((prev) => prev + (data.increment || 1));
          console.log('🔔 Nouvelle notification reçue');
        } else if (data.type === 'READ') {
          setNotificationCount((prev) =>
            Math.max(0, prev - (data.decrement || 1))
          );
          console.log('🔔 Notification marquée comme lue');
        } else if (data.type === 'PING') {
          // Keep-alive, ne rien faire
        }
      } catch (error) {
        console.error('❌ Erreur lors du parsing du message SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erreur SSE:', error);
      // Tentative de reconnexion automatique après 3 secondes
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          console.log('🔄 Tentative de reconnexion SSE...');
        }
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [user?.id]);

  // Quand la page "Traitement Demandes" est ouverte, mettre à jour les notifications en "Ouvert"
  useEffect(() => {
    if (!user?.id || router.pathname !== '/conge/traitement-demandes') return;

    let isMounted = true;
    let abortController: AbortController | null = null;

    const markNotificationsAsOpened = async () => {
      // Créer un nouvel AbortController pour cette requête
      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController?.abort(), 5000); // Timeout de 5 secondes

      try {
        console.log(
          '📄 Page "Traitement Demandes" ouverte - Mise à jour des notifications en "Ouvert"'
        );

        // Mettre à jour toutes les notifications "Non Ouvert" en "Ouvert"
        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: Number(user.id) }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);

        // Vérifier si le composant est toujours monté
        if (!isMounted) return;

        if (response.ok) {
          try {
            const data = await response.json();
            console.log(
              `✅ ${data.count || 0} notification(s) mise(s) à jour en "Ouvert"`
            );
            if (isMounted) {
              setNotificationCount(0);
            }
          } catch (parseError) {
            console.error(
              '❌ Erreur lors du parsing de la réponse:',
              parseError
            );
          }
        } else {
          console.warn(
            `⚠️ Réponse API non-OK: ${response.status} ${response.statusText}`
          );
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Ignorer les erreurs d'abort (timeout)
        if (error?.name === 'AbortError') {
          console.warn('⚠️ Requête de marquage annulée (timeout)');
          return;
        }
        console.error(
          '❌ Erreur lors de la mise à jour des notifications:',
          error?.message || error
        );
      } finally {
        abortController = null;
      }
    };

    // Attendre un court délai pour s'assurer que la page est bien chargée
    const timer = setTimeout(markNotificationsAsOpened, 500);

    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [user?.id, router.pathname]);

  // Pas de création manuelle - les traitements sont créés automatiquement lors de la création d'une demande
  const handleCreate = () => {
    showError(
      'Création non autorisée',
      "Les traitements sont créés automatiquement lors de la création d'une demande de congé."
    );
  };

  const handleTraiter = useCallback(
    async (traitement: Traitement) => {
      setDetailAgentRow(null);
      setExpandedDemandeId(null);
      startActionLoader(
        'Chargement du formulaire...',
        'Vérification des prérequis'
      );

      try {
        // Bloquer explicitement les phases > 1 tant que le remplaçant (phase 1)
        // n'a pas validé, en vérifiant sur tous les traitements de la demande.
        if (traitement.fkDemande && (traitement.fkPhase || 0) > 1) {
          const response = await apiGet<{
            success: boolean;
            traitements: Array<{
              fkDemande?: number | string | null;
              fkPhase?: number | string | null;
              observations?: string | null;
              approbation?: boolean | null;
            }>;
          }>(
            `/api/conge/traitements-list?limit=1000&demandeId=${traitement.fkDemande}`
          );

          const allTraitements = response.success ? response.traitements || [] : [];
          const remplacement = allTraitements.find(
            (t) => Number.parseInt(String(t.fkPhase), 10) === 1
          );
          // Si aucune phase 1 en base, ne pas bloquer (parcours allégé)
          if (remplacement) {
            const remplacementValide =
              !!remplacement?.observations && remplacement?.approbation === true;

            if (!remplacementValide) {
              stopActionLoader();
              showError(
                'Validation du remplaçant requise',
                "Le remplaçant doit d'abord valider la demande avant de pouvoir traiter cette phase."
              );
              return;
            }
          }
        }

        setEditingTraitement(traitement);
        setShowForm(true);
        stopActionLoader();
      } catch {
        setEditingTraitement(traitement);
        setShowForm(true);
        stopActionLoader();
      }
    },
    [showError, startActionLoader, stopActionLoader]
  );

  /**
   * Génère et imprime le rapport de la demande de congé
   */
  const handleImprimer = useCallback(
    async (traitement: Traitement) => {
      if (!traitement.fkDemande) {
        showError(
          'Erreur',
          'Impossible de récupérer les informations de la demande'
        );
        return;
      }

      startActionLoader('Génération du rapport...', 'Récupération des données');

      try {
        updateActionMessage(
          'Génération du rapport...',
          'Récupération de la demande'
        );

        // Récupérer les détails de la demande
        const demandeResponse = await apiGet<{
          success: boolean;
          demandes: DemandeConge[];
        }>(`/api/conge/demandes?assigned=true&limit=1000`);

        const demande = demandeResponse.demandes?.find(
          (d) =>
            Number.parseInt(String(d.id), 10) ===
            Number.parseInt(String(traitement.fkDemande), 10)
        );

        if (!demande) {
          stopActionLoader();
          showError('Erreur', 'Demande non trouvée');
          return;
        }

        updateActionMessage('Génération du rapport...', 'Création du document');

        // Récupérer tous les traitements de cette demande
        // Note: On doit récupérer tous les traitements car l'API filtre par userupdateid
        // On va créer une fonction helper pour obtenir le label de phase
        const getPhaseLabelForReport = (fkPhase?: number): string => {
          if (!fkPhase) return 'Non définie';
          const phase = phases.find((p) => p.id === fkPhase);
          if (phase?.designation) {
            return phase.designation;
          }
          const designationMap: Record<number, string> = {
            1: 'REMPLACANT(E)',
            2: 'ADMINISTRATION',
            3: 'VISA SUPERVISEUR',
            4: 'APPROBATION COORDINA',
            5: 'APPROBATION COORDINA',
          };
          return designationMap[fkPhase] || 'Phase inconnue';
        };

        // Récupérer tous les traitements de cette demande avec les informations utilisateur
        const allTraitementsResponse = await fetch(
          `/api/conge/traitements-list?limit=1000&demandeId=${demande.id}`
        );
        const allTraitementsData = await allTraitementsResponse.json();

        const allTraitementsForDemande =
          allTraitementsData.success && allTraitementsData.traitements
            ? allTraitementsData.traitements.filter(
                (t: any) =>
                  Number.parseInt(String(t.fkDemande), 10) ===
                  Number.parseInt(String(demande.id), 10)
              )
            : traitements.filter((t) => t.fkDemande === traitement.fkDemande);

        // Créer une map des traitements par phase pour accès rapide
        const traitementsByPhase = new Map<number, any>();
        allTraitementsForDemande.forEach((t: any) => {
          if (t.fkPhase) {
            traitementsByPhase.set(Number.parseInt(String(t.fkPhase), 10), t);
          }
        });

        // Créer une liste complète des 5 phases avec leurs traitements (ou null si non traité)
        const allPhases = [1, 2, 3, 4, 5].map((phaseId) => {
          const traitement = traitementsByPhase.get(phaseId);
          return {
            fkPhase: phaseId,
            ...traitement, // Inclure toutes les propriétés du traitement s'il existe
          };
        });

        // Créer une nouvelle fenêtre pour l'impression
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          showError(
            'Erreur',
            "Veuillez autoriser les pop-ups pour l'impression"
          );
          return;
        }

        // Générer le contenu HTML du rapport
        const rapportHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Rapport de Demande de Congé #${demande.id}</title>
            <style>
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #333;
              }
              .header {
                text-align: center;
                border-bottom: 3px solid #10b981;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header h1 {
                color: #1f2937;
                margin: 10px 0;
              }
              .section {
                margin-bottom: 25px;
              }
              .section-title {
                background-color: #f3f4f6;
                padding: 10px;
                font-weight: bold;
                border-left: 4px solid #10b981;
                margin-bottom: 15px;
              }
              .info-row {
                display: flex;
                margin-bottom: 10px;
                padding: 5px 0;
                border-bottom: 1px dotted #e5e7eb;
              }
              .info-label {
                font-weight: bold;
                width: 200px;
                color: #6b7280;
              }
              .info-value {
                flex: 1;
                color: #1f2937;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
              }
              th, td {
                border: 1px solid #e5e7eb;
                padding: 10px;
                text-align: left;
              }
              th {
                background-color: #f3f4f6;
                font-weight: bold;
              }
              .badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
              }
              .badge-success { background-color: #d1fae5; color: #065f46; }
              .badge-danger { background-color: #fee2e2; color: #991b1b; }
              .badge-warning { background-color: #fef3c7; color: #92400e; }
              .badge-info { background-color: #dbeafe; color: #1e40af; }
              .print-button {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 20px;
                background-color: #10b981;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
                z-index: 1000;
              }
              .print-button:hover {
                background-color: #059669;
              }
              @media print {
                .print-button { display: none; }
              }
            </style>
          </head>
          <body>
            <button class="print-button no-print" onclick="window.print()">🖨️ Imprimer</button>

            <div class="header">
              <h1>RAPPORT DE DEMANDE DE CONGÉ</h1>
              <p>Demande #${demande.id} - Généré le ${new Date().toLocaleDateString(
                'fr-FR',
                {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )}</p>
            </div>

            <div class="section">
              <div class="section-title">INFORMATIONS DE LA DEMANDE</div>
              <div class="info-row">
                <div class="info-label">Demandeur :</div>
                <div class="info-value">${demande.demandeur || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Période :</div>
                <div class="info-value">${demande.du ? new Date(demande.du).toLocaleDateString('fr-FR') : 'N/A'} - ${demande.au ? new Date(demande.au).toLocaleDateString('fr-FR') : 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Nombre de jours :</div>
                <div class="info-value">${demande.nbrjour || 0} jour(s)</div>
              </div>
              <div class="info-row">
                <div class="info-label">Section :</div>
                <div class="info-value">${demande.section || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Remplaçant :</div>
                <div class="info-value">${demande.nomsremplacant || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Statut :</div>
                <div class="info-value">${demande.statut || 'N/A'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">ÉTAT DU TRAITEMENT PAR PHASES</div>
              <table>
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Observations</th>
                    <th>Conformité</th>
                    <th>Approbation</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  ${allPhases
                    .map((t: any) => {
                      const phaseLabel = getPhaseLabelForReport(t.fkPhase);
                      const isTraité = !!t.observations;
                      const conformiteBadge = !isTraité
                        ? '<span class="badge badge-warning">En attente</span>'
                        : t.conformite === true
                          ? '<span class="badge badge-success">Oui</span>'
                          : t.conformite === false
                            ? '<span class="badge badge-danger">Non</span>'
                            : '<span class="badge badge-info">Non défini</span>';

                      const approbationBadge = !isTraité
                        ? '<span class="badge badge-warning">En attente</span>'
                        : t.approbation === true
                          ? '<span class="badge badge-success">Approuvé</span>'
                          : t.approbation === false
                            ? '<span class="badge badge-danger">Refusé</span>'
                            : '<span class="badge badge-info">En attente</span>';

                      return `
                        <tr>
                          <td><strong>${phaseLabel}</strong></td>
                          <td>${t.observations || '<em>Aucune observation</em>'}</td>
                          <td>${conformiteBadge}</td>
                          <td>${approbationBadge}</td>
                          <td>${t.dateupdate ? new Date(t.dateupdate).toLocaleDateString('fr-FR') : 'N/A'}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <div class="section">
              <div class="section-title">LISTE DES PERSONNES AYANT TRAITÉ</div>
              <table>
                <thead>
                  <tr>
                    <th>Phase</th>
                    <th>Nom complet</th>
                    <th>Fonction</th>
                    <th>Date de traitement</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  ${allPhases
                    .map((t: any) => {
                      const phaseLabel = getPhaseLabelForReport(t.fkPhase);
                      const isTraité = !!t.observations && !!t.userupdate;

                      if (!isTraité) {
                        return `
                          <tr>
                            <td><strong>${phaseLabel}</strong></td>
                            <td><em>Non traité</em></td>
                            <td>-</td>
                            <td>-</td>
                            <td><span class="badge badge-warning">En attente</span></td>
                          </tr>
                        `;
                      }

                      const user = t.userupdate || {};
                      const fullName =
                        user.fullName ||
                        formatPersonDisplayName(user) ||
                        user.username ||
                        'N/A';
                      const fonction = user.fonction || 'N/A';
                      const dateTraitement = t.dateupdate
                        ? new Date(t.dateupdate).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'N/A';

                      const statutBadge =
                        t.approbation === true
                          ? '<span class="badge badge-success">Approuvé</span>'
                          : t.approbation === false
                            ? '<span class="badge badge-danger">Refusé</span>'
                            : t.conformite === true
                              ? '<span class="badge badge-info">Conforme</span>'
                              : '<span class="badge badge-warning">En cours</span>';

                      return `
                        <tr>
                          <td><strong>${phaseLabel}</strong></td>
                          <td>${fullName}</td>
                          <td>${fonction}</td>
                          <td>${dateTraitement}</td>
                          <td>${statutBadge}</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `;

        updateActionMessage('Génération du rapport...', 'Finalisation');

        printWindow.document.write(rapportHTML);
        printWindow.document.close();

        // Attendre le chargement puis proposer l'impression
        setTimeout(() => {
          printWindow.print();
          stopActionLoader();
          showSuccess(
            'Rapport généré',
            'Le rapport a été ouvert dans une nouvelle fenêtre'
          );
        }, 250);
      } catch (error: any) {
        stopActionLoader();
        showError(
          'Erreur',
          error.message || 'Impossible de générer le rapport'
        );
      }
    },
    [
      demandes,
      phases,
      showError,
      startActionLoader,
      stopActionLoader,
      updateActionMessage,
      showSuccess,
    ]
  );

  // Pas de suppression - les traitements sont gérés automatiquement

  /**
   * Analyse le message d'erreur pour déterminer le type de blocage
   * et génère un message personnalisé avec des détails clairs
   */
  const parseErrorMessage = (
    message: string
  ): { title: string; details: string } => {
    if (message.toLowerCase().includes("remplaçant n'a pas encore validé")) {
      return {
        title: 'Validation du remplaçant requise',
        details:
          "Le remplaçant doit d'abord valider la demande avant de permettre le traitement par les autres phases.",
      };
    }

    // Détecter si c'est une phase inférieure qui bloque
    const phaseInferieureMatch = message.match(
      /La phase (\d+) doit être traitée avant de pouvoir traiter la phase (\d+)/
    );
    if (phaseInferieureMatch) {
      const phaseBloquante = parseInt(phaseInferieureMatch[1]);
      const phaseActuelle = parseInt(phaseInferieureMatch[2]);
      const phaseBloquanteLabel = getPhaseLabel(phaseBloquante);
      const phaseActuelleLabel = getPhaseLabel(phaseActuelle);
      return {
        title: '⏳ Phase précédente non traitée',
        details: `Vous ne pouvez pas traiter la ${phaseActuelleLabel} car la ${phaseBloquanteLabel} n'a pas encore été complétée. Le traitement doit suivre l'ordre séquentiel des phases. Veuillez attendre que la phase ${phaseBloquante} soit traitée.`,
      };
    }

    // Détecter si c'est une phase supérieure qui bloque (cas générique)
    const phaseSuperieureMatch1 = message.match(
      /La phase (\d+) a déjà été traitée\. Vous ne pouvez pas modifier la phase (\d+)/
    );
    if (phaseSuperieureMatch1) {
      const phaseSuperieure = parseInt(phaseSuperieureMatch1[1]);
      const phaseActuelle = parseInt(phaseSuperieureMatch1[2]);
      const phaseSuperieureLabel = getPhaseLabel(phaseSuperieure);
      const phaseActuelleLabel = getPhaseLabel(phaseActuelle);
      return {
        title: '🔒 Phase suivante déjà traitée',
        details: `Vous ne pouvez pas modifier la ${phaseActuelleLabel} car la ${phaseSuperieureLabel} a déjà été traitée. Une fois qu'une phase ultérieure est complétée, les phases précédentes deviennent verrouillées.`,
      };
    }

    // Détecter si c'est une phase supérieure qui bloque (cas simple)
    const phaseSuperieureMatch2 = message.match(
      /La phase (\d+) a déjà été traitée/
    );
    if (phaseSuperieureMatch2) {
      const phaseSuperieure = parseInt(phaseSuperieureMatch2[1]);
      const phaseSuperieureLabel = getPhaseLabel(phaseSuperieure);
      return {
        title: '🔒 Phase ultérieure déjà traitée',
        details: `La ${phaseSuperieureLabel} a déjà été traitée. Vous ne pouvez plus modifier les phases précédentes une fois qu'une phase ultérieure a été complétée.`,
      };
    }

    // Cas spécial : phase 4 ou 5 déjà traitée
    const phase45Match = message.match(
      /La phase ([45]) a déjà été traitée\. Vous ne pouvez pas traiter la phase ([45])/
    );
    if (phase45Match) {
      const phaseTraitée = parseInt(phase45Match[1]);
      const phaseBloquée = parseInt(phase45Match[2]);
      const phaseTraitéeLabel = getPhaseLabel(phaseTraitée);
      const phaseBloquéeLabel = getPhaseLabel(phaseBloquée);
      return {
        title: '⚠️ Phase alternative déjà traitée',
        details: `La ${phaseTraitéeLabel} a déjà été traitée. Pour les phases 4 et 5, seule l'une d'elles peut être traitée. Vous ne pouvez pas traiter la ${phaseBloquéeLabel}.`,
      };
    }

    // Message par défaut
    return {
      title: '⚠️ Traitement impossible',
      details:
        message ||
        "Impossible d'enregistrer le traitement. Veuillez vérifier que toutes les phases précédentes ont été traitées dans l'ordre.",
    };
  };

  const handleFormSubmit = useCallback(
    async (data: any) => {
      if (!editingTraitement) {
        showError('Erreur', 'Aucun traitement sélectionné pour le traitement');
        return;
      }

      startActionLoader('Traitement en cours...', 'Enregistrement des données');

      try {
        setIsSubmitting(true);
        console.log(
          '🔄 Traitement de la demande - ID traitement:',
          editingTraitement.id
        );
        console.log('📦 Données envoyées:', JSON.stringify(data, null, 2));

        updateActionMessage('Traitement en cours...', 'Envoi au serveur');

        // Mettre à jour uniquement les champs éditables (observations, conformite, approbation)
        const updateData = {
          observations: data.observations,
          conformite: data.conformite,
          approbation: data.approbation,
          // fkDemande et fkPhase ne doivent pas être modifiés
          fkDemande: editingTraitement.fkDemande,
          fkPhase: editingTraitement.fkPhase,
        };

        const response = await apiPut<{
          success: boolean;
          traitement: Traitement;
          message?: string;
        }>(
          `/api/conge/traitements-list?id=${editingTraitement.id}`,
          updateData
        );

        if (response.success) {
          updateActionMessage(
            'Traitement en cours...',
            'Mise à jour des données'
          );

          console.log(
            '✅ Traitement effectué avec succès, rechargement des données...'
          );
          // Recharger les données depuis le serveur pour s'assurer d'avoir les dernières données
          await fetchTraitements();

          stopActionLoader();
          showSuccess(
            '✅ Traitement effectué',
            'Le traitement a été enregistré avec succès'
          );
          setShowForm(false);
          setEditingTraitement(null);
        } else {
          stopActionLoader();
          console.error('❌ Erreur lors du traitement:', response.message);
          // Analyser et afficher un message personnalisé
          const errorInfo = parseErrorMessage(
            response.message || "Impossible d'enregistrer le traitement"
          );
          showError(errorInfo.title, errorInfo.details);
        }
      } catch (error: any) {
        stopActionLoader();
        console.error('❌ Erreur lors de la sauvegarde du traitement:', error);
        console.error('❌ Détails:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });
        // Analyser le message d'erreur de l'exception
        const errorMessage =
          error?.response?.data?.message ||
          error?.message ||
          'Impossible de sauvegarder le traitement';
        const errorInfo = parseErrorMessage(errorMessage);
        showError(errorInfo.title, errorInfo.details);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      editingTraitement,
      showSuccess,
      showError,
      fetchTraitements,
      startActionLoader,
      stopActionLoader,
      updateActionMessage,
    ]
  );

  const getDemandeLabel = (fkDemande?: number) => {
    if (!fkDemande) return 'Non définie';
    const demande = demandes.find((d) => d.id === fkDemande);
    if (!demande) return `Demande #${fkDemande}`;
    return `#${demande.id} - ${demande.demandeur || 'Sans demandeur'} (${
      demande.du ? new Date(demande.du).toLocaleDateString('fr-FR') : 'N/A'
    })`;
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

  // Fonction pour vérifier si un traitement est traité
  const isTraitementTraite = useCallback((traitement: Traitement): boolean => {
    return !!(
      traitement.observations &&
      (traitement.approbation !== null || traitement.conformite !== null)
    );
  }, []);

  // Fonctions helper mémorisées pour éviter les recalculs
  const getDemandeLabelMemo = useCallback(
    (fkDemande?: number) => {
      if (!fkDemande) return 'Non définie';
      const demande = demandes.find((d) => d.id === fkDemande);
      if (!demande) return `Demande #${fkDemande}`;
      return `#${demande.id} - ${demande.demandeur || 'Sans demandeur'} (${
        demande.du ? new Date(demande.du).toLocaleDateString('fr-FR') : 'N/A'
      })`;
    },
    [demandes]
  );

  const getPhaseLabelMemo = useCallback(
    (fkPhase?: number) => {
      if (!fkPhase) return 'Non définie';
      const phase = phases.find((p) => p.id === fkPhase);
      if (phase?.designation) {
        return phase.designation;
      }
      const designationMap: Record<number, string> = {
        1: 'REMPLACANT(E)',
        2: 'ADMINISTRATION',
        3: 'VISA SUPERVISEUR',
        4: 'APPROBATION COORDINA',
        5: 'APPROBATION COORDINA',
      };
      return designationMap[fkPhase] || 'Phase inconnue';
    },
    [phases]
  );

  // Filtrer et trier les traitements avec useMemo pour optimiser les performances
  const filteredTraitements = useMemo(() => {
    return traitements
      .filter((traitement) => {
        // Filtre par recherche (avec debounce)
        if (debouncedSearchTerm) {
          const searchLower = debouncedSearchTerm.toLowerCase();
          const matchesSearch =
            (traitement.observations || '')
              .toLowerCase()
              .includes(searchLower) ||
            getDemandeLabelMemo(traitement.fkDemande)
              .toLowerCase()
              .includes(searchLower) ||
            getPhaseLabelMemo(traitement.fkPhase)
              .toLowerCase()
              .includes(searchLower);
          if (!matchesSearch) return false;
        }

        // Filtre par statut traité/non traité
        if (showTraitesOnly) {
          return isTraitementTraite(traitement);
        }

        return true;
      })
      .sort((a, b) => {
        // Trier par date de création décroissante (plus récent en premier)
        const dateA = a.datecreate ? new Date(a.datecreate).getTime() : 0;
        const dateB = b.datecreate ? new Date(b.datecreate).getTime() : 0;
        return dateB - dateA;
      });
  }, [
    traitements,
    debouncedSearchTerm,
    showTraitesOnly,
    getDemandeLabelMemo,
    getPhaseLabelMemo,
    isTraitementTraite,
  ]);

  /** Une ligne par individu (demandeur) ; demandes + phases agrégées */
  const agentRows = useMemo(() => {
    const idSet = new Set<number>();
    for (const t of filteredTraitements) {
      if (t.fkDemande != null && !Number.isNaN(Number(t.fkDemande))) {
        idSet.add(t.fkDemande);
      }
    }
    const userId = Number(user?.id);
    const demandeGroups = Array.from(idSet).map((fkDemande) => {
      const allForDemande = traitements
        .filter((t) => t.fkDemande === fkDemande)
        .sort((a, b) => (a.fkPhase ?? 0) - (b.fkPhase ?? 0));
      const demande = demandes.find((d) => d.id === fkDemande);
      const canUserAct = allForDemande.some(
        (t) => Number(t.userupdateid) === userId && !t.observations
      );
      const latest = Math.max(
        0,
        ...allForDemande.map((t) =>
          t.datecreate ? new Date(t.datecreate).getTime() : 0
        )
      );
      const phasesTraitees = allForDemande.filter(isTraitementTraite).length;
      return {
        fkDemande,
        traitements: allForDemande,
        demande,
        canUserAct,
        latest,
        phasesTraitees,
        phasesTotal: allForDemande.length,
        agentKey:
          demande?.usercreateid != null
            ? `u:${demande.usercreateid}`
            : `n:${(demande?.demandeur || 'inconnu').trim().toLowerCase()}`,
        demandeurLabel: demande?.demandeur || `Demande #${fkDemande}`,
      };
    });

    const byAgent = new Map<string, typeof demandeGroups>();
    for (const g of demandeGroups) {
      const list = byAgent.get(g.agentKey) || [];
      list.push(g);
      byAgent.set(g.agentKey, list);
    }

    return Array.from(byAgent.entries())
      .map(([agentKey, demandesAgent]) => {
        const canUserAct = demandesAgent.some((d) => d.canUserAct);
        const latest = Math.max(0, ...demandesAgent.map((d) => d.latest));
        const demandeurLabel =
          demandesAgent[0]?.demandeurLabel || 'Demandeur N/A';
        return {
          agentKey,
          demandeurLabel,
          demandes: demandesAgent,
          canUserAct,
          latest,
          demandesCount: demandesAgent.length,
          pendingCount: demandesAgent.filter((d) => d.canUserAct).length,
        };
      })
      .sort((a, b) => b.latest - a.latest);
  }, [
    filteredTraitements,
    traitements,
    demandes,
    user?.id,
    isTraitementTraite,
  ]);

  useEffect(() => {
    setDetailAgentRow((prev) => {
      if (!prev) return prev;
      const nextDemandes = prev.demandes.map((d) => ({
        ...d,
        traitements: traitements
          .filter((t) => t.fkDemande === d.fkDemande)
          .sort((a, b) => (a.fkPhase ?? 0) - (b.fkPhase ?? 0)),
      }));
      return { ...prev, demandes: nextDemandes };
    });
  }, [traitements]);

  useEffect(() => {
    if (!detailAgentRow) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDetailAgentRow(null);
        setExpandedDemandeId(null);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [detailAgentRow]);

  useEffect(() => {
    if (!expandedDemandeId) {
      setFichiersDemande([]);
      return;
    }
    (async () => {
      try {
        const res = await apiGet<{
          success: boolean;
          fichiers?: Array<{
            id: number;
            nom_original: string;
            url: string;
            mime?: string;
          }>;
        }>(`/api/conge/demande-fichiers?demandeId=${expandedDemandeId}`);
        if (res.success) setFichiersDemande(res.fichiers || []);
      } catch {
        setFichiersDemande([]);
      }
    })();
  }, [expandedDemandeId]);

  const saveObservationPrincipale = async (demandeId: number) => {
    try {
      setSavingObs(true);
      const res = await fetch('/api/conge/observation-principal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demandeId,
          observations: obsText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(
          'Observation enregistrée',
          'Observation optionnelle (non bloquante) enregistrée'
        );
        setObsText('');
      } else {
        showError('Erreur observation', data.message || 'Erreur observation');
      }
    } catch (e: any) {
      showError('Erreur observation', e?.message || 'Erreur observation');
    } finally {
      setSavingObs(false);
    }
  };

  return (
    <CongeAppShell>
      {/* Action loader global */}
      {ActionLoaderComponent}

      {/* Page loader global */}
      <PageLoader
        loading={loading && !traitements.length}
        text="Chargement des traitements..."
      />

      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="bg-white shadow rounded-lg animate-fade-in">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    Traitement des Demandes
                    {notificationCount > 0 && (
                      <span className="bg-red-500 text-white text-xs font-semibold px-2.5 py-1 rounded-full animate-pulse">
                        {notificationCount}
                      </span>
                    )}
                    {(fetchingTraitements ||
                      fetchingDemandes ||
                      fetchingPhases) && <Loader size="sm" className="ml-2" />}
                  </h1>
                  <p className="text-sm text-gray-500">
                    Une ligne par agent (demandeur). Cliquez pour voir ses
                    demandes et phases. Le fond vert clair indique qu&apos;une
                    action vous est assignée ; les autres lignes sont en
                    consultation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              {/* Filter Checkbox */}
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showTraitesOnly}
                    onChange={(e) => setShowTraitesOnly(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Demande traitée
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Liste regroupée par individu */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Agents ({agentRows.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading && !traitements.length ? (
              <div className="flex justify-center items-center py-12">
                <Loader size="lg" text="Chargement des traitements..." />
              </div>
            ) : agentRows.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucun agent trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Aucune entrée ne correspond à votre recherche.'
                    : "Vous n'avez aucun traitement assigné à votre compte."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Agent / demandes
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading && !traitements.length ? (
                    <>
                      <TableRowSkeleton cols={2} />
                      <TableRowSkeleton cols={2} />
                    </>
                  ) : (
                    agentRows.map((row) => (
                      <tr
                        key={row.agentKey}
                        tabIndex={0}
                        aria-label={`Ouvrir les demandes de ${row.demandeurLabel}`}
                        onClick={() => {
                          setDetailAgentRow({
                            agentKey: row.agentKey,
                            demandeurLabel: row.demandeurLabel,
                            demandes: row.demandes,
                          });
                          const firstAct = row.demandes.find((d) => d.canUserAct);
                          setExpandedDemandeId(
                            firstAct?.fkDemande ?? row.demandes[0]?.fkDemande ?? null
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setDetailAgentRow({
                              agentKey: row.agentKey,
                              demandeurLabel: row.demandeurLabel,
                              demandes: row.demandes,
                            });
                            setExpandedDemandeId(
                              row.demandes[0]?.fkDemande ?? null
                            );
                          }
                        }}
                        className={cn(
                          'cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500',
                          row.canUserAct
                            ? 'bg-emerald-50 hover:bg-emerald-100/90 text-gray-900'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100/80'
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-2 min-w-0">
                            <ChevronRightIcon
                              className={cn(
                                'h-5 w-5 shrink-0 mt-0.5',
                                row.canUserAct
                                  ? 'text-emerald-700'
                                  : 'text-gray-400'
                              )}
                              aria-hidden
                            />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold truncate">
                                {row.demandeurLabel}
                              </div>
                              <div className="text-xs truncate mt-0.5">
                                {row.demandesCount} demande
                                {row.demandesCount > 1 ? 's' : ''}
                                {row.pendingCount > 0 ? (
                                  <span className="ml-2 font-medium text-emerald-800">
                                    — {row.pendingCount} action
                                    {row.pendingCount > 1 ? 's' : ''} requise
                                    {row.pendingCount > 1 ? 's' : ''}
                                  </span>
                                ) : (
                                  <span className="ml-2 text-gray-500">
                                    — Consultation
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap align-middle">
                          <button
                            type="button"
                            className="inline-flex p-2 rounded-md text-gray-600 hover:bg-white/80 hover:text-gray-900"
                            title="Imprimer la première demande"
                            onClick={(e) => {
                              e.stopPropagation();
                              const first = row.demandes[0]?.traitements[0];
                              if (first) handleImprimer(first);
                            }}
                          >
                            <PrinterIcon className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Détail par individu : demandes + phases */}
      {detailAgentRow && (
        <div className="fixed inset-0 z-[35] overflow-y-auto bg-gray-600/50 backdrop-blur-sm flex items-center justify-center p-4 relative">
          <button
            type="button"
            tabIndex={-1}
            className="absolute inset-0 cursor-default"
            aria-label="Fermer le panneau détail"
            onClick={() => {
              setDetailAgentRow(null);
              setExpandedDemandeId(null);
            }}
          />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col z-[1]">
            <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4 shrink-0">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  {detailAgentRow.demandeurLabel}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {detailAgentRow.demandes.length} demande
                  {detailAgentRow.demandes.length > 1 ? 's' : ''} — sélectionnez
                  une demande pour voir les phases
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 shrink-0"
                onClick={() => {
                  setDetailAgentRow(null);
                  setExpandedDemandeId(null);
                }}
              >
                <span className="sr-only">Fermer</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-4">
              {detailAgentRow.demandes.map((dRow) => {
                const isOpen = expandedDemandeId === dRow.fkDemande;
                const d = dRow.demande;
                return (
                  <div
                    key={dRow.fkDemande}
                    className={cn(
                      'border rounded-lg overflow-hidden',
                      dRow.canUserAct
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-gray-200'
                    )}
                  >
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3 flex items-center justify-between gap-2 hover:bg-white/60"
                      onClick={() =>
                        setExpandedDemandeId(isOpen ? null : dRow.fkDemande)
                      }
                    >
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          Demande #{dRow.fkDemande}
                          {dRow.canUserAct ? (
                            <span className="ml-2 text-xs font-medium text-emerald-800">
                              Action requise
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-gray-600 mt-0.5">
                          {d?.du
                            ? new Date(d.du).toLocaleDateString('fr-FR')
                            : '?'}{' '}
                          →{' '}
                          {d?.au
                            ? new Date(d.au).toLocaleDateString('fr-FR')
                            : '?'}{' '}
                          · {d?.nbrjour ?? '?'} j. · {dRow.phasesTraitees}/
                          {dRow.phasesTotal} phase(s)
                        </div>
                      </div>
                      <ChevronRightIcon
                        className={cn(
                          'h-5 w-5 text-gray-400 transition-transform',
                          isOpen && 'rotate-90'
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-200 bg-white p-3 space-y-3">
                        {fichiersDemande.length > 0 && (
                          <div className="text-sm">
                            <div className="font-medium text-gray-800 mb-1">
                              Pièces jointes
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {fichiersDemande.map((f) => (
                                <li key={f.id}>
                                  <a
                                    href={
                                      f.url?.includes('download=1')
                                        ? f.url
                                        : `/api/conge/demande-fichiers?id=${f.id}&download=1`
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {f.nom_original}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
                          <div className="text-xs font-medium text-amber-900">
                            Observation superviseur principal (optionnelle, non
                            bloquante)
                          </div>
                          <textarea
                            className="w-full text-sm rounded border-gray-300"
                            rows={2}
                            value={obsText}
                            onChange={(e) => setObsText(e.target.value)}
                            placeholder="Commentaire libre…"
                          />
                          <button
                            type="button"
                            disabled={savingObs || !obsText.trim()}
                            onClick={() =>
                              saveObservationPrincipale(dRow.fkDemande)
                            }
                            className="text-xs px-3 py-1.5 rounded bg-amber-700 text-white disabled:opacity-50"
                          >
                            {savingObs ? 'Enregistrement…' : 'Enregistrer'}
                          </button>
                        </div>
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Phase
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Observations
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {dRow.traitements.map((traitement) => {
                              const isMine =
                                Number(traitement.userupdateid) ===
                                Number(user?.id);
                              return (
                                <tr
                                  key={traitement.id}
                                  className={
                                    isMine && !traitement.observations
                                      ? 'bg-emerald-50/90'
                                      : 'bg-gray-50/80 text-gray-600'
                                  }
                                >
                                  <td className="px-3 py-2 whitespace-nowrap font-medium text-gray-900">
                                    {getPhaseLabelMemo(traitement.fkPhase)}
                                  </td>
                                  <td className="px-3 py-2 max-w-[14rem]">
                                    <div
                                      className="truncate"
                                      title={traitement.observations}
                                    >
                                      {traitement.observations || (
                                        <span className="text-gray-400 italic">
                                          Aucune observation
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {traitement.observations ? (
                                        <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                          Traité
                                        </span>
                                      ) : isMine ? (
                                        <Can
                                          permissions={[
                                            PERMISSIONS.CONGE_TRAITEMENT_ACT,
                                            PERMISSIONS.CONGE_TRAITEMENT,
                                            PERMISSIONS.MODULE_ADMIN,
                                          ]}
                                        >
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              void handleTraiter(traitement);
                                            }}
                                            className="text-indigo-600 hover:text-indigo-900 font-medium"
                                          >
                                            Traiter
                                          </button>
                                        </Can>
                                      ) : (
                                        <span className="text-xs text-gray-400 italic">
                                          Assigné à un autre
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleImprimer(traitement)
                                        }
                                        className="text-gray-600 hover:text-gray-900 p-1"
                                        title="Imprimer"
                                      >
                                        <PrinterIcon className="h-5 w-5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal de formulaire avec animations */}
      {showForm && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-scale-in relative">
            {/* Indicateur de chargement en haut du modal */}
            {isSubmitting && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer"></div>
              </div>
            )}
            <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Traiter la demande
                </h3>
                {isSubmitting && (
                  <div className="flex items-center space-x-2">
                    <Loader size="sm" variant="primary" />
                    <span className="text-xs text-gray-500 animate-pulse">
                      Traitement...
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingTraitement(null);
                }}
                disabled={isSubmitting}
                className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Fermer</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div
              className={isSubmitting ? 'opacity-50 pointer-events-none' : ''}
            >
              <TraitementForm
                onSubmit={handleFormSubmit}
                initialData={
                  editingTraitement
                    ? {
                        fkDemande: editingTraitement.fkDemande,
                        fkPhase: editingTraitement.fkPhase,
                        observations: editingTraitement.observations,
                        conformite: editingTraitement.conformite ?? undefined,
                        approbation: editingTraitement.approbation ?? undefined,
                      }
                    : undefined
                }
                submitLabel={isRole5Personnel ? 'Traiter' : 'Valider'}
                readOnly={false}
                cancelLabel="Annuler"
                onCancel={() => {
                  setShowForm(false);
                  setEditingTraitement(null);
                }}
                loading={isSubmitting}
                demandes={demandes.map((d) => ({
                  id: d.id,
                  label: getDemandeLabel(d.id),
                }))}
                phases={phases.map((p) => ({
                  id: p.id,
                  designation: p.designation || `Phase ${p.id}`,
                }))}
                canEditConformite={isRole5Personnel}
                canEditApprobation={true}
                approbationLabel="Valider"
              />
            </div>

            {/* Overlay loader si soumission en cours */}
            {isSubmitting && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 backdrop-blur-sm rounded-lg z-10">
                <div className="bg-white p-8 rounded-xl shadow-2xl border border-gray-100">
                  <Loader size="lg" text="Traitement en cours..." />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pas de boîte de dialogue de suppression - les traitements ne peuvent pas être supprimés */}
    </CongeAppShell>
  );
};

export default TraitementDemandesPage;
