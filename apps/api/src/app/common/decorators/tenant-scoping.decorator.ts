import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip tenant scoping for specific endpoints
 * Use this for endpoints that don't need tenant isolation (auth, health checks, etc.)
 */
export const SKIP_TENANT_SCOPING_KEY = 'skipTenantScoping';

/**
 * Skip tenant scoping for this endpoint
 * 
 * @example
 * @SkipTenantScoping()
 * @Get('health')
 * async getHealth() {
 *   return { status: 'ok' };
 * }
 */
export const SkipTenantScoping = () => SetMetadata(SKIP_TENANT_SCOPING_KEY, true);

/**
 * Decorator to require specific tenant roles for an endpoint
 * This can be combined with tenant scoping for additional security
 */
export const TENANT_ROLES_KEY = 'tenantRoles';

/**
 * Require specific tenant roles for this endpoint
 * 
 * @param roles - Array of required roles
 * @example
 * @RequireTenantRoles(['OWNER', 'ADMIN'])
 * @Put('settings')
 * async updateSettings() {
 *   // Only OWNER and ADMIN can access
 * }
 */
export const RequireTenantRoles = (...roles: string[]) => 
  SetMetadata(TENANT_ROLES_KEY, roles);

/**
 * Decorator to mark an endpoint as tenant-admin only
 * Shorthand for @RequireTenantRoles(['OWNER', 'ADMIN'])
 */
export const TenantAdminOnly = () => RequireTenantRoles('OWNER', 'ADMIN');

/**
 * Decorator to mark an endpoint as tenant-owner only
 * Shorthand for @RequireTenantRoles(['OWNER'])
 */
export const TenantOwnerOnly = () => RequireTenantRoles('OWNER');
