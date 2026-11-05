import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Service-to-service auth: callers must send the shared INTERNAL_API_KEY.
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTERNAL_API_KEY;
    const provided = context.switchToHttp().getRequest().headers['x-internal-api-key'];
    if (!expected || provided !== expected) {
      throw new UnauthorizedException();
    }
    return true;
  }
}
