import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

export interface SessionHeartbeatDto {
  sessionId: string;
  status: 'connecting' | 'connected' | 'authenticated' | 'disconnected' | 'destroyed';
  clientInfo?: {
    platform?: string;
    version?: string;
    battery?: number;
    plugged?: boolean;
  };
  metadata?: {
    phoneNumber?: string;
    pushName?: string;
    lastSeen?: string;
    isOnline?: boolean;
  };
}

export interface ApprovalActionDto {
  postId: string;
  guidance?: string;
}

@Controller('wa')
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Public()
  @Post('sessions/heartbeat')
  @HttpCode(HttpStatus.OK)
  async sessionHeartbeat(@Body() heartbeatDto: SessionHeartbeatDto) {
    return this.whatsAppService.updateSessionHeartbeat(heartbeatDto);
  }

  @Get('sessions/:sessionId/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    return this.whatsAppService.getSessionStatus(sessionId);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getAllSessions() {
    return this.whatsAppService.getAllSessions();
  }

  @Post('sessions/:sessionId/restart')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('OWNER', 'ADMIN')
  async restartSession(@Param('sessionId') sessionId: string) {
    return this.whatsAppService.restartSession(sessionId);
  }

  // Approval endpoints for the bot
  @Public()
  @Post('approvals/approve')
  @HttpCode(HttpStatus.OK)
  async approvePost(@Body() { postId }: ApprovalActionDto) {
    return this.whatsAppService.approvePost(postId);
  }

  @Public()
  @Post('approvals/request-change')
  @HttpCode(HttpStatus.OK)
  async requestChange(@Body() { postId, guidance }: ApprovalActionDto) {
    return this.whatsAppService.requestChange(postId, guidance);
  }

  @Public()
  @Post('approvals/pause')
  @HttpCode(HttpStatus.OK)
  async pausePost(@Body() { postId }: ApprovalActionDto) {
    return this.whatsAppService.pausePost(postId);
  }

  // Get post preview for approval messages
  @Public()
  @Get('posts/:postId/preview')
  async getPostPreview(@Param('postId') postId: string) {
    return this.whatsAppService.getPostPreview(postId);
  }
}
