import { createContext, useContext, useEffect, useRef } from 'react';

export const RealtimeContext = createContext(null);

export function useRealtimeEvent(eventName, listener) {
  const socket = useContext(RealtimeContext);
  const listenerRef = useRef(listener);

  useEffect(() => {
    listenerRef.current = listener;
  }, [listener]);

  useEffect(() => {
    if (!socket) return undefined;
    const handleEvent = (payload) => listenerRef.current?.(payload);
    socket.on(eventName, handleEvent);
    return () => socket.off(eventName, handleEvent);
  }, [eventName, socket]);
}

export function useRideRoom(rideId) {
  const socket = useContext(RealtimeContext);

  useEffect(() => {
    if (!socket || !rideId) return undefined;
    const join = () => socket.emit('join_ride', { rideId });
    if (socket.connected) join();
    socket.on('connect', join);
    return () => socket.off('connect', join);
  }, [rideId, socket]);
}
