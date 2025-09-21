import { Injectable, NestMiddleware, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth.service';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class TenantValidationMiddleware implements NestMiddleware {
  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers.authorization;

    // Skip validation for public routes or if no tenant header
    if (!tenantId || !authHeader) {
      return next();
    }

    try {
      // Extract and verify JWT token
      const token = authHeader.replace('Bearer ', '');
      const payload = this.jwtService.verify<JwtPayload>(token);

      // Check if user belongs to the requested tenant
      const userBelongsToTenant = payload.tenants.some(
        (tenant) => tenant.tenantId === tenantId
      );

      if (!userBelongsToTenant) {
        throw new ForbiddenException(
          `User does not have access to tenant: ${tenantId}`
        );
      }

      // Add tenant context to request
      (req as any).tenantId = tenantId;
      (req as any).userRole = payload.tenants.find(
        (tenant) => tenant.tenantId === tenantId
      )?.role;

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      // If JWT verification fails, let the JWT guard handle it
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return next();
      }

      throw new BadRequestException('Invalid tenant validation');
    }

    next();
  }
}
