import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ValidationPipe
} from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { ApprovePostDto, RequestChangeDto } from './dto/approvals.dto';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  async getPendingApprovals(@TenantId() tenantId: string) {
    return this.approvalsService.getPendingApprovals(tenantId);
  }

  @Post('approve')
  @Roles('CLIENT', 'ADMIN', 'OWNER')
  async approvePost(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Body() approvePostDto: ApprovePostDto,
  ) {
    return this.approvalsService.approvePost(
      tenantId, 
      approvePostDto.postId, 
      req.user.id,
      approvePostDto.brandId
    );
  }

  @Post('reject/:postId')
  @Roles('CLIENT', 'ADMIN', 'OWNER')
  async rejectPost(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Param('postId') postId: string,
    @Body() body: { feedback?: string; brandId: string }
  ) {
    const userId = req.user.id;
    return this.approvalsService.rejectPost(tenantId, postId, userId, body.brandId, body.feedback);
  }

  @Post('request-change')
  @Roles('CLIENT', 'ADMIN', 'OWNER')
  async requestChange(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Body() requestChangeDto: RequestChangeDto,
  ) {
    const userId = req.user.id;
    return this.approvalsService.requestChange(
      tenantId, 
      requestChangeDto.postId, 
      userId,
      requestChangeDto.brandId,
      requestChangeDto.feedback
    );
  }

  @Get('preview/:postId')
  async getPostPreview(
    @TenantId() tenantId: string,
    @Param('postId') postId: string,
  ) {
    return this.approvalsService.getPostPreview(tenantId, postId);
  }

  @Get('logs/:postId')
  @Roles('ADMIN', 'OWNER')
  async getApprovalLogs(
    @TenantId() tenantId: string,
    @Param('postId') postId: string,
  ) {
    return this.approvalsService.getApprovalLogs(tenantId, postId);
  }
}
