import { SessionsService } from '../sessions/sessions.service';
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
import { Logger, OnModuleDestroy } from '@nestjs/common';
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
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(EventsGateway.name);

  constructor(private jwt: JwtService, private config: ConfigService, private prisma: PrismaService, private sessions: SessionsService) {}

  afterInit(server: Server) {
    // Middleware dijalankan sebelum socket masuk namespace dan menerima broadcast.
    server.use(async (client, next) => {
      try {
        const token = client.handshake.auth?.token;
        if (typeof token !== 'string' || !token) throw new Error('Missing token');
        const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
          secret: this.config.get<string>('jwt.secret'),
        });
        const user = await this.sessions.validate(payload);
        client.data.userId = user.id;
        client.data.locationId = user.locationId;
        client.data.role = user.role;
        client.data.sessionId = payload.sid;
        client.data.tokenExpiresAt = (payload.exp ?? 0) * 1000;
        next();
      } catch {
        next(new Error('Unauthorized'));
      }
    });
    this.validationTimer = setInterval(() => { void this.revalidateSockets().catch(() => {}); }, 30_000);
    this.validationTimer.unref();
  }

  private validationTimer?: NodeJS.Timeout;
  onModuleDestroy() { if (this.validationTimer) clearInterval(this.validationTimer); }

  private async revalidateSockets() {
    const sockets = (this.server as unknown as { sockets?: Map<string, Socket> })?.sockets;
    if (!(sockets instanceof Map) || !sockets.size) return;
    const sessions = await this.prisma.userSession.findMany({
      where: { id: { in: [...sockets.values()].map((socket) => socket.data.sessionId) }, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { isActive: true, locationId: true, role: true } } },
    });
    const byId = new Map(sessions.map((session) => [session.id, session]));
    for (const socket of sockets.values()) {
      const current = byId.get(socket.data.sessionId);
      if (!current?.user.isActive || current.user.locationId !== socket.data.locationId || current.user.role !== socket.data.role) {
        socket.emit('session:revoked'); socket.disconnect(true);
      }
    }
  }

  disconnectSessions(ids: string[]) {
    for (const id of ids) { this.server?.to(`session:${id}`).emit('session:revoked'); this.server?.in(`session:${id}`).disconnectSockets(true); }
  }

  disconnectUser(id: string) {
    this.server?.to(`user:${id}`).emit('session:revoked');
    this.server?.in(`user:${id}`).disconnectSockets(true);
  }

  disconnectLocation(id: string) {
    this.server?.to(`location:${id}`).emit('session:revoked');
    this.server?.in(`location:${id}`).disconnectSockets(true);
  }

  handleConnection(client: Socket) {
    client.join(client.data.locationId ? `location:${client.data.locationId}` : 'global');
    client.join(`session:${client.data.sessionId}`);
    client.join(`user:${client.data.userId}`);
    client.data.expirationTimer = setTimeout(() => { client.emit('session:expired'); client.disconnect(true); }, Math.max(1, client.data.tokenExpiresAt - Date.now()));
    client.data.expirationTimer.unref();
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    if (client.data.expirationTimer) clearTimeout(client.data.expirationTimer);
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
