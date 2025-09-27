// Common types for AutoContent Pro

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  tenants: UserTenant[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserTenant {
  id: string;
  userId: string;
  tenantId: string;
  tenantName: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | 'CLIENT';
  createdAt: Date;
  updatedAt: Date;
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED'
}

export enum Platform {
  INSTAGRAM = 'INSTAGRAM',
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  FACEBOOK = 'FACEBOOK',
  TIKTOK = 'TIKTOK'
}

export interface Schedule {
  id: string;
  postId: string;
  runAt: Date;
  timezone: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: string;
  tenantId: string;
  brandId: string;
  title: string;
  content: any; // JSON content
  status: PostStatus;
  publishedAt?: Date;
  approvalNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  schedule?: Schedule;
  brand?: {
    id: string;
    name: string;
    brandKit?: {
      logoUrl?: string;
    };
  };
  assets?: any[];
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface WhatsAppMessage {
  id: string;
  campaignId: string;
  to: string;
  message: string;
  status: MessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
}

export interface QueueJob<T = any> {
  id: string;
  type: string;
  data: T;
  priority?: number;
  delay?: number;
  attempts?: number;
  createdAt: Date;
}

export interface WhatsAppJobData {
  to: string;
  message: string;
  campaignId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Analytics Types
export interface PostAnalytics {
  id: string;
  postId: string;
  channelType: string;
  impressions: number;
  reach?: number;
  engagement: number;
  clicks: number;
  shares: number;
  comments: number;
  likes: number;
  metadata?: Record<string, any>;
  recordedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnalyticsTimeseriesPoint {
  date: string; // ISO date string
  impressions: number;
  engagement: number;
  clicks: number;
  reach?: number;
}

export interface AnalyticsTotals {
  totalImpressions: number;
  totalEngagement: number;
  totalClicks: number;
  totalShares: number;
  totalComments: number;
  totalLikes: number;
  totalPosts: number;
  avgEngagementRate: number;
  avgClickRate: number;
}

export interface TopPost {
  id: string;
  title: string;
  platforms: string[];
  publishedAt: Date;
  totalImpressions: number;
  totalEngagement: number;
  engagementRate: number;
  status: PostStatus;
}

export interface BrandAnalyticsResponse {
  brandId: string;
  brandName: string;
  dateRange: {
    start: string;
    end: string;
  };
  totals: AnalyticsTotals;
  timeseries: AnalyticsTimeseriesPoint[];
  topPosts: TopPost[];
  platformBreakdown: {
    platform: string;
    impressions: number;
    engagement: number;
    posts: number;
  }[];
}

// Analytics Job Data
export interface AnalyticsPullJobData {
  brandId: string;
  postIds?: string[];
  forceRefresh?: boolean;
  tenantId: string;
}

// Tenant Settings Types
export interface WhiteLabelSettings {
  logoUrl?: string;
  primaryColor?: string;
  supportEmail?: string;
}

export interface TenantSettings {
  id: string;
  name: string;
  plan: string;
  whatsappMode: string;
  whiteLabel?: WhiteLabelSettings;
  defaultWaSender?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateTenantSettingsDto {
  name?: string;
  whiteLabel?: WhiteLabelSettings;
  defaultWaSender?: string;
}

export interface WhatsAppSessionBinding {
  sessionId: string;
  tenantId: string;
  isDefault?: boolean;
}

// Agency Admin Types
export interface StaffInvite {
  id: string;
  email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface CreateStaffInviteDto {
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CLIENT';
}

export interface BrandManagement {
  id: string;
  name: string;
  timezone: string;
  postsCount: number;
  lastActivity?: Date;
  createdAt: Date;
}

// Billing & Usage Types
export type PlanType = 'STARTER' | 'GROWTH' | 'AGENCY';

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

export interface UsagePercentages {
  postCredits: number;
  imageCredits: number;
  brands: number;
}

export interface UpsellInfo {
  showUpsell: boolean;
  reason?: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface BillingSummary {
  currentPlan: PlanLimits & { name: string };
  usage: UsageSummary;
  percentages: UsagePercentages;
  upsell: UpsellInfo;
  availablePlans: Record<string, PlanLimits>;
}

// Affiliate & Referral Types
export type ReferralStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
export type PayoutStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';

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
  status: ReferralStatus;
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
  status: PayoutStatus;
  dueDate: Date;
  paidAt?: Date;
  tenantName: string;
}

export interface AffiliateDashboard {
  code: string;
  stats: AffiliateStats;
  referrals: ReferralInfo[];
  payouts: PayoutInfo[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'post' | 'schedule';
  status: PostStatus;
  brandName?: string;
}

// Export new post and calendar types
// Temporarily disabled due to compilation issues
// export * from './lib/post.types';
// export * from './lib/calendar.types';
