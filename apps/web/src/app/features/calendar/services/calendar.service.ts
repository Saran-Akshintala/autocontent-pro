import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ENVIRONMENT } from '../../../core/tokens/environment.token';
import { inject } from '@angular/core';
import { 
  CalendarEvent, 
  CalendarView, 
  CalendarMonth, 
  CalendarWeek, 
  CalendarDay,
  Post,
  PostsListResponse
} from '../types/calendar.types';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private currentView$ = new BehaviorSubject<CalendarView>('month');
  private currentDate$ = new BehaviorSubject<Date>(new Date());
  private events$ = new BehaviorSubject<CalendarEvent[]>([]);

  private readonly env = inject(ENVIRONMENT);
  constructor(private http: HttpClient) {}

  // View Management
  getCurrentView(): Observable<CalendarView> {
    return this.currentView$.asObservable();
  }

  setCurrentView(view: CalendarView): void {
    this.currentView$.next(view);
  }

  getCurrentDate(): Observable<Date> {
    return this.currentDate$.asObservable();
  }

  setCurrentDate(date: Date): void {
    this.currentDate$.next(date);
  }

  // Navigation
  navigateToToday(): void {
    this.currentDate$.next(new Date());
  }

  navigatePrevious(): void {
    const currentDate = this.currentDate$.value;
    const currentView = this.currentView$.value;
    
    let newDate: Date;
    switch (currentView) {
      case 'month':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        break;
      case 'week':
        newDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
        newDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      default:
        newDate = new Date(currentDate);
        break;
    }
    this.currentDate$.next(newDate);
  }

  navigateNext(): void {
    const currentDate = this.currentDate$.value;
    const currentView = this.currentView$.value;
    
    let newDate: Date;
    switch (currentView) {
      case 'month':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        break;
      case 'week':
        newDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'day':
        newDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
        break;
      default:
        newDate = new Date(currentDate);
        break;
    }
    this.currentDate$.next(newDate);
  }

  // Data Loading
  loadCalendarEvents(): Observable<CalendarEvent[]> {
    return combineLatest([
      this.getCurrentDate(),
      this.getCurrentView()
    ]).pipe(
      switchMap(([date, view]) => {
        const { startDate, endDate } = this.getDateRange(date, view);
        return this.fetchPostsForDateRange(startDate, endDate);
      }),
      map((posts: Post[]) => this.convertPostsToEvents(posts))
    );
  }

  private fetchPostsForDateRange(startDate: Date, endDate: Date): Observable<Post[]> {
    // For now, fetch all posts and filter client-side
    // In production, you'd add date range parameters to the API
    return this.http.get<PostsListResponse>(`${this.env.apiBaseUrl}/posts`).pipe(
      map(response => response.posts.filter(post => {
        if (!post.schedule) return false;
        const scheduleDate = new Date(post.schedule.runAt);
        return scheduleDate >= startDate && scheduleDate <= endDate;
      }))
    );
  }

  private convertPostsToEvents(posts: Post[]): CalendarEvent[] {
    return posts.map(post => ({
      id: `post-${post.id}`,
      title: post.title,
      start: post.schedule ? new Date(post.schedule.runAt) : new Date(),
      end: post.schedule ? new Date(post.schedule.runAt) : new Date(),
      allDay: false,
      color: this.getStatusColor(post.status),
      textColor: '#ffffff',
      postId: post.id,
      brandId: post.brandId,
      brandName: post.brand?.name || 'Unknown Brand',
      status: post.status,
      platforms: post.content.platforms,
      content: {
        hook: post.content.hook,
        body: post.content.body,
        hashtags: post.content.hashtags
      }
    }));
  }

  private getStatusColor(status: string): string {
    switch (status) {
      case 'DRAFT': return '#ff9800';
      case 'SCHEDULED': return '#2196f3';
      case 'PUBLISHED': return '#4caf50';
      case 'FAILED': return '#f44336';
      default: return '#9e9e9e';
    }
  }

  private getDateRange(date: Date, view: CalendarView): { startDate: Date; endDate: Date } {
    switch (view) {
      case 'month':
        const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        // Extend to include full weeks
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - startDate.getDay());
        const endDate = new Date(lastDay);
        endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
        return { startDate, endDate };
      
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return { startDate: weekStart, endDate: weekEnd };
      
      case 'day':
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        return { startDate: dayStart, endDate: dayEnd };
      
      default:
        const defaultStart = new Date(date);
        defaultStart.setHours(0, 0, 0, 0);
        const defaultEnd = new Date(date);
        defaultEnd.setHours(23, 59, 59, 999);
        return { startDate: defaultStart, endDate: defaultEnd };
    }
  }

  // Calendar Generation
  generateMonthCalendar(date: Date, events: CalendarEvent[]): CalendarMonth {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const weeks: CalendarWeek[] = [];
    let currentWeekStart = new Date(firstDay);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    
    while (currentWeekStart <= lastDay) {
      const week = this.generateWeek(currentWeekStart, month, events);
      weeks.push(week);
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }
    
    return {
      year,
      month,
      weeks,
      totalEvents: events.length
    };
  }

  private generateWeek(weekStart: Date, currentMonth: number, events: CalendarEvent[]): CalendarWeek {
    const days: CalendarDay[] = [];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + i);
      
      const dayEvents = events.filter(event => 
        this.isSameDay(event.start, dayDate)
      );
      
      days.push({
        date: new Date(dayDate),
        isCurrentMonth: dayDate.getMonth() === currentMonth,
        isToday: this.isSameDay(dayDate, new Date()),
        isWeekend: dayDate.getDay() === 0 || dayDate.getDay() === 6,
        events: dayEvents,
        eventCount: dayEvents.length
      });
    }
    
    return {
      weekNumber: this.getWeekNumber(weekStart),
      days,
      startDate: new Date(weekStart),
      endDate: new Date(weekEnd)
    };
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  private getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  }

  // Drag & Drop Support
  moveEvent(eventId: string, newDate: Date): Observable<any> {
    const event = this.events$.value.find(e => e.id === eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Update the schedule via API
    return this.http.patch(`${this.env.apiBaseUrl}/schedules/${event.postId}`, {
      runAt: newDate.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  // Utility Methods
  formatDateRange(date: Date, view: CalendarView): string {
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      year: 'numeric' 
    };
    
    switch (view) {
      case 'month':
        return date.toLocaleDateString('en-US', options);
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      case 'day':
        return date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          month: 'long', 
          day: 'numeric', 
          year: 'numeric' 
        });
      default:
        return date.toLocaleDateString('en-US', options);
    }
  }
}
