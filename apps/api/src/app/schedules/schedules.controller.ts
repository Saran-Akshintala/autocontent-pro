import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ValidationPipe
} from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApprovalsService } from '../approvals/approvals.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly approvalsService: ApprovalsService
  ) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async create(@Request() req: any, @Body(ValidationPipe) createScheduleDto: CreateScheduleDto) {
    const tenantId = req.tenantId;
    const schedule = await this.schedulesService.create(tenantId, createScheduleDto);
    
    // Send approval notification for scheduled post
    try {
      await this.approvalsService.sendApprovalNotification(tenantId, createScheduleDto.postId);
      console.log(`📋 Approval notification sent for scheduled post ${createScheduleDto.postId}`);
    } catch (error) {
      console.log('⚠️ Could not send approval notification for scheduled post:', error.message);
    }
    
    return schedule;
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findAll(@Request() req: any) {
    const tenantId = req.tenantId;
    return this.schedulesService.findAll(tenantId);
  }

  @Get('upcoming')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findUpcoming(@Request() req: any, @Query('hours') hours?: string) {
    const tenantId = req.tenantId;
    const hoursNumber = hours ? parseInt(hours, 10) : 24;
    return this.schedulesService.findUpcoming(tenantId, hoursNumber);
  }

  @Get('post/:postId')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findByPost(@Request() req: any, @Param('postId') postId: string) {
    const tenantId = req.tenantId;
    return this.schedulesService.findByPost(tenantId, postId);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.schedulesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(ValidationPipe) updateScheduleDto: UpdateScheduleDto
  ) {
    const tenantId = req.tenantId;
    return this.schedulesService.update(tenantId, id, updateScheduleDto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.schedulesService.remove(tenantId, id);
  }
}
