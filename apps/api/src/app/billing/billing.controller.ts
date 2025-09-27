import { Controller, Get, Post, Body, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  /**
   * Get billing summary for the current tenant
   */
  @Get('summary')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async getBillingSummary(@Request() req: any) {
    try {
      
      // Return hardcoded mock data for now
      const mockSummary = {
        currentPlan: {
          name: 'STARTER',
          postCredits: 50,
          imageCredits: 20,
          maxBrands: 1,
          price: 29,
          features: [
            'AI Content Generation',
            'Basic Analytics',
            'WhatsApp Integration',
            'Email Support'
          ]
        },
        usage: {
          plan: 'STARTER',
          postCreditsUsed: 5,
          postCreditsLimit: 50,
          imageCreditsUsed: 2,
          imageCreditsLimit: 20,
          brandsCount: 1,
          brandsLimit: 1,
          usageResetAt: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        percentages: {
          postCredits: 10,
          imageCredits: 10,
          brands: 100
        },
        upsell: {
          showUpsell: false,
          urgency: 'low' as const
        },
        availablePlans: {
          STARTER: {
            postCredits: 50,
            imageCredits: 20,
            maxBrands: 1,
            price: 29,
            features: ['AI Content Generation', 'Basic Analytics', 'WhatsApp Integration', 'Email Support']
          },
          GROWTH: {
            postCredits: 200,
            imageCredits: 100,
            maxBrands: 5,
            price: 79,
            features: ['Everything in Starter', 'Advanced Analytics', 'Multi-Brand Management', 'Priority Support']
          },
          AGENCY: {
            postCredits: 1000,
            imageCredits: 500,
            price: 199,
            features: ['Everything in Growth', 'White-Label Solution', 'Team Collaboration', 'API Access', 'Dedicated Support']
          }
        }
      };
      
      console.log('Returning mock billing summary');
      return {
        success: true,
        data: mockSummary
      };
    } catch (error) {
      console.error('Billing summary error:', error);
      throw error;
    }
  }

  /**
   */
  @Get('usage')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async getUsage(@Request() req: any) {
    // Return mock usage data
    return {
      success: true,
      data: {
        usage: {
          plan: 'STARTER',
          postCreditsUsed: 5,
          postCreditsLimit: 50,
          imageCreditsUsed: 2,
          imageCreditsLimit: 20,
          brandsCount: 1,
          brandsLimit: 1,
          usageResetAt: new Date(),
          billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        },
        percentages: {
          postCredits: 10,
          imageCredits: 10,
          brands: 100
        }
      }
    };
  }

  /**
   * Get all available plans
   */
  @Get('plans')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async getPlans() {
    const plans = {
      STARTER: {
        postCredits: 50,
        imageCredits: 20,
        maxBrands: 1,
        price: 29,
        features: ['AI Content Generation', 'Basic Analytics', 'WhatsApp Integration', 'Email Support']
      },
      GROWTH: {
        postCredits: 200,
        imageCredits: 100,
        maxBrands: 5,
        price: 79,
        features: ['Everything in Starter', 'Advanced Analytics', 'Multi-Brand Management', 'Priority Support']
      },
      AGENCY: {
        postCredits: 1000,
        imageCredits: 500,
        maxBrands: 25,
        price: 199,
        features: ['Everything in Growth', 'White-Label Solution', 'Team Collaboration', 'API Access', 'Dedicated Support']
      }
    };
    
    return {
      success: true,
      data: plans
    };
  }

  /**
   * Check if tenant should see upsell notifications
   */
  @Get('upsell')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async getUpsellStatus(@Request() req: any) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const upsell = await this.billingService.shouldShowUpsell(tenantId);
    
    return {
      success: true,
      data: upsell
    };
  }

  /**
   * Check if a feature can be used (for frontend validation)
   */
  @Post('check-usage')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  async checkUsage(
    @Request() req: any,
    @Body() body: { featureType: 'POST_GENERATION' | 'IMAGE_GENERATION' | 'BRAND_CREATION'; amount?: number }
  ) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    const { featureType, amount = 1 } = body;
    const result = await this.billingService.canUseFeature(tenantId, featureType, amount);
    
    return {
      success: true,
      data: result
    };
  }

  /**
   * Placeholder for upgrade URL generation
   * In production, this would integrate with Stripe/Razorpay
   */
  @Post('upgrade-url')
  @Roles('OWNER', 'ADMIN')
  async getUpgradeUrl(
    @Request() req: any,
    @Body() body: { plan: string; billingCycle?: 'monthly' | 'yearly' }
  ) {
    const tenantId = req.user.tenantId;
    const { plan, billingCycle = 'monthly' } = body;
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // In production, generate actual Stripe/Razorpay checkout URL
    const mockUpgradeUrl = `https://billing.autocontentpro.com/upgrade?plan=${plan}&cycle=${billingCycle}&tenant=${tenantId}`;
    
    return {
      success: true,
      data: {
        upgradeUrl: mockUpgradeUrl,
        plan,
        billingCycle
      }
    };
  }

  /**
   * Placeholder for billing portal URL
   * In production, this would generate Stripe customer portal URL
   */
  @Get('portal-url')
  @Roles('OWNER', 'ADMIN')
  async getBillingPortalUrl(@Request() req: any) {
    const tenantId = req.user.tenantId;
    
    if (!tenantId) {
      throw new BadRequestException('Tenant ID is required');
    }

    // In production, generate actual Stripe customer portal URL
    const mockPortalUrl = `https://billing.autocontentpro.com/portal?tenant=${tenantId}`;
    
    return {
      success: true,
      data: {
        portalUrl: mockPortalUrl
      }
    };
  }
}
