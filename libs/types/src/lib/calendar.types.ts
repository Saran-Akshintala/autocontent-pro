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
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PAUSED';
  platforms: string[];
  content?: {
    hook: string;
    body: string;
    hashtags: string[];
  };
}

export interface CalendarDragDropEvent {
  event: CalendarEvent;
  newStart: Date;
  newEnd: Date;
  oldStart: Date;
  oldEnd: Date;
}

export interface CalendarViewConfig {
  view: CalendarView;
  date: Date;
  startHour?: number;
  endHour?: number;
  slotDuration?: number; // minutes
}

export interface TimeSlot {
  start: Date;
  end: Date;
  events: CalendarEvent[];
  isEmpty: boolean;
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
