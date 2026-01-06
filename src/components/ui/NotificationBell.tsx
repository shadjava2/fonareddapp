import { useAuth } from '@/hooks/useAuth';
import { apiPut } from '@/lib/fetcher';
import { BellIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

interface Notification {
  id: string;
  sujet: string | null;
  contenu: string | null;
  statut: string;
  datecreate: string;
}

const NotificationBell: React.FC = () => {
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const userId = Number(user.id);

    // Se connecter au stream SSE
    const eventSource = new EventSource(
      `/api/notifications/stream?userId=${userId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'INIT') {
          setNotificationCount(data.count || 0);
          setNotifications(data.items || []);
          console.log(
            `🔔 Notifications initialisées: ${data.count || 0} non lue(s)`
          );
        } else if (data.type === 'NEW') {
          setNotificationCount((prev) => prev + (data.increment || 1));
          if (data.item) {
            setNotifications((prev) => [data.item, ...prev]);
          }
          console.log('🔔 Nouvelle notification reçue');
        } else if (data.type === 'READ') {
          setNotificationCount((prev) =>
            Math.max(0, prev - (data.decrement || 1))
          );
          if (data.id) {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== String(data.id))
            );
          }
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

    eventSourceRef.current = eventSource;

    return () => {
      eventSource.close();
    };
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;

    try {
      await apiPut('/api/notifications', {
        id: notificationId,
        userId: Number(user.id),
      });

      // La mise à jour sera gérée via SSE
    } catch (error) {
      console.error('❌ Erreur lors du marquage de la notification:', error);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 1) return "À l'instant";
      if (minutes < 60) return `Il y a ${minutes} min`;
      if (hours < 24) return `Il y a ${hours} h`;
      if (days < 7) return `Il y a ${days} j`;
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 rounded-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <BellIcon className="h-6 w-6" />
        {notificationCount > 0 && (
          <span className="absolute top-0 right-0 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Notifications
                {notificationCount > 0 && (
                  <span className="ml-2 text-sm text-gray-500">
                    ({notificationCount} non lue
                    {notificationCount > 1 ? 's' : ''})
                  </span>
                )}
              </h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                  <p>Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {notification.sujet || 'Notification'}
                          </p>
                          {notification.contenu && (
                            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                              {notification.contenu}
                            </p>
                          )}
                          {notification.datecreate && (
                            <p className="mt-1 text-xs text-gray-400">
                              {formatDate(notification.datecreate)}
                            </p>
                          )}
                        </div>
                        {notification.statut === 'en_attente' && (
                          <span className="ml-2 flex-shrink-0 w-2 h-2 rounded-full bg-blue-500"></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
