import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  TenantSettings, 
  UpdateTenantSettingsDto, 
  WhatsAppSessionBinding,
  WhiteLabelSettings 
} from '@autocontent-pro/types';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get tenant settings including white-label configuration
   */
  async getTenantSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        plan: true,
        whatsappMode: true,
        whiteLabel: true,
        defaultWaSender: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    return {
      id: tenant.id,
      name: tenant.name,
      plan: tenant.plan,
      whatsappMode: tenant.whatsappMode,
      whiteLabel: tenant.whiteLabel as WhiteLabelSettings || undefined,
      defaultWaSender: tenant.defaultWaSender || undefined,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
    };
  }

  /**
   * Update tenant settings including white-label configuration
   */
  async updateTenantSettings(
    tenantId: string, 
    updateData: UpdateTenantSettingsDto
  ): Promise<TenantSettings> {
    
    // Validate white-label settings if provided
    if (updateData.whiteLabel) {
      this.validateWhiteLabelSettings(updateData.whiteLabel);
    }

    // Validate WhatsApp sender if provided
    if (updateData.defaultWaSender) {
      await this.validateWhatsAppSender(tenantId, updateData.defaultWaSender);
    }

    const updatedTenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.whiteLabel && { whiteLabel: updateData.whiteLabel as any }),
        ...(updateData.defaultWaSender !== undefined && { 
          defaultWaSender: updateData.defaultWaSender 
        }),
      },
      select: {
        id: true,
        name: true,
        plan: true,
        whatsappMode: true,
        whiteLabel: true,
        defaultWaSender: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    this.logger.log(`Updated tenant settings for ${tenantId}`);

    return {
      id: updatedTenant.id,
      name: updatedTenant.name,
      plan: updatedTenant.plan,
      whatsappMode: updatedTenant.whatsappMode,
      whiteLabel: updatedTenant.whiteLabel as WhiteLabelSettings || undefined,
      defaultWaSender: updatedTenant.defaultWaSender || undefined,
      createdAt: updatedTenant.createdAt,
      updatedAt: updatedTenant.updatedAt,
    };
  }

  /**
   * Bind a WhatsApp session to a tenant
   */
  async bindWhatsAppSession(binding: WhatsAppSessionBinding): Promise<void> {
    const { sessionId, tenantId, isDefault } = binding;

    // Verify the session exists
    const session = await this.prisma.whatsAppSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`WhatsApp session not found: ${sessionId}`);
    }

    // Update the session to bind it to the tenant
    await this.prisma.whatsAppSession.update({
      where: { id: sessionId },
      data: {
        tenantId,
      },
    });

    // If this should be the default sender, update tenant
    if (isDefault) {
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: {
          defaultWaSender: sessionId,
        },
      });
    }

    this.logger.log(`Bound WhatsApp session ${sessionId} to tenant ${tenantId}${isDefault ? ' as default' : ''}`);
  }

  /**
   * Get WhatsApp sessions for a tenant
   */
  async getTenantWhatsAppSessions(tenantId: string) {
    const sessions = await this.prisma.whatsAppSession.findMany({
      where: { tenantId },
      select: {
        id: true,
        phoneNumber: true,
        status: true,
        lastSeen: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultWaSender: true },
    });

    return {
      sessions: sessions.map(session => ({
        ...session,
        isDefault: session.id === tenant?.defaultWaSender,
      })),
      defaultSender: tenant?.defaultWaSender,
    };
  }

  /**
   * Set default WhatsApp sender for tenant
   */
  async setDefaultWhatsAppSender(tenantId: string, sessionId: string): Promise<void> {
    // Verify the session belongs to this tenant
    const session = await this.prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new NotFoundException(`WhatsApp session not found or not owned by tenant`);
    }

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        defaultWaSender: sessionId,
      },
    });

    this.logger.log(`Set default WhatsApp sender for tenant ${tenantId}: ${sessionId}`);
  }

  /**
   * Get tenant branding for theming
   */
  async getTenantBranding(tenantId: string): Promise<WhiteLabelSettings | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { whiteLabel: true },
    });

    return tenant?.whiteLabel as WhiteLabelSettings || null;
  }

  /**
   * Validate white-label settings
   */
  private validateWhiteLabelSettings(whiteLabel: WhiteLabelSettings): void {
    if (whiteLabel.logoUrl && !this.isValidUrl(whiteLabel.logoUrl)) {
      throw new BadRequestException('Invalid logo URL format');
    }

    if (whiteLabel.primaryColor && !this.isValidHexColor(whiteLabel.primaryColor)) {
      throw new BadRequestException('Invalid primary color format (use hex color)');
    }

    if (whiteLabel.supportEmail && !this.isValidEmail(whiteLabel.supportEmail)) {
      throw new BadRequestException('Invalid support email format');
    }
  }

  /**
   * Validate WhatsApp sender belongs to tenant
   */
  private async validateWhatsAppSender(tenantId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.whatsAppSession.findFirst({
      where: {
        id: sessionId,
        tenantId,
      },
    });

    if (!session) {
      throw new BadRequestException('WhatsApp session not found or not owned by tenant');
    }
  }

  /**
   * Utility: Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Utility: Validate hex color format
   */
  private isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  }

  /**
   * Utility: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get tenant statistics for admin dashboard
   */
  async getTenantStats(tenantId: string) {
    const [brandsCount, postsCount, usersCount, whatsappSessions] = await Promise.all([
      this.prisma.brand.count({ where: { tenantId } }),
      this.prisma.post.count({ where: { tenantId } }),
      this.prisma.userTenant.count({ where: { tenantId } }),
      this.prisma.whatsAppSession.count({ where: { tenantId } }),
    ]);

    const recentActivity = await this.prisma.post.findFirst({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      brandsCount,
      postsCount,
      usersCount,
      whatsappSessions,
      lastActivity: recentActivity?.updatedAt,
    };
  }
}
