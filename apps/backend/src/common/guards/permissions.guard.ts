import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedRequest } from '../interfaces/authenticated-request';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    const available = user.permissions ?? [];
    if (!required.every((permission) => available.includes(permission))) throw new ForbiddenException();
    return true;
  }
}
