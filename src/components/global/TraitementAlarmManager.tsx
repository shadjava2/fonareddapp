import { useAlarm } from '@/contexts/AlarmContext';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useRouter } from 'next/router';
import React, { useEffect, useRef } from 'react';

const SOUNDED_KEY = 'fonaredd_conge_alarm_sounded_ids';

function loadSoundedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SOUNDED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

function saveSoundedIds(ids: Set<string>) {
  try {
    sessionStorage.setItem(SOUNDED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

/**
 * Alarme globale : son one-shot par nouvelle notification ; clignotement tant que
 * des notifs "Non Ouvert" existent (arrêt à l'ouverture de Traitement Demandes).
 */
const TraitementAlarmManager: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const { setIsAlarmPlaying } = useAlarm();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundedIdsRef = useRef<Set<string>>(new Set());
  const lastNotificationCountRef = useRef(0);
  const blinkActiveRef = useRef(false);

  const isPageOpen = router.pathname === '/conge/traitement-demandes';

  useEffect(() => {
    soundedIdsRef.current = loadSoundedIds();
    if (!audioRef.current) {
      const audio = new Audio('/mixkit-happy-bells-notification-937.wav');
      audio.loop = false;
      audio.volume = 0.7;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const setBlink = React.useCallback(
    (on: boolean) => {
      blinkActiveRef.current = on;
      setIsAlarmPlaying(on);
    },
    [setIsAlarmPlaying]
  );

  const playOneShotForNew = React.useCallback(
    async (notifications: Array<{ id?: string | number }>) => {
      if (!audioRef.current || isPageOpen) return;
      const newOnes: string[] = [];
      for (const n of notifications) {
        const id = n.id != null ? String(n.id) : null;
        if (!id) continue;
        if (!soundedIdsRef.current.has(id)) {
          newOnes.push(id);
        }
      }
      if (newOnes.length === 0) return;

      for (const id of newOnes) {
        soundedIdsRef.current.add(id);
      }
      saveSoundedIds(soundedIdsRef.current);

      try {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        console.log(
          `✅ Alarme one-shot pour ${newOnes.length} nouvelle(s) notif(s)`
        );
      } catch (error) {
        console.error('❌ Erreur lecture alarme:', error);
      }
    },
    [isPageOpen]
  );

  useEffect(() => {
    if (!user?.id || !isPageOpen) return;

    let isMounted = true;
    let abortController: AbortController | null = null;

    const markNotificationsAsOpened = async () => {
      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController?.abort(), 5000);

      try {
        setBlink(false);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }

        const response = await fetch('/api/notifications/mark-all-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: Number(user.id) }),
          signal: abortController.signal,
        });

        clearTimeout(timeoutId);
        if (!isMounted) return;

        if (response.ok) {
          try {
            const data = await response.json();
            console.log(
              `✅ ${data.count || 0} notification(s) mise(s) à jour en "Ouvert"`
            );
          } catch {
            /* ignore */
          }
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error?.name === 'AbortError') return;
        console.error('❌ Erreur mise à jour notifications:', error?.message || error);
      } finally {
        abortController = null;
      }
    };

    const timer = setTimeout(markNotificationsAsOpened, 500);
    return () => {
      clearTimeout(timer);
      isMounted = false;
      if (abortController) abortController.abort();
    };
  }, [user?.id, isPageOpen, setBlink]);

  useEffect(() => {
    if (!user?.id) return;
    if (isPageOpen) {
      setBlink(false);
      return;
    }

    const checkAndPlayAlarm = async () => {
      if (router.pathname === '/conge/traitement-demandes') {
        setBlink(false);
        return;
      }

      try {
        const userId = Number(user.id);
        const response = await fetch(`/api/notifications?userId=${userId}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!data.success || !data.notifications) return;

        const nonOuvertNotifications = data.notifications.filter((n: any) => {
          if (!n.contenu) return false;
          const contenu = String(n.contenu).trim();
          const isForUser =
            !n.fkUtilisateur || Number(n.fkUtilisateur) === Number(user.id);
          const isNonOuvert =
            contenu === 'Non Ouvert' ||
            contenu.includes('Non Ouvert') ||
            contenu.toLowerCase().includes('non ouvert');
          return isForUser && isNonOuvert;
        });

        const currentCount = nonOuvertNotifications.length;

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
          setBlink(true);
          await playOneShotForNew(nonOuvertNotifications);
        } else {
          setBlink(false);
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
    };
  }, [
    user?.id,
    isPageOpen,
    router.pathname,
    playOneShotForNew,
    setBlink,
    showSuccess,
  ]);

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
          if (
            data.item &&
            data.item.contenu &&
            data.item.contenu.includes('Non Ouvert')
          ) {
            if (!isPageOpen) {
              setBlink(true);
              void playOneShotForNew([data.item]);
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
          const count = data.count || 0;
          if (count > 0 && !isPageOpen) {
            setBlink(true);
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
  }, [user?.id, isPageOpen, playOneShotForNew, setBlink, showSuccess]);

  return null;
};

export default TraitementAlarmManager;
