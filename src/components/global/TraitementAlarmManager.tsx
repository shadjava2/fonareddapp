import { useAlarm } from '@/contexts/AlarmContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/router';
import React, { useEffect, useRef } from 'react';

/**
 * Composant global qui gère l'alarme pour les notifications "Non Ouvert"
 * Fonctionne même quand l'utilisateur n'est pas sur la page "Traitement Demandes"
 */
const TraitementAlarmManager: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { setIsAlarmPlaying } = useAlarm();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAlarmPlayingRef = useRef(false);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastNotificationCountRef = useRef(0);

  // Vérifier si la page "Traitement Demandes" est ouverte
  const isPageOpen = router.pathname === '/conge/traitement-demandes';

  // Initialiser l'élément audio
  useEffect(() => {
    if (!audioRef.current) {
      const audio = new Audio('/mixkit-happy-bells-notification-937.wav');
      audio.loop = true;
      audio.volume = 0.7;
      audio.preload = 'auto';
      audioRef.current = audio;

      audio.addEventListener('error', (e) => {
        console.error('❌ Erreur audio globale:', e);
      });

      audio.addEventListener('canplay', () => {
        console.log('✅ Audio global prêt');
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Démarrer l'alarme en boucle
  const startAlarmLoop = React.useCallback(async () => {
    if (isAlarmPlayingRef.current || !audioRef.current) return;

    isAlarmPlayingRef.current = true;
    setIsAlarmPlaying(true); // Mettre à jour le contexte
    console.log("📞 DÉMARRAGE DE L'ALARME GLOBALE");

    try {
      audioRef.current.currentTime = 0;
      await audioRef.current.play();
      console.log('✅ Alarme globale jouée en boucle');
    } catch (error: any) {
      console.error('❌ Erreur lecture alarme globale:', error);
      isAlarmPlayingRef.current = false;
      setIsAlarmPlaying(false); // Mettre à jour le contexte
    }
  }, [setIsAlarmPlaying]);

  // Arrêter l'alarme
  const stopAlarmLoop = React.useCallback(() => {
    if (!isAlarmPlayingRef.current) return;

    isAlarmPlayingRef.current = false;
    setIsAlarmPlaying(false); // Mettre à jour le contexte
    console.log("🔇 ARRÊT DE L'ALARME GLOBALE");

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  }, [setIsAlarmPlaying]);

  // Quand la page "Traitement Demandes" est ouverte, arrêter l'alarme et mettre à jour les notifications
  useEffect(() => {
    if (!user?.id || !isPageOpen) return;

    let isMounted = true;
    let abortController: AbortController | null = null;

    const markNotificationsAsOpened = async () => {
      // Créer un nouvel AbortController pour cette requête
      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController?.abort(), 5000); // Timeout de 5 secondes

      try {
        console.log(
          '📄 Page "Traitement Demandes" ouverte - Arrêt alarme et mise à jour notifications'
        );

        stopAlarmLoop();

        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          '❌ Erreur mise à jour notifications:',
          error?.message || error
        );
      } finally {
        abortController = null;
      }
    };

    const timer = setTimeout(markNotificationsAsOpened, 500);
    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (abortController) {
        abortController.abort();
      }
    };
  }, [user?.id, isPageOpen, stopAlarmLoop]);

  // Vérifier périodiquement les notifications "Non Ouvert" (seulement si la page n'est pas ouverte)
  useEffect(() => {
    if (!user?.id) return;

    // Si la page est ouverte, ne pas vérifier
    if (isPageOpen) {
      stopAlarmLoop();
      return;
    }

    const checkAndPlayAlarm = async () => {
      // Vérifier à nouveau si la page est maintenant ouverte
      if (router.pathname === '/conge/traitement-demandes') {
        stopAlarmLoop();
        return;
      }

      try {
        const userId = Number(user.id); // S'assurer que c'est un nombre
        console.log(
          `🔔 AlarmManager: Vérification notifications pour userId=${userId}`
        );

        const response = await fetch(`/api/notifications?userId=${userId}`);

        if (!response.ok) {
          console.error(
            `❌ AlarmManager: Erreur API pour userId=${userId} - Status: ${response.status}`
          );
          return;
        }

        const data = await response.json();
        console.log(
          `📊 AlarmManager: Réponse API reçue pour userId=${userId} - ${data.notifications?.length || 0} notification(s)`
        );

        if (data.success && data.notifications) {
          // Filtrer uniquement les notifications "Non Ouvert" pour cet utilisateur
          // L'API filtre déjà par userId, mais on double vérifie
          const nonOuvertNotifications = data.notifications.filter((n: any) => {
            if (!n.contenu) return false;
            const contenu = String(n.contenu).trim();
            // Vérifier aussi que fkUtilisateur correspond (si disponible)
            const isForUser =
              !n.fkUtilisateur || Number(n.fkUtilisateur) === Number(user.id);
            const isNonOuvert =
              contenu === 'Non Ouvert' ||
              contenu.includes('Non Ouvert') ||
              contenu.toLowerCase().includes('non ouvert');
            return isForUser && isNonOuvert;
          });

          const currentCount = nonOuvertNotifications.length;
          console.log(
            `🔔 ${currentCount} notification(s) "Non Ouvert" trouvée(s) pour l'utilisateur ${user.id}`
          );

          // Afficher un toast si le nombre de notifications a augmenté
          if (
            currentCount > lastNotificationCountRef.current &&
            lastNotificationCountRef.current > 0
          ) {
            const newCount = currentCount - lastNotificationCountRef.current;
            setTimeout(() => {
              showSuccess(
                '🔔 Nouveau traitement disponible',
                `${newCount} nouveau${newCount > 1 ? 'x' : ''} traitement${newCount > 1 ? 's' : ''} à visualiser dans "Traitement Demandes"`
              );
            }, 3000);
          }
          lastNotificationCountRef.current = currentCount;

          if (currentCount > 0) {
            if (!isAlarmPlayingRef.current) {
              console.log(
                `📞 ${currentCount} notification(s) "Non Ouvert" - DÉMARRAGE ALARME`
              );
              startAlarmLoop();
            }
          } else {
            if (isAlarmPlayingRef.current) {
              stopAlarmLoop();
            }
          }
        }
      } catch (error) {
        console.error('❌ Erreur vérification notifications:', error);
      }
    };

    const initialTimer = setTimeout(checkAndPlayAlarm, 2000);
    const checkInterval = setInterval(checkAndPlayAlarm, 5000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(checkInterval);
      stopAlarmLoop();
    };
  }, [
    user?.id,
    isPageOpen,
    router.pathname,
    startAlarmLoop,
    stopAlarmLoop,
    showSuccess,
  ]);

  // Écouter les événements SSE pour nouvelles notifications
  useEffect(() => {
    if (!user?.id || isPageOpen) return;

    const userId = Number(user.id);
    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}`
    );

    let toastTimer: NodeJS.Timeout | null = null;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'NEW') {
          // Vérifier que la notification est bien pour cet utilisateur
          // Le SSE envoie déjà uniquement les notifications de l'utilisateur connecté
          if (
            data.item &&
            data.item.contenu &&
            data.item.contenu.includes('Non Ouvert')
          ) {
            // Vérifier explicitement que fkUtilisateur correspond (si disponible dans data.item)
            // Le stream.ts filtre déjà par userId, mais on double vérifie
            if (!isPageOpen && !isAlarmPlayingRef.current) {
              console.log(
                '📞 Nouvelle notification "Non Ouvert" pour cet utilisateur - Démarrage alarme'
              );
              startAlarmLoop();
            }

            if (toastTimer) clearTimeout(toastTimer);

            toastTimer = setTimeout(() => {
              if (!isPageOpen) {
                showSuccess(
                  '🔔 Nouveau traitement disponible',
                  'Un nouveau traitement nécessite votre attention dans "Traitement Demandes"'
                );
              }
              toastTimer = null;
            }, 3000);
          }
        } else if (data.type === 'INIT') {
          // INIT envoie déjà le count filtré par userId
          const count = data.count || 0;
          if (count > 0 && !isPageOpen) {
            setTimeout(() => {
              showSuccess(
                '📋 Traitements en attente',
                `${count} traitement${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''} dans "Traitement Demandes"`
              );
            }, 4000);
          }
        }
      } catch (error) {
        console.error('❌ Erreur parsing SSE:', error);
      }
    };

    eventSource.onerror = () => {
      console.error('❌ Erreur SSE');
    };

    return () => {
      if (toastTimer) clearTimeout(toastTimer);
      eventSource.close();
    };
  }, [user?.id, isPageOpen, startAlarmLoop, showSuccess]);

  return null; // Ce composant n'affiche rien visuellement
};

export default TraitementAlarmManager;
