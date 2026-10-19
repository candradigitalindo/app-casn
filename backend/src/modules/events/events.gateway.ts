import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService) {}

  afterInit(server: Server) {
    // Middleware dijalankan sebelum socket masuk namespace dan menerima broadcast.
    server.use(async (client, next) => {
      try {
        const token = client.handshake.auth?.token;
        if (typeof token !== 'string' || !token) throw new Error('Missing token');
        const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
          secret: this.config.get<string>('jwt.secret'),
        });
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, isActive: true, locationId: true },
        });
        if (!user?.isActive) throw new Error('Inactive account');
        client.data.userId = user.id;
        client.data.locationId = user.locationId;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    client.join(client.data.locationId ? `location:${client.data.locationId}` : 'global');
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:location')
  handleJoinLocation(@MessageBody() locationId: string, @ConnectedSocket() client: Socket) {
    if (typeof locationId !== 'string' || (client.data.locationId && client.data.locationId !== locationId)) return;
    client.join(`location:${locationId}`);
  }

  @SubscribeMessage('leave:location')
  handleLeaveLocation(@MessageBody() locationId: string, @ConnectedSocket() client: Socket) {
    if (client.data.locationId === locationId) return;
    client.leave(`location:${locationId}`);
  }

  // ── Emit helpers (called by services) ──────────────────────────────────────

  emitLocationUpdated(locationId: string, data: any) {
    this.server.to('global').to(`location:${locationId}`).emit('location:updated', { locationId, data });
  }

  emitTicketCreated(ticket: any) {
    this.server.to('global').to(`location:${ticket.locationId}`).emit('ticket:created', { ticket });
  }

  emitTicketUpdated(ticketId: string, status: string, data: any) {
    this.server.to('global').to(`location:${data.locationId}`).emit('ticket:updated', { ticketId, status, data });
  }

  emitInstallationUpdated(locationId: string, data: any) {
    this.server.to('global').to(`location:${locationId}`).emit('installation:updated', { locationId, data });
  }

  emitShipmentUpdated(shipmentId: string, data: any, locationId = data?.destinationLocationId) {
    this.server.to('global').to(`location:${locationId}`).emit('shipment:updated', { shipmentId, data });
  }
}
