'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { locationKeys } from './useLocations';
import { ticketKeys } from './useIncidents';
import { useAuthStore } from '@/lib/stores/auth';

const WS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';

interface LocationUpdatedMessage { locationId: string; }
interface TicketUpdatedMessage { ticketId: string; }

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);

  const connect = useCallback(() => {
    if (!WS_ENABLED || !token || socketRef.current) return;

    try {
      const socket = io(apiClient.getWebSocketUrl(), {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);

      });

      socket.on('connect_error', (error) => {
        setConnectionError(error.message);
        setIsConnected(false);
        // Socket.IO menangani retry; hindari timer kedua yang membuat koneksi ganda.
      });

      // Location updates
      socket.on('location:updated', (message: LocationUpdatedMessage) => {

        // Invalidate location queries
        queryClient.invalidateQueries({ queryKey: locationKeys.detail(message.locationId) });
        queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: locationKeys.stats() });
      });

      // Ticket created
      socket.on('ticket:created', () => {

        // Invalidate ticket queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      });

      // Ticket updated
      socket.on('ticket:updated', (message: TicketUpdatedMessage) => {

        // Invalidate ticket queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(message.ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      });

      // Installation progress updates (progres per item barang + tahapan)
      socket.on('installation:updated', () => {

        queryClient.invalidateQueries({ queryKey: ['location-items'] });
        queryClient.invalidateQueries({ queryKey: ['installations'] });
        queryClient.invalidateQueries({ queryKey: locationKeys.all });
        queryClient.invalidateQueries({ queryKey: ['stages'] });
      });

      // Shipment updates
      socket.on('shipment:updated', () => {

        // Invalidate logistics queries
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      });

      socket.on('session:revoked', () => useAuthStore.getState().logout());
      socket.on('session:expired', () => {
        apiClient.refreshSession().catch(() => useAuthStore.getState().logout());
      });
      socket.on('notification:updated', () => queryClient.invalidateQueries({ queryKey: ['notifications'] }));
      socket.on('project:updated', () => queryClient.invalidateQueries({ queryKey: ['projects'] }));
      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to establish WebSocket connection');
    }
  }, [queryClient, token]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Join location room for location-specific updates
  const joinLocation = useCallback((locationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join:location', locationId);
    }
  }, []);

  // Leave location room
  const leaveLocation = useCallback((locationId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave:location', locationId);
    }
  }, []);

  // Emit custom event
  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionError,
    socket: socketRef.current,
    joinLocation,
    leaveLocation,
    emit,
    connect,
    disconnect,
  };
}