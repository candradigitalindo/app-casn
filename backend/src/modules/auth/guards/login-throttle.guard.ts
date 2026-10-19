import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { clientIp } from '../../../common/utils/client-ip.util';

@Injectable()
export class LoginThrottleGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>) {
    return clientIp(req as { ip?: string; headers: Record<string, unknown> });
  }
  protected generateKey(
    context: ExecutionContext,
    tracker: string,
    name: string,
  ): string {
    const req = context.switchToHttp().getRequest();
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    return createHash('sha256')
      .update(
        `login:${name}:${name === 'login-account' ? email || tracker : tracker}`,
      )
      .digest('hex');
  }
}
