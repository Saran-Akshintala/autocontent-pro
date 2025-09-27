import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PlanLimits {
  postCredits: number;
  imageCredits: number;
  maxBrands: number;
  price: number;
  features: string[];
}

export interface UsageSummary {
  plan: string;
  postCreditsUsed: number;
  postCreditsLimit: number;
  imageCreditsUsed: number;
  imageCreditsLimit: number;
  brandsCount: number;
  brandsLimit: number;
  usageResetAt: Date;
  billingPeriodEnd: Date;
}

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly PLAN_LIMITS: Record<string, PlanLimits> = {
    STARTER: {
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
    GROWTH: {
      postCredits: 200,
      imageCredits: 100,
      maxBrands: 5,
      price: 79,
      features: [
        'Everything in Starter',
        'Advanced Analytics',
        'Multi-Brand Management',
        'Priority Support',
        'Custom Branding'
      ]
    },
    AGENCY: {
      postCredits: 1000,
      imageCredits: 500,
      maxBrands: 25,
      price: 199,
      features: [
        'Everything in Growth',
        'White-Label Solution',
        'Team Collaboration',
        'API Access',
        'Dedicated Support',
        'Custom Integrations'
      ]
    }
  };

  /**
   * Get plan limits for a specific plan
   */
  getPlanLimits(plan: string): PlanLimits {
    return this.PLAN_LIMITS[plan] || this.PLAN_LIMITS.STARTER;
  }

  /**
   * Get all available plans with their limits
   */
  getAllPlans(): Record<string, PlanLimits> {
    return this.PLAN_LIMITS;
  }

  /**
   * Get usage summary for a tenant
   */
  async getUsageSummary(tenantId: string): Promise<UsageSummary> {
    console.log('🔍 Getting usage summary for tenant:', tenantId);
    
    let tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        plan: true,
        createdAt: true
      }
    });
    
    console.log('📊 Tenant data found:', tenant);

    if (!tenant) {
      console.log('⚠️ Tenant not found, using default values for demo');
      // Return mock data for demo purposes
      const mockTenant = {
        plan: 'STARTER' as any,
        createdAt: new Date()
      };
      tenant = mockTenant;
    }

    const planLimits = this.getPlanLimits(tenant.plan);
    
    // Use default values since billing fields don't exist in database yet
    const usageResetAt = new Date(); // Current date as reset date
    const billingPeriodEnd = new Date(usageResetAt);
    billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

    console.log('📊 Returning mock usage data for demo purposes');
    
    return {
      plan: tenant.plan,
      postCreditsUsed: 5, // Mock data for demo
      postCreditsLimit: planLimits.postCredits,
      imageCreditsUsed: 2, // Mock data for demo
      imageCreditsLimit: planLimits.imageCredits,
      brandsCount: 1, // Mock data for demo
      brandsLimit: planLimits.maxBrands,
      usageResetAt,
      billingPeriodEnd
    };
  }

  /**
   * Check if tenant can perform an action based on usage limits
   */
  async canUseFeature(tenantId: string, featureType: 'POST_GENERATION' | 'IMAGE_GENERATION' | 'BRAND_CREATION', amount: number = 1): Promise<{ allowed: boolean; reason?: string; usage?: UsageSummary }> {
    const usage = await this.getUsageSummary(tenantId);
    
    switch (featureType) {
      case 'POST_GENERATION':
        const postAllowed = usage.postCreditsUsed + amount <= usage.postCreditsLimit;
        return {
          allowed: postAllowed,
          reason: postAllowed ? undefined : `Post generation limit exceeded. Used ${usage.postCreditsUsed}/${usage.postCreditsLimit} credits.`,
          usage
        };
        
      case 'IMAGE_GENERATION':
        const imageAllowed = usage.imageCreditsUsed + amount <= usage.imageCreditsLimit;
        return {
          allowed: imageAllowed,
          reason: imageAllowed ? undefined : `Image generation limit exceeded. Used ${usage.imageCreditsUsed}/${usage.imageCreditsLimit} credits.`,
          usage
        };
        
      case 'BRAND_CREATION':
        const brandAllowed = usage.brandsCount < usage.brandsLimit;
        return {
          allowed: brandAllowed,
          reason: brandAllowed ? undefined : `Brand limit exceeded. You have ${usage.brandsCount}/${usage.brandsLimit} brands.`,
          usage
        };
        
      default:
        return { allowed: true, usage };
    }
  }

  /**
   * Track usage for a tenant
   */
  async trackUsage(tenantId: string, usageType: 'POST_GENERATION' | 'IMAGE_GENERATION' | 'BRAND_CREATION', amount: number = 1, metadata?: any): Promise<void> {
    // For now, just log the usage since database fields don't exist yet
    console.log(`📊 Tracking usage: ${usageType} - ${amount} for tenant ${tenantId}`);
    console.log(`📊 Metadata:`, metadata);
    
    // TODO: Implement actual usage tracking once database migration is complete
    // This is a placeholder to prevent errors
  }

  /**
   * Check if usage needs to be reset (monthly)
   */
  private async checkAndResetUsage(tenantId: string): Promise<void> {
    // Placeholder method - no actual reset needed for demo
    console.log(`📊 Checking usage reset for tenant: ${tenantId}`);
    // TODO: Implement actual usage reset once database migration is complete
  }

  /**
   * Get usage percentage for UI progress bars
   */
  async getUsagePercentages(tenantId: string): Promise<{
    postCredits: number;
    imageCredits: number;
    brands: number;
  }> {
    const usage = await this.getUsageSummary(tenantId);
    
    return {
      postCredits: Math.round((usage.postCreditsUsed / usage.postCreditsLimit) * 100),
      imageCredits: Math.round((usage.imageCreditsUsed / usage.imageCreditsLimit) * 100),
      brands: Math.round((usage.brandsCount / usage.brandsLimit) * 100)
    };
  }

  /**
   * Check if user should see upsell notifications
   */
  async shouldShowUpsell(tenantId: string): Promise<{
    showUpsell: boolean;
    reason?: string;
    urgency: 'low' | 'medium' | 'high';
  }> {
    const percentages = await this.getUsagePercentages(tenantId);
    const usage = await this.getUsageSummary(tenantId);
    
    // High urgency - any limit at 90%+
    if (percentages.postCredits >= 90 || percentages.imageCredits >= 90 || percentages.brands >= 90) {
      return {
        showUpsell: true,
        reason: 'You\'re running low on credits. Upgrade to continue creating content.',
        urgency: 'high'
      };
    }
    
    // Medium urgency - any limit at 75%+
    if (percentages.postCredits >= 75 || percentages.imageCredits >= 75 || percentages.brands >= 75) {
      return {
        showUpsell: true,
        reason: 'You\'re approaching your plan limits. Consider upgrading for more credits.',
        urgency: 'medium'
      };
    }
    
    // Low urgency - starter plan with some usage
    if (usage.plan === 'STARTER' && (percentages.postCredits >= 50 || percentages.imageCredits >= 50)) {
      return {
        showUpsell: true,
        reason: 'Unlock more features and credits with our Growth plan.',
        urgency: 'low'
      };
    }
    
    return { showUpsell: false, urgency: 'low' };
  }

  /**
   * Get billing summary for billing page
   */
  async getBillingSummary(tenantId: string): Promise<{
    currentPlan: PlanLimits & { name: string };
    usage: UsageSummary;
    percentages: { postCredits: number; imageCredits: number; brands: number };
    upsell: { showUpsell: boolean; reason?: string; urgency: 'low' | 'medium' | 'high' };
    availablePlans: Record<string, PlanLimits>;
  }> {
    const usage = await this.getUsageSummary(tenantId);
    const percentages = await this.getUsagePercentages(tenantId);
    const upsell = await this.shouldShowUpsell(tenantId);
    const currentPlanLimits = this.getPlanLimits(usage.plan);
    
    return {
      currentPlan: {
        name: usage.plan,
        ...currentPlanLimits
      },
      usage,
      percentages,
      upsell,
      availablePlans: this.getAllPlans()
    };
  }
}
