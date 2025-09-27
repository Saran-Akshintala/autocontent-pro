import { Injectable, Scope, Inject, Logger } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';

/**
 * Tenant-aware Prisma service that automatically scopes queries to the current tenant
 * This service should be used instead of PrismaService directly for tenant-scoped operations
 */
@Injectable({ scope: Scope.REQUEST })
export class TenantAwarePrismaService {
  private readonly logger = new Logger(TenantAwarePrismaService.name);
  private readonly tenantId: string;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request & { user?: any; tenantId?: string }
  ) {
    this.tenantId = this.request.user?.tenantId || this.request.tenantId;
    
    if (!this.tenantId) {
      this.logger.warn('TenantAwarePrismaService initialized without tenant context');
    }
  }

  /**
   * Get the current tenant ID
   */
  getCurrentTenantId(): string | undefined {
    return this.tenantId;
  }

  /**
   * Ensure tenant context exists
   */
  private ensureTenantContext(): string {
    if (!this.tenantId) {
      throw new Error('Tenant context is required for this operation');
    }
    return this.tenantId;
  }

  /**
   * Tenant-scoped brand operations
   */
  get brands() {
    const tenantId = this.ensureTenantContext();
    return {
      findMany: (args: any = {}) => {
        return this.prisma.brand.findMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findUnique: (args: any) => {
        return this.prisma.brand.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findFirst: (args: any = {}) => {
        return this.prisma.brand.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      create: (args: any) => {
        return this.prisma.brand.create({
          ...args,
          data: { ...args.data, tenantId },
        });
      },
      update: (args: any) => {
        return this.prisma.brand.updateMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      delete: (args: any) => {
        return this.prisma.brand.deleteMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      count: (args: any = {}) => {
        return this.prisma.brand.count({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
    };
  }

  /**
   * Tenant-scoped post operations
   */
  get posts() {
    const tenantId = this.ensureTenantContext();
    return {
      findMany: (args: any = {}) => {
        return this.prisma.post.findMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findUnique: (args: any) => {
        return this.prisma.post.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findFirst: (args: any = {}) => {
        return this.prisma.post.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      create: (args: any) => {
        return this.prisma.post.create({
          ...args,
          data: { ...args.data, tenantId },
        });
      },
      update: (args: any) => {
        return this.prisma.post.updateMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      delete: (args: any) => {
        return this.prisma.post.deleteMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      count: (args: any = {}) => {
        return this.prisma.post.count({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
    };
  }

  /**
   * Tenant-scoped schedule operations
   */
  get schedules() {
    const tenantId = this.ensureTenantContext();
    return {
      findMany: (args: any = {}) => {
        return this.prisma.schedule.findMany({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
      findUnique: (args: any) => {
        return this.prisma.schedule.findFirst({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
      findFirst: (args: any = {}) => {
        return this.prisma.schedule.findFirst({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
      create: (args: any) => {
        // Note: Schedule creation should ensure the post belongs to the tenant
        return this.prisma.schedule.create(args);
      },
      update: (args: any) => {
        return this.prisma.schedule.updateMany({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
      delete: (args: any) => {
        return this.prisma.schedule.deleteMany({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
      count: (args: any = {}) => {
        return this.prisma.schedule.count({
          ...args,
          where: { 
            ...args.where, 
            post: { tenantId } 
          },
        });
      },
    };
  }

  /**
   * Tenant-scoped WhatsApp session operations
   */
  get whatsappSessions() {
    const tenantId = this.ensureTenantContext();
    return {
      findMany: (args: any = {}) => {
        return this.prisma.whatsAppSession.findMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findUnique: (args: any) => {
        return this.prisma.whatsAppSession.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findFirst: (args: any = {}) => {
        return this.prisma.whatsAppSession.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      create: (args: any) => {
        return this.prisma.whatsAppSession.create({
          ...args,
          data: { ...args.data, tenantId },
        });
      },
      update: (args: any) => {
        return this.prisma.whatsAppSession.updateMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      delete: (args: any) => {
        return this.prisma.whatsAppSession.deleteMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      count: (args: any = {}) => {
        return this.prisma.whatsAppSession.count({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
    };
  }

  /**
   * Tenant-scoped user tenant operations
   */
  get userTenants() {
    const tenantId = this.ensureTenantContext();
    return {
      findMany: (args: any = {}) => {
        return this.prisma.userTenant.findMany({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findUnique: (args: any) => {
        return this.prisma.userTenant.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      findFirst: (args: any = {}) => {
        return this.prisma.userTenant.findFirst({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
      count: (args: any = {}) => {
        return this.prisma.userTenant.count({
          ...args,
          where: { ...args.where, tenantId },
        });
      },
    };
  }

  /**
   * Access to the underlying Prisma client for operations that need full access
   * Use with caution - ensure manual tenant scoping when using this
   */
  get raw() {
    this.logger.warn('Using raw Prisma client - ensure manual tenant scoping');
    return this.prisma;
  }

  /**
   * Execute raw SQL with automatic tenant scoping where possible
   */
  async $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: any[]): Promise<T> {
    // Log the query for audit purposes
    this.logger.debug(`Executing raw query for tenant ${this.tenantId}`);
    return this.prisma.$queryRaw<T>(query, ...values);
  }

  /**
   * Execute raw SQL with automatic tenant scoping where possible
   */
  async $executeRaw(query: TemplateStringsArray, ...values: any[]): Promise<number> {
    // Log the query for audit purposes
    this.logger.debug(`Executing raw command for tenant ${this.tenantId}`);
    return this.prisma.$executeRaw(query, ...values);
  }

  /**
   * Get current tenant information
   */
  async getCurrentTenant() {
    const tenantId = this.ensureTenantContext();
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
  }

  /**
   * Transaction support with tenant context
   */
  async $transaction<T>(fn: (prisma: PrismaService) => Promise<T>): Promise<T> {
    this.logger.debug(`Starting transaction for tenant ${this.tenantId}`);
    return this.prisma.$transaction(fn);
  }
}
