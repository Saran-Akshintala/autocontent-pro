// Common types for AutoContent Pro

export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  userId: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum CampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  RUNNING = 'running',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  FAILED = 'failed',
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

// Export new post and calendar types
export * from './lib/post.types';
export * from './lib/calendar.types';
