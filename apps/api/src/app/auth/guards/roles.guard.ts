import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const tenantId = context.switchToHttp().getRequest().headers['x-tenant-id'];

    if (!user || !tenantId) {
      throw new ForbiddenException('User or tenant context missing');
    }

    // Find user's role in the current tenant
    const userTenant = user.userTenants?.find((ut: any) => ut.tenantId === tenantId);
    
    if (!userTenant) {
      throw new ForbiddenException('User does not belong to this tenant');
    }

    const hasRole = requiredRoles.includes(userTenant.role);
    
    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
