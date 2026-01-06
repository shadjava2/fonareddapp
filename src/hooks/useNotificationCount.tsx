import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';

/**
 * Hook pour gérer le compteur de notifications via SSE
 * Retourne le nombre de notifications non lues pour l'utilisateur connecté
 */
export function useNotificationCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const userId = Number(user.id);
    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'INIT') {
          setCount(data.count || 0);
        } else if (data.type === 'NEW') {
          setCount((prev) => prev + (data.increment || 1));
        } else if (data.type === 'READ') {
          setCount((prev) => Math.max(0, prev - (data.decrement || 1)));
        }
      } catch (error) {
        console.error('❌ Erreur lors du parsing du message SSE:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Erreur SSE:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [user?.id]);

  return count;
}
