import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:location')
  handleJoinLocation(@MessageBody() locationId: string, @ConnectedSocket() client: Socket) {
    client.join(`location:${locationId}`);
  }

  @SubscribeMessage('leave:location')
  handleLeaveLocation(@MessageBody() locationId: string, @ConnectedSocket() client: Socket) {
    client.leave(`location:${locationId}`);
  }

  // ── Emit helpers (called by services) ──────────────────────────────────────

  emitLocationUpdated(locationId: string, data: any) {
    this.server.emit('location:updated', { locationId, data });
    this.server.to(`location:${locationId}`).emit('location:updated', { locationId, data });
  }

  emitTicketCreated(ticket: any) {
    this.server.emit('ticket:created', { ticket });
  }

  emitTicketUpdated(ticketId: string, status: string, data: any) {
    this.server.emit('ticket:updated', { ticketId, status, data });
  }

  emitInstallationUpdated(locationId: string, data: any) {
    this.server.to(`location:${locationId}`).emit('installation:updated', { locationId, data });
  }

  emitAttendanceUpdated(locationId: string, data: any) {
    this.server.to(`location:${locationId}`).emit('attendance:updated', { locationId, data });
  }

  emitShipmentUpdated(shipmentId: string, data: any) {
    this.server.emit('shipment:updated', { shipmentId, data });
  }
}
