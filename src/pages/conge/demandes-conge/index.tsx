import DemandeCongeForm from '@/components/forms/DemandeCongeForm';
import CongeAppShell from '@/components/layout/CongeAppShell';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { apiGet, apiPost, apiPut } from '@/lib/fetcher';
import {
  DocumentTextIcon,
  PlusIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import React, { useEffect, useState } from 'react';

interface DemandeConge {
  id: number;
  fkSoldes?: string;
  fkTypeConge?: number;
  section?: string;
  remiseetreprise?: string;
  nbrjour?: number;
  soldeconge?: number;
  du?: string;
  au?: string;
  statut?: string;
  niveau?: number;
  demandeur?: string;
  idremplacant?: number;
  nomsremplacant?: string;
  idSuperviseur?: number;
  datecreate: string;
  dateupdate?: string;
  usercreateid?: number;
  userupdateid?: number;
}

interface TypeConge {
  id: number;
  nom: string;
}

const DemandeCongePage: React.FC = () => {
  const { showSuccess, showError } = useToast();
  const { user } = useAuth();
  const [demandes, setDemandes] = useState<DemandeConge[]>([]);
  const [typesConges, setTypesConges] = useState<TypeConge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDemande, setEditingDemande] = useState<DemandeConge | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demandeToAnnuler, setDemandeToAnnuler] = useState<DemandeConge | null>(
    null
  );
  const [showAnnulerDialog, setShowAnnulerDialog] = useState(false);
  const [isAnnulating, setIsAnnulating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  useEffect(() => {
    fetchDemandes();
    fetchTypesConges();
  }, []);

  const fetchDemandes = async () => {
    try {
      setLoading(true);
      const response = await apiGet<{
        success: boolean;
        demandes: DemandeConge[];
      }>('/api/conge/demandes');
      if (response.success) {
        setDemandes(
          response.demandes.map((demande) => ({
            ...demande,
            id: parseInt(demande.id.toString()),
          }))
        );
      } else {
        showError(
          'Erreur de chargement',
          'Impossible de charger les demandes de congés'
        );
      }
    } catch (error: any) {
      showError(
        'Erreur de chargement',
        error.message || 'Impossible de charger les demandes de congés'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchTypesConges = async () => {
    try {
      const response = await apiGet<{
        success: boolean;
        typesConges: TypeConge[];
      }>('/api/admin/personnel/types-conges');
      if (response.success) {
        setTypesConges(
          response.typesConges.map((type) => ({
            ...type,
            id: parseInt(type.id.toString()),
          }))
        );
      }
    } catch (error) {
      console.error('Erreur lors du chargement des types de congés:', error);
    }
  };

  const handleCreate = () => {
    try {
      setEditingDemande(null);
      setShowForm(true);
    } catch (error: any) {
      console.error("❌ Erreur lors de l'ouverture du formulaire:", error);
      showError(
        'Erreur',
        "Impossible d'ouvrir le formulaire. Veuillez réessayer."
      );
    }
  };

  const handleEdit = (demande: DemandeConge) => {
    try {
      // Empêcher la modification si le statut n'est pas BROUILLON
      if (demande.statut && demande.statut !== 'BROUILLON') {
        showError(
          'Modification impossible',
          'Seules les demandes au statut "Brouillon" peuvent être modifiées'
        );
        return;
      }
      setEditingDemande(demande);
      setShowForm(true);
    } catch (error: any) {
      console.error("❌ Erreur lors de l'édition de la demande:", error);
      showError(
        'Erreur',
        "Impossible d'ouvrir le formulaire. Veuillez réessayer."
      );
    }
  };

  const handleAnnulerClick = (demande: DemandeConge) => {
    // Empêcher l'annulation si la demande est déjà annulée ou refusée
    if (
      demande.statut &&
      (demande.statut === 'ANNULEE' || demande.statut === 'REFUSEE')
    ) {
      showError(
        'Annulation impossible',
        demande.statut === 'ANNULEE'
          ? 'Cette demande est déjà annulée'
          : 'Une demande refusée ne peut pas être annulée'
      );
      return;
    }
    setDemandeToAnnuler(demande);
    setShowAnnulerDialog(true);
  };

  const handleAnnulerConfirm = async () => {
    if (!demandeToAnnuler) return;

    try {
      setIsAnnulating(true);
      const response = await apiPut<{
        success: boolean;
        demande: DemandeConge;
        message?: string;
      }>(`/api/conge/demandes?id=${demandeToAnnuler.id}`, {
        statut: 'ANNULEE',
      });
      if (response.success) {
        console.log(
          '✅ Demande annulée avec succès, rechargement des données...'
        );
        // Recharger les données depuis le serveur
        await fetchDemandes();
        showSuccess(
          'Demande annulée',
          'La demande de congé a été annulée avec succès'
        );
      } else {
        console.error("❌ Erreur lors de l'annulation:", response.message);
        showError(
          "Erreur d'annulation",
          response.message || "Impossible d'annuler la demande"
        );
      }
    } catch (error: any) {
      console.error("❌ Erreur lors de l'annulation:", error);
      console.error('❌ Détails:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      showError(
        "Erreur d'annulation",
        error?.response?.data?.message ||
          error?.message ||
          "Impossible d'annuler la demande"
      );
    } finally {
      setIsAnnulating(false);
      setShowAnnulerDialog(false);
      setDemandeToAnnuler(null);
    }
  };

  const handleAnnulerCancel = () => {
    setShowAnnulerDialog(false);
    setDemandeToAnnuler(null);
  };

  /**
   * Génère et imprime le rapport de la demande de congé
   */
  const handleImprimer = async (demande: DemandeConge) => {
    try {
      // Récupérer les phases
      const phasesResponse = await apiGet<
        Array<{ id: number; designation?: string }>
      >('/api/admin/personnel/phases');
      const phases = Array.isArray(phasesResponse)
        ? phasesResponse.map((p) => ({
            id: parseInt(p.id.toString()),
            designation: p.designation,
          }))
        : [];

      const getPhaseLabel = (fkPhase?: number): string => {
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

      // Récupérer tous les traitements de cette demande (sans filtre userupdateid)
      // On utilise une requête directe pour obtenir tous les traitements
      const traitementsResponse = await apiGet<{
        success: boolean;
        traitements: Array<{
          id: number;
          fkDemande?: number;
          fkPhase?: number;
          observations?: string;
          conformite?: boolean | null;
          approbation?: boolean | null;
          dateupdate?: string;
          userupdateid?: number;
          userupdate?: {
            id: string;
            nom: string;
            prenom: string;
            postnom?: string;
            username: string;
            fonction: string;
            fullName: string;
          };
        }>;
      }>(`/api/conge/traitements-list?limit=1000`);

      // Pour obtenir TOUS les traitements d'une demande, on doit faire une requête spéciale
      // Pour le moment, récupérons depuis l'API sans filtre (on va créer une route dédiée)
      // En attendant, essayons de récupérer via l'API existante
      let allTraitementsForDemande: any[] = [];

      try {
        // Essayer de récupérer tous les traitements sans filtre utilisateur
        const allTraitementsResponse = await fetch(
          `/api/conge/traitements-list?limit=1000&demandeId=${demande.id}`
        );
        const allTraitementsData = await allTraitementsResponse.json();

        if (allTraitementsData.success && allTraitementsData.traitements) {
          allTraitementsForDemande = allTraitementsData.traitements.filter(
            (t: any) => t.fkDemande === demande.id
          );
        } else {
          // Fallback: utiliser les traitements filtrés
          allTraitementsForDemande =
            traitementsResponse.traitements?.filter(
              (t) => t.fkDemande === demande.id
            ) || [];
        }
      } catch (err) {
        // Fallback en cas d'erreur
        allTraitementsForDemande =
          traitementsResponse.traitements?.filter(
            (t) => t.fkDemande === demande.id
          ) || [];
      }

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
        showError('Erreur', "Veuillez autoriser les pop-ups pour l'impression");
        return;
      }

      // Générer le contenu HTML du rapport (identique à celui de traitement-demandes)
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
                    .map((t) => {
                      const phaseLabel = getPhaseLabel(t.fkPhase);
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
                      const phaseLabel = getPhaseLabel(t.fkPhase);
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

      printWindow.document.write(rapportHTML);
      printWindow.document.close();

      // Attendre le chargement puis proposer l'impression
      setTimeout(() => {
        printWindow.print();
      }, 250);
    } catch (error: any) {
      showError('Erreur', error.message || 'Impossible de générer le rapport');
    }
  };

  const handleFormSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);

      if (editingDemande) {
        console.log('🔄 Modification de la demande ID:', editingDemande.id);
        console.log('📦 Données envoyées:', JSON.stringify(data, null, 2));

        const response = await apiPut<{
          success: boolean;
          demande: DemandeConge;
          message?: string;
        }>(`/api/conge/demandes?id=${editingDemande.id}`, data);

        if (response.success) {
          console.log(
            '✅ Demande modifiée avec succès, rechargement des données...'
          );
          // Recharger les données depuis le serveur pour s'assurer d'avoir les dernières données
          await fetchDemandes();
          showSuccess(
            'Demande modifiée',
            'La demande de congé a été modifiée avec succès'
          );
        } else {
          console.error('❌ Erreur lors de la modification:', response.message);
          showError(
            'Erreur de modification',
            response.message || 'Impossible de modifier la demande'
          );
          return;
        }
      } else {
        console.log("➕ Création d'une nouvelle demande");
        console.log('📦 Données envoyées:', JSON.stringify(data, null, 2));

        const response = await apiPost<{
          success: boolean;
          demande: DemandeConge;
          message?: string;
          error?: string;
        }>('/api/conge/demandes', data);

        if (response.success) {
          console.log(
            '✅ Demande créée avec succès, rechargement des données...'
          );
          // Recharger les données depuis le serveur
          await fetchDemandes();
          showSuccess(
            'Demande créée',
            'La demande de congé a été créée avec succès'
          );
        } else {
          console.error(
            '❌ Erreur lors de la création:',
            response.message || response.error
          );
          const errorMsg =
            response.message ||
            response.error ||
            'Impossible de créer la demande';
          showError('Erreur de création', errorMsg);
          // Ne pas fermer le formulaire en cas d'erreur pour que l'utilisateur puisse corriger
          return;
        }
      }
      setShowForm(false);
      setEditingDemande(null);
    } catch (error: any) {
      console.error('❌ Erreur lors de la sauvegarde:', error);
      console.error('❌ Détails:', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      showError(
        'Erreur de sauvegarde',
        error?.response?.data?.message ||
          error?.message ||
          'Impossible de sauvegarder la demande'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatutLabel = (statut?: string) => {
    const labels: Record<string, string> = {
      BROUILLON: 'Brouillon',
      EN_ATTENTE: 'En attente',
      EN_COURS: 'En cours',
      A_VALIDER: 'À valider',
      A_APPROUVER: 'À approuver',
      APPROUVEE: 'Approuvée',
      REFUSEE: 'Refusée',
      ANNULEE: 'Annulée',
    };
    return labels[statut || ''] || statut || 'Non défini';
  };

  const getStatutColor = (statut?: string) => {
    const colors: Record<string, string> = {
      BROUILLON: 'bg-gray-100 text-gray-800',
      EN_ATTENTE: 'bg-yellow-100 text-yellow-800',
      EN_COURS: 'bg-blue-100 text-blue-800',
      A_VALIDER: 'bg-orange-100 text-orange-800',
      A_APPROUVER: 'bg-purple-100 text-purple-800',
      APPROUVEE: 'bg-green-100 text-green-800',
      REFUSEE: 'bg-red-100 text-red-800',
      ANNULEE: 'bg-gray-100 text-gray-800',
    };
    return colors[statut || ''] || 'bg-gray-100 text-gray-800';
  };

  // Filtrer et trier les demandes (plus récents en premier)
  const filteredDemandes = demandes
    .filter((demande) => {
      // Filtrer par "Mes demandes" si activé
      if (showOnlyMine && user) {
        const userId = Number(user.id);
        const demandeUserId = demande.usercreateid
          ? Number(demande.usercreateid)
          : null;
        if (demandeUserId !== userId) {
          return false;
        }
      }

      // Filtrer par terme de recherche
      if (searchTerm) {
        return (
          demande.section?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          demande.demandeur?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          demande.nomsremplacant
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          getStatutLabel(demande.statut)
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      }

      return true;
    })
    .sort((a, b) => {
      // Trier par date de création décroissante (plus récent en premier)
      const dateA = a.datecreate ? new Date(a.datecreate).getTime() : 0;
      const dateB = b.datecreate ? new Date(b.datecreate).getTime() : 0;
      return dateB - dateA;
    });

  return (
    <CongeAppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Demandes de Congés
                  </h1>
                  <p className="text-sm text-gray-500">
                    Gestion des demandes de congés
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyMine}
                    onChange={(e) => setShowOnlyMine(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Mes demandes uniquement
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
              Demandes de Congés ({filteredDemandes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredDemandes.length === 0 ? (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Aucune demande trouvée
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm
                    ? 'Aucune demande ne correspond à votre recherche.'
                    : 'Commencez par créer une nouvelle demande de congé.'}
                </p>
                {!searchTerm && (
                  <div className="mt-6">
                    <button
                      onClick={handleCreate}
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Nouvelle demande de congé
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DEMANDEUR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      PÉRIODE
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      JOURS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      STATUT
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SECTION
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDemandes.map((demande) => (
                    <tr key={demande.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {demande.demandeur || (
                            <span className="text-gray-400 italic">
                              Non défini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {demande.du && demande.au ? (
                            `${new Date(demande.du).toLocaleDateString('fr-FR')} - ${new Date(demande.au).toLocaleDateString('fr-FR')}`
                          ) : (
                            <span className="text-gray-400 italic">
                              Non définie
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {demande.nbrjour || 0} jour
                          {demande.nbrjour && demande.nbrjour > 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatutColor(
                            demande.statut
                          )}`}
                        >
                          {getStatutLabel(demande.statut)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {demande.section || (
                            <span className="text-gray-400 italic">
                              Non défini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(demande)}
                            disabled={demande.statut !== 'BROUILLON'}
                            className={
                              demande.statut === 'BROUILLON'
                                ? 'text-indigo-600 hover:text-indigo-900 cursor-pointer'
                                : 'text-gray-400 cursor-not-allowed opacity-50'
                            }
                            title={
                              demande.statut !== 'BROUILLON'
                                ? 'Seules les demandes au statut "Brouillon" peuvent être modifiées'
                                : 'Modifier la demande'
                            }
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleAnnulerClick(demande)}
                            disabled={
                              demande.statut === 'ANNULEE' ||
                              demande.statut === 'REFUSEE'
                            }
                            className={
                              demande.statut === 'ANNULEE' ||
                              demande.statut === 'REFUSEE'
                                ? 'text-gray-400 cursor-not-allowed opacity-50'
                                : 'text-orange-600 hover:text-orange-900 cursor-pointer'
                            }
                            title={
                              demande.statut === 'ANNULEE'
                                ? 'Cette demande est déjà annulée'
                                : demande.statut === 'REFUSEE'
                                  ? 'Une demande refusée ne peut pas être annulée'
                                  : 'Annuler la demande (changer le statut en Annulée)'
                            }
                          >
                            Annuler
                          </button>
                          {/* Bouton Imprimer */}
                          <button
                            onClick={() => handleImprimer(demande)}
                            className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
                            title="Imprimer le rapport de la demande"
                          >
                            <PrinterIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal de formulaire */}
      {showForm && (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {editingDemande
                  ? 'Modifier la demande de congé'
                  : 'Nouvelle demande de congé'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingDemande(null);
                }}
                className="text-gray-400 hover:text-gray-500"
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

            <DemandeCongeForm
              onSubmit={handleFormSubmit}
              initialData={
                editingDemande
                  ? {
                      fkTypeConge: editingDemande.fkTypeConge,
                      du: editingDemande.du || '',
                      au: editingDemande.au || '',
                      nbrjour: editingDemande.nbrjour,
                      soldeconge: editingDemande.soldeconge,
                      section: editingDemande.section || '',
                      demandeur: editingDemande.demandeur || '',
                      remiseetreprise: editingDemande.remiseetreprise || '',
                      nomsremplacant: editingDemande.nomsremplacant || '',
                      idremplacant: editingDemande.idremplacant,
                      statut: editingDemande.statut || 'BROUILLON',
                      niveau: editingDemande.niveau || 0,
                      fkSoldes: editingDemande.fkSoldes || '',
                      idSuperviseur: editingDemande.idSuperviseur,
                    }
                  : undefined
              }
              submitLabel={editingDemande ? 'Modifier' : 'Créer'}
              cancelLabel="Annuler"
              onCancel={() => {
                setShowForm(false);
                setEditingDemande(null);
              }}
              loading={isSubmitting}
              typesConges={typesConges}
            />
          </div>
        </div>
      )}

      {/* Boîte de dialogue de confirmation pour annulation */}
      <ConfirmDialog
        isOpen={showAnnulerDialog}
        onClose={handleAnnulerCancel}
        onConfirm={handleAnnulerConfirm}
        title="Annuler la demande de congé"
        message={`Êtes-vous sûr de vouloir annuler la demande de congé ${
          demandeToAnnuler?.demandeur ? `de ${demandeToAnnuler.demandeur}` : ''
        } ? Le statut sera modifié en "Annulée".`}
        type="warning"
        confirmText="Annuler la demande"
        cancelText="Retour"
        loading={isAnnulating}
      />
    </CongeAppShell>
  );
};

export default DemandeCongePage;
