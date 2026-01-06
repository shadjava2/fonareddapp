import { useAuth } from '@/hooks/useAuth';
import { useEffect, useRef, useState } from 'react';

/**
 * Hook pour compter les notifications "Non Ouvert" pour l'utilisateur
 * (utilisé dans la sidebar pour afficher le compteur de "Traitement Demandes")
 */
export const useTraitementCount = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setNotificationCount(0);
      // Nettoyer l'intervalle si l'utilisateur se déconnecte
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const userId = Number(user.id);
    if (isNaN(userId) || userId <= 0) {
      setNotificationCount(0);
      return;
    }

    const fetchNotificationCount = async () => {
      // Éviter les appels multiples simultanés
      if (isFetchingRef.current) {
        console.log('⚠️ TraitementCount: Requête déjà en cours, ignorée');
        return;
      }

      // Annuler la requête précédente si elle existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      isFetchingRef.current = true;
      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 5000); // Timeout de 5 secondes

      try {
        const response = await fetch(`/api/notifications?userId=${userId}`, {
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn(
            `⚠️ TraitementCount: Réponse non-OK ${response.status} pour userId=${userId}`
          );
          return;
        }

        const data = await response.json();

        if (data.success && data.notifications) {
          // Compter uniquement les notifications "Non Ouvert" pour cet utilisateur
          const nonOuvertCount = data.notifications.filter((n: any) => {
            if (!n.contenu) return false;
            const contenu = String(n.contenu).trim();
            // Vérifier aussi que fkUtilisateur correspond (si disponible dans la réponse)
            const isForUser =
              !n.fkUtilisateur || Number(n.fkUtilisateur) === userId;
            const isNonOuvert =
              contenu === 'Non Ouvert' ||
              contenu.includes('Non Ouvert') ||
              contenu.toLowerCase().includes('non ouvert');
            return isForUser && isNonOuvert;
          }).length;

          console.log(
            `🔔 TraitementCount: ${nonOuvertCount} notification(s) "Non Ouvert" trouvée(s) pour userId=${userId}`
          );
          setNotificationCount(nonOuvertCount);
        } else {
          console.warn(
            `⚠️ TraitementCount: Réponse API invalide pour userId=${userId}`
          );
          setNotificationCount(0);
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        // Ignorer les erreurs d'abort (timeout ou annulation)
        if (error?.name === 'AbortError') {
          console.log('⚠️ TraitementCount: Requête annulée');
          return;
        }
        console.error(
          `❌ Erreur lors de la récupération du nombre de notifications pour userId=${userId}:`,
          error?.message || error
        );
        setNotificationCount(0);
      } finally {
        isFetchingRef.current = false;
        abortControllerRef.current = null;
      }
    };

    // Première requête avec un petit délai pour éviter les appels trop fréquents au chargement
    const initialTimer = setTimeout(() => {
      fetchNotificationCount();
    }, 100);

    // Rafraîchir toutes les 30 secondes (au lieu de immédiatement)
    intervalRef.current = setInterval(fetchNotificationCount, 30000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      isFetchingRef.current = false;
    };
  }, [user?.id]); // Dépendance uniquement sur user?.id pour éviter les re-exécutions inutiles

  return notificationCount;
};
