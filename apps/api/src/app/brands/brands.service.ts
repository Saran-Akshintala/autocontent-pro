import { Injectable } from '@nestjs/common';
import { TenantAwarePrismaService } from '../common/services/tenant-aware-prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: TenantAwarePrismaService) {}

  async findAll() {
    // Tenant scoping handled automatically by TenantAwarePrismaService
    return this.prisma.brands.findMany({
      select: {
        id: true,
        name: true,
        timezone: true,
        brandKit: { 
          select: { 
            logoUrl: true 
          } 
        }
      }
    });
  }

  async findById(id: string) {
    return this.prisma.brands.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        timezone: true,
        brandKit: true,
        createdAt: true,
        updatedAt: true,
      }
    });
  }

  async create(data: { name: string; timezone?: string; tenantId: string }) {
    return this.prisma.brands.create({
      data: {
        name: data.name,
        timezone: data.timezone || 'UTC',
        tenantId: data.tenantId,
      }
    });
  }

  async update(id: string, data: { name?: string; timezone?: string }) {
    return this.prisma.brands.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.brands.delete({
      where: { id }
    });
  }

  async count() {
    return this.prisma.brands.count();
  }
}
