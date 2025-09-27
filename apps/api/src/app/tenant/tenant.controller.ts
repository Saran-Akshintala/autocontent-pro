import { 
  Controller, 
  Get, 
  Put, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Req, 
  Logger,
  BadRequestException 
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { TenantService } from './tenant.service';
import { 
  UpdateTenantSettingsDto, 
  WhatsAppSessionBinding 
} from '@autocontent-pro/types';
import { IsOptional, IsString, IsEmail, IsUrl, Matches, IsBoolean } from 'class-validator';

class UpdateTenantSettingsBodyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  whiteLabel?: {
    logoUrl?: string;
    primaryColor?: string;
    supportEmail?: string;
  };

  @IsOptional()
  @IsString()
  defaultWaSender?: string;
}

class WhiteLabelDto {
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Primary color must be a valid hex color (e.g., #FF0000)',
  })
  primaryColor?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;
}

class BindWhatsAppSessionDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

class SetDefaultSenderDto {
  @IsString()
  sessionId: string;
}

@Controller('tenant')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  private readonly logger = new Logger(TenantController.name);

  constructor(private readonly tenantService: TenantService) {}

  /**
   * Get current tenant settings
   */
  @Get('settings')
  async getTenantSettings(@Req() req: any) {
    try {
      const settings = await this.tenantService.getTenantSettings(req.user.tenantId);
      
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant settings: ${error.message}`);
      throw new BadRequestException(`Failed to get tenant settings: ${error.message}`);
    }
  }

  /**
   * Update tenant settings (OWNER/ADMIN only)
   */
  @Put('settings')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async updateTenantSettings(
    @Body() updateData: UpdateTenantSettingsBodyDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(`Updating tenant settings for ${req.user.tenantId}`);
      
      const updatedSettings = await this.tenantService.updateTenantSettings(
        req.user.tenantId,
        updateData
      );

      return {
        success: true,
        message: 'Tenant settings updated successfully',
        data: updatedSettings,
      };
    } catch (error) {
      this.logger.error(`Failed to update tenant settings: ${error.message}`);
      throw new BadRequestException(`Failed to update tenant settings: ${error.message}`);
    }
  }

  /**
   * Get tenant branding for theming
   */
  @Get('branding')
  async getTenantBranding(@Req() req: any) {
    try {
      const branding = await this.tenantService.getTenantBranding(req.user.tenantId);
      
      return {
        success: true,
        data: branding,
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant branding: ${error.message}`);
      throw new BadRequestException(`Failed to get tenant branding: ${error.message}`);
    }
  }

  /**
   * Get WhatsApp sessions for tenant
   */
  @Get('whatsapp-sessions')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getTenantWhatsAppSessions(@Req() req: any) {
    try {
      const sessions = await this.tenantService.getTenantWhatsAppSessions(req.user.tenantId);
      
      return {
        success: true,
        data: sessions,
      };
    } catch (error) {
      this.logger.error(`Failed to get WhatsApp sessions: ${error.message}`);
      throw new BadRequestException(`Failed to get WhatsApp sessions: ${error.message}`);
    }
  }

  /**
   * Bind WhatsApp session to tenant (OWNER/ADMIN only)
   */
  @Post('whatsapp-sessions/bind')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async bindWhatsAppSession(
    @Body() bindingData: BindWhatsAppSessionDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(`Binding WhatsApp session ${bindingData.sessionId} to tenant ${req.user.tenantId}`);
      
      const binding: WhatsAppSessionBinding = {
        sessionId: bindingData.sessionId,
        tenantId: req.user.tenantId,
        isDefault: bindingData.isDefault,
      };

      await this.tenantService.bindWhatsAppSession(binding);

      return {
        success: true,
        message: 'WhatsApp session bound successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to bind WhatsApp session: ${error.message}`);
      throw new BadRequestException(`Failed to bind WhatsApp session: ${error.message}`);
    }
  }

  /**
   * Set default WhatsApp sender (OWNER/ADMIN only)
   */
  @Put('whatsapp-sessions/default')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async setDefaultWhatsAppSender(
    @Body() senderData: SetDefaultSenderDto,
    @Req() req: any
  ) {
    try {
      this.logger.log(`Setting default WhatsApp sender for tenant ${req.user.tenantId}`);
      
      await this.tenantService.setDefaultWhatsAppSender(
        req.user.tenantId,
        senderData.sessionId
      );

      return {
        success: true,
        message: 'Default WhatsApp sender updated successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to set default WhatsApp sender: ${error.message}`);
      throw new BadRequestException(`Failed to set default WhatsApp sender: ${error.message}`);
    }
  }

  /**
   * Get tenant statistics (OWNER/ADMIN only)
   */
  @Get('stats')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async getTenantStats(@Req() req: any) {
    try {
      const stats = await this.tenantService.getTenantStats(req.user.tenantId);
      
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error(`Failed to get tenant stats: ${error.message}`);
      throw new BadRequestException(`Failed to get tenant stats: ${error.message}`);
    }
  }
}
