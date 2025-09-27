import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  totalEarnings: number;
  pendingPayouts: number;
  thisMonthEarnings: number;
}

export interface ReferralInfo {
  id: string;
  tenantName: string;
  status: string;
  signupDate: Date;
  activatedAt?: Date;
  monthlyRevenue: number;
  totalCommissions: number;
}

export interface PayoutInfo {
  id: string;
  amount: number;
  currency: string;
  period: string;
  status: string;
  dueDate: Date;
  paidAt?: Date;
  tenantName: string;
}

@Injectable()
export class AffiliateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate or get existing affiliate code for a user
   */
  async getOrCreateAffiliateCode(userId: string): Promise<string> {
    // Check if user already has an affiliate code
    let affiliate = await this.prisma.affiliate.findFirst({
      where: { ownerUserId: userId, isActive: true }
    });

    if (!affiliate) {
      // Generate unique affiliate code
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, email: true }
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create code from name or email
      const baseName = user.firstName || user.email.split('@')[0];
      const baseCode = baseName.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
      const year = new Date().getFullYear();
      
      let code = `${baseCode}${year}`;
      let counter = 1;

      // Ensure uniqueness
      while (await this.prisma.affiliate.findUnique({ where: { code } })) {
        code = `${baseCode}${year}${counter}`;
        counter++;
      }

      affiliate = await this.prisma.affiliate.create({
        data: {
          code,
          ownerUserId: userId,
          isActive: true
        }
      });
    }

    return affiliate.code;
  }

  /**
   * Record a referral when someone signs up with an affiliate code
   */
  async recordReferral(affiliateCode: string, tenantId: string): Promise<void> {
    // Verify affiliate code exists and is active
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { code: affiliateCode, isActive: true }
    });

    if (!affiliate) {
      throw new BadRequestException('Invalid or inactive affiliate code');
    }

    // Check if referral already exists
    const existingReferral = await this.prisma.referral.findUnique({
      where: { 
        code_tenantId: {
          code: affiliateCode,
          tenantId: tenantId
        }
      }
    });

    if (existingReferral) {
      return; // Already recorded
    }

    // Create referral record
    await this.prisma.referral.create({
      data: {
        code: affiliateCode,
        tenantId: tenantId,
        status: 'PENDING',
        signupDate: new Date()
      }
    });

    console.log(`📈 Referral recorded: ${affiliateCode} -> ${tenantId}`);
  }

  /**
   * Activate a referral when tenant makes first payment
   */
  async activateReferral(tenantId: string): Promise<void> {
    const referral = await this.prisma.referral.findFirst({
      where: { tenantId, status: 'PENDING' }
    });

    if (referral) {
      await this.prisma.referral.update({
        where: { id: referral.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date()
        }
      });

      console.log(`✅ Referral activated for tenant: ${tenantId}`);
    }
  }

  /**
   * Generate monthly commission payouts (30% of subscription revenue)
   */
  async generateMonthlyPayouts(period: string): Promise<void> {
    const activeReferrals = await this.prisma.referral.findMany({
      where: { status: 'ACTIVE' },
      include: {
        tenant: {
          select: { plan: true }
        }
      }
    });

    const planPrices = {
      STARTER: 29,
      GROWTH: 79,
      AGENCY: 199
    };

    for (const referral of activeReferrals) {
      const subscriptionAmount = planPrices[referral.tenant.plan] || 0;
      const commissionAmount = subscriptionAmount * 0.30; // 30% commission

      if (commissionAmount > 0) {
        // Check if payout already exists for this period
        const existingPayout = await this.prisma.payoutLedger.findUnique({
          where: {
            affiliateCode_tenantId_period: {
              affiliateCode: referral.code,
              tenantId: referral.tenantId,
              period: period
            }
          }
        });

        if (!existingPayout) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1); // Due next month

          await this.prisma.payoutLedger.create({
            data: {
              affiliateCode: referral.code,
              tenantId: referral.tenantId,
              amount: new Decimal(commissionAmount),
              currency: 'USD',
              period: period,
              status: 'PENDING',
              dueDate: dueDate
            }
          });
        }
      }
    }

    console.log(`💰 Monthly payouts generated for period: ${period}`);
  }

  /**
   * Get affiliate statistics for a user
   */
  async getAffiliateStats(userId: string): Promise<AffiliateStats> {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { ownerUserId: userId, isActive: true }
    });

    if (!affiliate) {
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        pendingReferrals: 0,
        totalEarnings: 0,
        pendingPayouts: 0,
        thisMonthEarnings: 0
      };
    }

    const [referralCounts, payoutStats] = await Promise.all([
      this.prisma.referral.groupBy({
        by: ['status'],
        where: { code: affiliate.code },
        _count: { status: true }
      }),
      this.prisma.payoutLedger.aggregate({
        where: { affiliateCode: affiliate.code },
        _sum: { amount: true },
        _count: { id: true }
      })
    ]);

    const pendingPayouts = await this.prisma.payoutLedger.aggregate({
      where: { 
        affiliateCode: affiliate.code,
        status: 'PENDING'
      },
      _sum: { amount: true }
    });

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const thisMonthPayouts = await this.prisma.payoutLedger.aggregate({
      where: {
        affiliateCode: affiliate.code,
        period: currentMonth
      },
      _sum: { amount: true }
    });

    const statusCounts = referralCounts.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalReferrals: statusCounts.PENDING + statusCounts.ACTIVE + statusCounts.INACTIVE + statusCounts.CANCELLED || 0,
      activeReferrals: statusCounts.ACTIVE || 0,
      pendingReferrals: statusCounts.PENDING || 0,
      totalEarnings: Number(payoutStats._sum.amount || 0),
      pendingPayouts: Number(pendingPayouts._sum.amount || 0),
      thisMonthEarnings: Number(thisMonthPayouts._sum.amount || 0)
    };
  }

  /**
   * Get detailed referral information for a user
   */
  async getReferrals(userId: string): Promise<ReferralInfo[]> {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { ownerUserId: userId, isActive: true }
    });

    if (!affiliate) {
      return [];
    }

    const referrals = await this.prisma.referral.findMany({
      where: { code: affiliate.code },
      include: {
        tenant: {
          select: { 
            name: true,
            plan: true
          }
        }
      },
      orderBy: { signupDate: 'desc' }
    });

    const planPrices = {
      STARTER: 29,
      GROWTH: 79,
      AGENCY: 199
    };

    return Promise.all(referrals.map(async (referral) => {
      const monthlyRevenue = planPrices[referral.tenant.plan] || 0;
      
      const totalCommissions = await this.prisma.payoutLedger.aggregate({
        where: {
          affiliateCode: affiliate.code,
          tenantId: referral.tenantId
        },
        _sum: { amount: true }
      });

      return {
        id: referral.id,
        tenantName: referral.tenant.name,
        status: referral.status,
        signupDate: referral.signupDate,
        activatedAt: referral.activatedAt,
        monthlyRevenue,
        totalCommissions: Number(totalCommissions._sum.amount || 0)
      };
    }));
  }

  /**
   * Get payout history for a user
   */
  async getPayouts(userId: string): Promise<PayoutInfo[]> {
    const affiliate = await this.prisma.affiliate.findFirst({
      where: { ownerUserId: userId, isActive: true }
    });

    if (!affiliate) {
      return [];
    }

    const payouts = await this.prisma.payoutLedger.findMany({
      where: { affiliateCode: affiliate.code },
      include: {
        tenant: {
          select: { name: true }
        }
      },
      orderBy: { dueDate: 'desc' }
    });

    return payouts.map(payout => ({
      id: payout.id,
      amount: Number(payout.amount),
      currency: payout.currency,
      period: payout.period,
      status: payout.status,
      dueDate: payout.dueDate,
      paidAt: payout.paidAt,
      tenantName: payout.tenant.name
    }));
  }
}
