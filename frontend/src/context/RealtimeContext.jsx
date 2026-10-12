import { useEffect, useMemo } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './authStore';
import { RealtimeContext } from './realtimeHooks';
import {
  API_ORIGIN,
  getToken,
  isMockAuth,
  NOTIFICATIONS_CHANGED_EVENT,
} from '../services/api';

export function RealtimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const socket = useMemo(() => userId && !isMockAuth()
    ? io(API_ORIGIN, {
        auth: { token: getToken() },
        transports: ['websocket', 'polling'],
        autoConnect: false,
      })
    : null, [userId]);

  useEffect(() => {
    if (!socket) return undefined;
    const announceNotification = (notification) => {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT, {
        detail: notification,
      }));
    };

    socket.on('notification_created', announceNotification);
    socket.connect();

    return () => {
      socket.off('notification_created', announceNotification);
      socket.disconnect();
    };
  }, [socket]);

  return <RealtimeContext.Provider value={socket}>{children}</RealtimeContext.Provider>;
}
