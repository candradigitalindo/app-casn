import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../database/prisma.service';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];
const MAX_AUDIT_STRING = 2048;

function sanitizeLargeValues(obj: Record<string, any>): void {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'string' && (val.startsWith('data:') || val.length > MAX_AUDIT_STRING)) {
      obj[key] = `[dipangkas: ${val.length} karakter]`;
    } else if (Array.isArray(val)) {
      obj[key] = val.map((v) =>
        typeof v === 'string' && (v.startsWith('data:') || v.length > MAX_AUDIT_STRING)
          ? `[dipangkas: ${v.length} karakter]`
          : (v && typeof v === 'object' ? (sanitizeLargeValues(v), v) : v),
      );
    } else if (val && typeof val === 'object') {
      sanitizeLargeValues(val);
    }
  }
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, headers } = request;

    if (!user || !WRITE_METHODS.includes(method)) return next.handle();

    return next.handle().pipe(
      tap(async () => {
        // Ekstrak entityType dari URL (mis. /api/v1/locations/123 → Locations)
        const parts = url.split('/').filter(Boolean);
        const entityTypeRaw = parts[2] || 'unknown'; // setelah /api/v1/
        const entityType = entityTypeRaw.charAt(0).toUpperCase() + entityTypeRaw.slice(1);
        const entityId = parts[3] || '';

        // Jangan simpan kredensial di audit log
        const body = { ...(request.body ?? {}) };
        delete body.password;
        delete body.refreshToken;
        // Jangan gandakan isi file (base64 data URL bisa belasan MB) ke tabel audit
        sanitizeLargeValues(body);

        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: method,
            entityType,
            entityId: entityId || 'N/A',
            newValues: body,
            ipAddress: ip,
            userAgent: headers['user-agent'] ?? null,
          },
        }).catch(() => { /* jangan biarkan audit error mengganggu respons */ });
      }),
    );
  }
}
