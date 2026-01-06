import TraitementForm from '@/components/forms/TraitementForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import { useActionLoader } from '@/components/ui/ActionLoader';
import { Loader } from '@/components/ui/Loader';
import { PageLoader, TableRowSkeleton } from '@/components/ui/PageLoader';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPut } from '@/lib/fetcher';
import {
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
            id: parseInt(traitement.id.toString()),
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
      }>('/api/conge/demandes?limit=1000');
      if (response.success) {
        setDemandes(
          response.demandes.map((demande) => ({
            ...demande,
            id: parseInt(demande.id.toString()),
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
    (traitement: Traitement) => {
      startActionLoader(
        'Chargement du formulaire...',
        'Préparation des données'
      );

      // Petit délai pour afficher le loader avant d'ouvrir le formulaire
      setTimeout(() => {
        setEditingTraitement(traitement);
        setShowForm(true);
        stopActionLoader();
      }, 150);
    },
    [startActionLoader, stopActionLoader]
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
        }>(`/api/conge/demandes?limit=1000`);

        const demande = demandeResponse.demandes?.find(
          (d) => d.id === traitement.fkDemande
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
                (t: any) => t.fkDemande === demande.id
              )
            : traitements.filter((t) => t.fkDemande === traitement.fkDemande);

        // Créer une map des traitements par phase pour accès rapide
        const traitementsByPhase = new Map<number, any>();
        allTraitementsForDemande.forEach((t: any) => {
          if (t.fkPhase) {
            traitementsByPhase.set(t.fkPhase, t);
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
                        `${user.nom || ''} ${user.prenom || ''}`.trim() ||
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
  const isTraitementTraite = (traitement: Traitement): boolean => {
    // Un traitement est considéré comme "traité" s'il a des observations
    // ET (approbation !== null OU conformite !== null)
    return !!(
      traitement.observations &&
      (traitement.approbation !== null || traitement.conformite !== null)
    );
  };

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
  ]);

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
                    Traitements de congés assignés à votre compte
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

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Traitements ({filteredTraitements.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading && !traitements.length ? (
              <div className="flex justify-center items-center py-12">
                <Loader size="lg" text="Chargement des traitements..." />
              </div>
            ) : filteredTraitements.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucun traitement trouvé
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Aucun traitement ne correspond à votre recherche.'
                    : "Vous n'avez aucun traitement assigné à votre compte."}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DEMANDE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PHASE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      OBSERVATIONS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CONFORMITÉ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      APPROBATION
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading && !traitements.length ? (
                    <>
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                      <TableRowSkeleton cols={6} />
                    </>
                  ) : (
                    filteredTraitements.map((traitement) => (
                      <tr key={traitement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {getDemandeLabelMemo(traitement.fkDemande)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getPhaseLabelMemo(traitement.fkPhase)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {traitement.observations || (
                              <span className="text-gray-400 italic">
                                Aucune observation
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!traitement.observations ? (
                            // Traitement non fait - toujours "En attente"
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              En attente
                            </span>
                          ) : traitement.conformite === true ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Oui
                            </span>
                          ) : traitement.conformite === false ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Non
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              Non défini
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {!traitement.observations ? (
                            // Traitement non fait - toujours "En attente"
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              En attente
                            </span>
                          ) : traitement.approbation === true ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Approuvé
                            </span>
                          ) : traitement.approbation === false ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Refusé
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              En attente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {traitement.observations ? (
                              // Phase déjà traitée - afficher un badge
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                Traité
                              </span>
                            ) : (
                              // Phase non traitée - afficher le bouton
                              <button
                                onClick={() => handleTraiter(traitement)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors duration-200"
                              >
                                Traiter
                              </button>
                            )}
                            {/* Bouton Imprimer */}
                            <button
                              onClick={() => handleImprimer(traitement)}
                              className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                              title="Imprimer le rapport de la demande"
                            >
                              <PrinterIcon className="h-5 w-5" />
                            </button>
                          </div>
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

      {/* Modal de formulaire avec animations */}
      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gray-600 bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                submitLabel="Traiter"
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
