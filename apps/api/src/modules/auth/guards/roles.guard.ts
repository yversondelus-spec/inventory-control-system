import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/shared-types';

import { ROLES_KEY } from '../../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<{ user: { role: UserRole } }>();

    // Jerarquía: ADMINISTRADOR > SUPERVISOR > OPERADOR
    const hierarchy: Record<UserRole, number> = {
      [UserRole.ADMINISTRADOR]: 3,
      [UserRole.SUPERVISOR]: 2,
      [UserRole.OPERADOR]: 1,
    };

    const userLevel = hierarchy[user.role] ?? 0;
    const requiredLevel = Math.min(...requiredRoles.map((r) => hierarchy[r] ?? 99));

    return userLevel >= requiredLevel;
  }
}
