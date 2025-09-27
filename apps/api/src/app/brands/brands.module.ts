import { Module } from '@nestjs/common';
import { BrandsController } from './brands.controller';
import { BrandsService } from './brands.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantAwarePrismaService } from '../common/services/tenant-aware-prisma.service';

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService, TenantAwarePrismaService],
  exports: [BrandsService],
})
export class BrandsModule {}
