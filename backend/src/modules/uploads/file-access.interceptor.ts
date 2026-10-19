import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { mergeMap } from 'rxjs/operators';
import { UploadsService } from './uploads.service';

@Injectable()
export class FileAccessInterceptor implements NestInterceptor {
  constructor(private files: UploadsService) {}
  async intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest();
    if (!req.user?.sessionId) return next.handle();
    const walk = async (value: any, incoming: boolean): Promise<any> => {
      if (typeof value === 'string' && value.startsWith('/uploads/')) {
        const canonical = value.split('?')[0];
        if (incoming) {
          await this.files.authorize(canonical, req.user);
          return canonical;
        }
        return this.files.sign(canonical, req.user);
      }
      if (Array.isArray(value))
        return Promise.all(value.map((item) => walk(item, incoming)));
      if (
        value &&
        typeof value === 'object' &&
        Object.getPrototypeOf(value) === Object.prototype
      ) {
        return Object.fromEntries(
          await Promise.all(
            Object.entries(value).map(async ([key, item]) => [
              key,
              await walk(item, incoming),
            ]),
          ),
        );
      }
      return value;
    };
    if (req.body) req.body = await walk(req.body, true);
    return next.handle().pipe(mergeMap((value) => walk(value, false)));
  }
}
