import { Controller, Get, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('affiliate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  /**
   * Get or create affiliate code for current user
   */
  @Get('code')
  @Roles('OWNER') // Only owners can have affiliate codes
  async getAffiliateCode(@Request() req: any) {
    try {
      const userId = req.user.sub;
      
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const code = await this.affiliateService.getOrCreateAffiliateCode(userId);
      
      return {
        success: true,
        data: { code }
      };
    } catch (error) {
      console.error('❌ Failed to get affiliate code:', error);
      throw error;
    }
  }

  /**
   * Get affiliate dashboard statistics
   */
  @Get('stats')
  @Roles('OWNER') // Only owners can view affiliate stats
  async getAffiliateStats(@Request() req: any) {
    try {
      const userId = req.user.sub;
      
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const stats = await this.affiliateService.getAffiliateStats(userId);
      
      return {
        success: true,
        data: stats
      };
    } catch (error) {
      console.error('❌ Failed to get affiliate stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed referral information
   */
  @Get('referrals')
  @Roles('OWNER') // Only owners can view their referrals
  async getReferrals(@Request() req: any) {
    try {
      const userId = req.user.sub;
      
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const referrals = await this.affiliateService.getReferrals(userId);
      
      return {
        success: true,
        data: referrals
      };
    } catch (error) {
      console.error('❌ Failed to get referrals:', error);
      throw error;
    }
  }

  /**
   * Get payout history
   */
  @Get('payouts')
  @Roles('OWNER') // Only owners can view their payouts
  async getPayouts(@Request() req: any) {
    try {
      const userId = req.user.sub;
      
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const payouts = await this.affiliateService.getPayouts(userId);
      
      return {
        success: true,
        data: payouts
      };
    } catch (error) {
      console.error('❌ Failed to get payouts:', error);
      throw error;
    }
  }

  /**
   * Record a referral (called during signup process)
   */
  @Post('referral')
  @Public() // Public endpoint for signup process
  async recordReferral(@Body() body: { affiliateCode: string; tenantId: string }) {
    try {
      const { affiliateCode, tenantId } = body;
      
      if (!affiliateCode || !tenantId) {
        throw new BadRequestException('Affiliate code and tenant ID are required');
      }

      await this.affiliateService.recordReferral(affiliateCode, tenantId);
      
      return {
        success: true,
        message: 'Referral recorded successfully'
      };
    } catch (error) {
      console.error('❌ Failed to record referral:', error);
      throw error;
    }
  }

  /**
   * Activate a referral (called when tenant makes first payment)
   */
  @Post('activate')
  @Roles('OWNER', 'ADMIN') // Internal endpoint for payment processing
  async activateReferral(@Body() body: { tenantId: string }) {
    try {
      const { tenantId } = body;
      
      if (!tenantId) {
        throw new BadRequestException('Tenant ID is required');
      }

      await this.affiliateService.activateReferral(tenantId);
      
      return {
        success: true,
        message: 'Referral activated successfully'
      };
    } catch (error) {
      console.error('❌ Failed to activate referral:', error);
      throw error;
    }
  }

  /**
   * Generate monthly payouts (admin/cron endpoint)
   */
  @Post('generate-payouts')
  @Roles('OWNER', 'ADMIN') // Admin endpoint for generating payouts
  async generatePayouts(@Body() body: { period: string }) {
    try {
      const { period } = body;
      
      if (!period) {
        throw new BadRequestException('Period is required (format: YYYY-MM)');
      }

      await this.affiliateService.generateMonthlyPayouts(period);
      
      return {
        success: true,
        message: `Payouts generated for period: ${period}`
      };
    } catch (error) {
      console.error('❌ Failed to generate payouts:', error);
      throw error;
    }
  }
}
