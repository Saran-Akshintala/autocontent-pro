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

export interface PostContent {
  hook: string;
  body: string;
  hashtags: string[];
  platforms: Platform[];
}

export interface Post {
  id: string;
  tenantId: string;
  brandId: string;
  title: string;
  content: PostContent;
  status: PostStatus;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  // Relations
  brand?: {
    id: string;
    name: string;
    brandKit?: {
      logoUrl?: string;
    };
  };
  schedule?: Schedule;
  assets?: PostAsset[];
}

export interface PostAsset {
  id: string;
  postId: string;
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  filename: string;
  size: number;
  createdAt: Date;
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

// DTOs for API requests/responses
export interface CreatePostRequest {
  brandId: string;
  title: string;
  content: PostContent;
}

export interface UpdatePostRequest {
  title?: string;
  content?: Partial<PostContent>;
  status?: PostStatus;
}

export interface CreateScheduleRequest {
  postId: string;
  runAt: string; // ISO string
  timezone: string;
}

export interface UpdateScheduleRequest {
  runAt?: string; // ISO string
  timezone?: string;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PostsListQuery {
  page?: number;
  limit?: number;
  status?: PostStatus;
  brandId?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}
