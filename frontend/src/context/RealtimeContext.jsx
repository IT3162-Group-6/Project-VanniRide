import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './authStore';
import { RealtimeContext } from './realtimeHooks';
import {
  API_ORIGIN,
  getToken,
  isMockAuth,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATION_UPDATED_EVENT,
} from '../services/api';

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const activeRole = user?.role;
  const socket = useMemo(() => userId && activeRole && !isMockAuth()
    ? io(API_ORIGIN, {
        auth: { token: getToken() },
        transports: ['websocket', 'polling'],
        autoConnect: false,
      })
    : null, [userId, activeRole]);

  useEffect(() => {
    if (!socket) return undefined;
    const announceNotification = (notification) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, {
        detail: notification,
      }));
    };
    const announceNotificationUpdate = (notification) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATION_UPDATED_EVENT, {
        detail: notification,
      }));
    };

    socket.on('notification_created', announceNotification);
    socket.on('notification_updated', announceNotificationUpdate);
    socket.connect();

    return () => {
      socket.off('notification_created', announceNotification);
      socket.off('notification_updated', announceNotificationUpdate);
      socket.disconnect();
    };
  }, [socket]);

  return <RealtimeContext.Provider value={socket}>{children}</RealtimeContext.Provider>;
}
