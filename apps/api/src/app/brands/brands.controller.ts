import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { BrandsService } from './brands.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async findAll(@Request() req: any) {
    const tenantId = req.user?.tenantId || req.tenantId;
    const brands = await this.brandsService.findAll();
    return { brands };
  }
}
