import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@prisma/client';

// Prisma Decimal terserialisasi sebagai string di JSON,
// padahal frontend mengharapkan number (latitude/longitude untuk peta).
@Injectable()
export class DecimalTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.transform(data)));
  }

  private transform(value: any): any {
    if (value === null || value === undefined) return value;
    if (value instanceof Prisma.Decimal) return value.toNumber();
    if (value instanceof Date) return value;
    if (Array.isArray(value)) return value.map((v) => this.transform(v));
    if (typeof value === 'object' && value.constructor === Object) {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) out[k] = this.transform(v);
      return out;
    }
    return value;
  }
}
