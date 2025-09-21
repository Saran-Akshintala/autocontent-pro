import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BrandsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.brand.findMany({
      where: { tenantId },
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
}
