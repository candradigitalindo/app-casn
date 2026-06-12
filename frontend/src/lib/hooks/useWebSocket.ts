'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { apiClient } from '@/lib/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { locationKeys, ticketKeys } from '@/lib/hooks';

const WS_ENABLED = process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';

interface WebSocketMessage {
  type: string;
  data: any;
}

interface LocationUpdatedMessage {
  locationId: string;
  status: string;
  data: any;
}

interface TicketCreatedMessage {
  ticket: any;
}

interface TicketUpdatedMessage {
  ticketId: string;
  status: string;
  data: any;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const connect = useCallback(() => {
    if (!WS_ENABLED || socketRef.current?.connected) return;

    try {
      const socket = io(apiClient.getWebSocketUrl(), {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
      });

      socket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        setIsConnected(false);

        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          socket.connect();
        }
      });

      socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);

        // Schedule reconnection attempt
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          socket.connect();
        }, 5000);
      });

      // Location updates
      socket.on('location:updated', (message: LocationUpdatedMessage) => {
        console.log('Location updated:', message);

        // Invalidate location queries
        queryClient.invalidateQueries({ queryKey: locationKeys.detail(message.locationId) });
        queryClient.invalidateQueries({ queryKey: locationKeys.lists() });
        queryClient.invalidateQueries({ queryKey: locationKeys.stats() });
      });

      // Ticket created
      socket.on('ticket:created', (message: TicketCreatedMessage) => {
        console.log('Ticket created:', message);

        // Invalidate ticket queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      });

      // Ticket updated
      socket.on('ticket:updated', (message: TicketUpdatedMessage) => {
        console.log('Ticket updated:', message);

        // Invalidate ticket queries
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(message.ticketId) });
        queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
        queryClient.invalidateQueries({ queryKey: ticketKeys.stats() });
      });

      // Installation progress updates
      socket.on('installation:updated', (message: any) => {
        console.log('Installation updated:', message);

        // Invalidate installation queries
        queryClient.invalidateQueries({ queryKey: locationKeys.installations(message.locationId) });
      });

      // Attendance updates
      socket.on('attendance:updated', (message: any) => {
        console.log('Attendance updated:', message);

        // Invalidate stats
        queryClient.invalidateQueries({ queryKey: locationKeys.stats() });
      });

      // Shipment updates
      socket.on('shipment:updated', (message: any) => {
        console.log('Shipment updated:', message);

        // Invalidate logistics queries
        queryClient.invalidateQueries({ queryKey: ['shipments'] });
      });

      socketRef.current = socket;
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionError('Failed to establish WebSocket connection');
    }
  }, [queryClient]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

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
  const emit = useCallback((event: string, data: any) => {
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

// Hook for real-time location updates
export function useRealTimeLocation(locationId: string) {
  const { isConnected, joinLocation, leaveLocation } = useWebSocket();

  useEffect(() => {
    if (isConnected && locationId) {
      joinLocation(locationId);

      return () => {
        leaveLocation(locationId);
      };
    }
  }, [isConnected, locationId, joinLocation, leaveLocation]);

  return isConnected;
}

// Hook for WebSocket connection status
export function useConnectionStatus() {
  const { isConnected, connectionError } = useWebSocket();

  return {
    isConnected,
    connectionError,
    status: isConnected ? 'connected' : connectionError ? 'error' : 'disconnected',
  };
}