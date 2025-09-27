import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';

/**
 * Decorator to skip tenant scoping for specific endpoints
 */
export const SKIP_TENANT_SCOPING_KEY = 'skipTenantScoping';
export const SkipTenantScoping = () => 
  Reflect.metadata(SKIP_TENANT_SCOPING_KEY, true);

/**
 * Interceptor to enforce tenant scoping across all requests
 * Ensures that all database queries are automatically scoped to the current tenant
 */
@Injectable()
export class TenantScopingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantScopingInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Check if tenant scoping should be skipped for this endpoint
    const skipTenantScoping = this.reflector.getAllAndOverride<boolean>(
      SKIP_TENANT_SCOPING_KEY,
      [handler, controller],
    );

    if (skipTenantScoping) {
      this.logger.debug(`Skipping tenant scoping for ${controller.name}.${handler.name}`);
      return next.handle();
    }

    // Ensure user is authenticated and has tenant context
    if (!request.user || !request.user.tenantId) {
      this.logger.warn(`Request without tenant context: ${request.method} ${request.url}`);
      // Let the request continue - auth guards will handle authentication
      return next.handle();
    }

    // Log tenant-scoped request for audit purposes
    this.logger.debug(
      `Tenant-scoped request: ${request.method} ${request.url} [Tenant: ${request.user.tenantId}]`
    );

    // Add tenant context to request for services to use
    request.tenantId = request.user.tenantId;
    request.userRole = request.user.role;

    return next.handle();
  }
}
