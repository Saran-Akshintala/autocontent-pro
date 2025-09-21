// Local calendar types for the Angular app
export type CalendarView = 'month' | 'week' | 'day';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  color?: string;
  textColor?: string;
  
  // Post-specific data
  postId: string;
  brandId: string;
  brandName: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  platforms: string[];
  content?: {
    hook: string;
    body: string;
    hashtags: string[];
  };
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
  eventCount: number;
}

export interface CalendarWeek {
  weekNumber: number;
  days: CalendarDay[];
  startDate: Date;
  endDate: Date;
}

export interface CalendarMonth {
  year: number;
  month: number; // 0-11
  weeks: CalendarWeek[];
  totalEvents: number;
}

export interface Post {
  id: string;
  tenantId: string;
  brandId: string;
  title: string;
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    platforms: string[];
  };
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  
  brand?: {
    id: string;
    name: string;
  };
  schedule?: {
    id: string;
    postId: string;
    runAt: Date;
    timezone: string;
    status: string;
  };
}

export interface PostsListResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
