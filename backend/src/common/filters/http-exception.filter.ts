import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const prismaError = exception instanceof Prisma.PrismaClientKnownRequestError ? exception : null;
    const databaseErrors: Record<string, { status: number; message: string }> = {
      P2002: { status: HttpStatus.CONFLICT, message: 'Nilai unik sudah digunakan oleh data lain' },
      P2003: { status: HttpStatus.CONFLICT, message: 'Relasi data tidak valid atau masih digunakan oleh data lain' },
      P2025: { status: HttpStatus.NOT_FOUND, message: 'Data tidak ditemukan' },
    };
    const mapped = prismaError ? databaseErrors[prismaError.code] : undefined;
    const status = mapped?.status ?? (
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR);

    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message = mapped?.message ?? (
      typeof raw === 'string'
        ? raw
        : (raw as any)?.message || 'Internal server error');

    // class-validator mengirim array error di field message
    const errors =
      Array.isArray(message)
        ? message.map((m: string) => ({ message: m }))
        : undefined;

    const body = {
      statusCode: status,
      message: Array.isArray(message) ? 'Validation failed' : message,
      ...(errors ? { errors } : {}),
      requestId: uuid(),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }
}
