import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { CalendarService } from './services/calendar.service';
import { PostDrawerService } from '../posts/services/post-drawer.service';
import { 
  CalendarView, 
  CalendarEvent, 
  CalendarMonth, 
  CalendarDay,
  CalendarWeek
} from './types/calendar.types';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  template: `
    <div class="calendar-page">
      <div class="page-header">
        <h2>📅 Content Calendar</h2>
        <p>Plan and schedule your content across all platforms</p>
      </div>

      <div class="calendar-controls">
        <div class="view-controls">
          <button 
            class="btn btn-outline" 
            [class.active]="(currentView$ | async) === 'month'"
            (click)="onViewChange('month')">
            Month
          </button>
          <button 
            class="btn btn-outline" 
            [class.active]="(currentView$ | async) === 'week'"
            (click)="onViewChange('week')">
            Week
          </button>
          <button 
            class="btn btn-outline" 
            [class.active]="(currentView$ | async) === 'day'"
            (click)="onViewChange('day')">
            Day
          </button>
        </div>
        
        <div class="date-navigation">
          <button class="btn btn-icon" (click)="onNavigatePrevious()">‹</button>
          <span class="current-date">
            {{ calendarService.formatDateRange((currentDate$ | async)!, (currentView$ | async)!) }}
          </span>
          <button class="btn btn-icon" (click)="onNavigateNext()">›</button>
        </div>

        <div class="actions">
          <button class="btn btn-outline" (click)="onNavigateToday()">Today</button>
          <button class="btn btn-primary" (click)="openNewPost()">+ New Post</button>
        </div>
      </div>

      <!-- Month View -->
      <div class="calendar-container" *ngIf="(currentView$ | async) === 'month'">
        <div class="calendar-grid" *ngIf="calendarMonth$ | async as calendar">
          <div class="calendar-header">
            <div class="day-header" *ngFor="let day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']">
              {{ day }}
            </div>
          </div>

          <div class="calendar-body">
            <div class="calendar-week" *ngFor="let week of calendar.weeks; trackBy: trackByWeek">
              <div 
                class="calendar-day"
                *ngFor="let day of week.days; trackBy: trackByDay"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.weekend]="day.isWeekend"
                cdkDropList
                [cdkDropListData]="day.events"
                (cdkDropListDropped)="onEventDrop($event, day.date)">
                
                <span class="day-number">{{ day.date.getDate() }}</span>
                
                <div class="events-container">
                  <div 
                    class="event-item"
                    *ngFor="let event of day.events; trackBy: trackByEvent"
                    [style.background-color]="event.color"
                    [style.color]="event.textColor"
                    cdkDrag
                    [cdkDragData]="event"
                    [title]="event.title">
                    
                    <div class="event-content">
                      <span class="event-title">{{ event.title }}</span>
                      <span class="event-time">{{ event.start | date:'shortTime' }}</span>
                    </div>
                    
                    <div *cdkDragPreview class="drag-preview">
                      {{ event.title }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Week/Day views placeholder -->
      <div class="view-placeholder" *ngIf="(currentView$ | async) !== 'month'">
        <h3>{{ (currentView$ | async) | titlecase }} View</h3>
        <p>{{ (currentView$ | async) | titlecase }} view implementation coming soon...</p>
      </div>
    </div>
  `,
  styles: [`
    .calendar-page {
      max-width: 1400px;
      margin: 0 auto;
      padding: 20px;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .page-header h2 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: #2c3e50;
    }

    .page-header p {
      margin: 0;
      font-size: 16px;
      color: #6c757d;
    }

    .calendar-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .view-controls {
      display: flex;
      gap: 8px;
    }

    .date-navigation {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .current-date {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      min-width: 200px;
      text-align: center;
    }

    .actions {
      display: flex;
      gap: 12px;
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #dee2e6;
      color: #6c757d;
    }

    .btn-outline:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .btn-outline.active {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }

    .btn-icon {
      background: transparent;
      border: 1px solid #dee2e6;
      color: #6c757d;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }

    .btn-outline {
      background: transparent;
      border: 1px solid #dee2e6;
      color: #6c757d;
    }

    .btn-outline:hover {
      background: #f8f9fa;
      color: #495057;
    }

    .btn-outline.active {
      background: #3498db;
      color: white;
      border-color: #3498db;
    }

    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-primary:hover {
      background: #2980b9;
    }

    .calendar-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .calendar-grid {
      display: flex;
      flex-direction: column;
    }

    .calendar-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
    }

    .day-header {
      padding: 16px 12px;
      text-align: center;
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }

    .calendar-body {
      display: flex;
      flex-direction: column;
    }

    .calendar-week {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
    }

    .calendar-day {
      min-height: 120px;
      padding: 8px;
      border-right: 1px solid #e9ecef;
      border-bottom: 1px solid #e9ecef;
      position: relative;
      background: white;
    }

    .calendar-day:nth-child(7n) {
      border-right: none;
    }

    .calendar-day.other-month {
      background: #f8f9fa;
      color: #adb5bd;
    }

    .calendar-day.today {
      background: #e3f2fd;
    }

    .calendar-day.weekend {
      background: #fafafa;
    }

    .day-number {
      font-size: 14px;
      font-weight: 500;
      color: #495057;
    }

    .events-container {
      margin-top: 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .event-item {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: grab;
      transition: all 0.2s ease;
      border-left: 3px solid rgba(0, 0, 0, 0.2);
    }

    .event-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .event-item.cdk-drag-dragging {
      cursor: grabbing;
      opacity: 0.8;
    }

    .event-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .event-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-time {
      font-size: 10px;
      opacity: 0.8;
    }

    .drag-preview {
      background: #3498db;
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .view-placeholder {
      text-align: center;
      padding: 60px 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .view-placeholder h3 {
      margin: 0 0 12px 0;
      color: #2c3e50;
    }

    .view-placeholder p {
      margin: 0;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .calendar-controls {
        flex-direction: column;
        gap: 16px;
      }

      .calendar-day {
        min-height: 80px;
        padding: 4px;
      }

      .day-header {
        padding: 12px 8px;
        font-size: 12px;
      }

      .event-item {
        font-size: 10px;
        padding: 2px 4px;
      }

      .current-date {
        min-width: 150px;
        font-size: 16px;
      }
    }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentView$!: Observable<CalendarView>;
  currentDate$!: Observable<Date>;
  calendarMonth$!: Observable<CalendarMonth | null>;
  
  constructor(public calendarService: CalendarService, private postDrawer: PostDrawerService) {}
  
  ngOnInit(): void {
    this.currentView$ = this.calendarService.getCurrentView();
    this.currentDate$ = this.calendarService.getCurrentDate();
    this.calendarMonth$ = combineLatest([
      this.currentDate$,
      this.calendarService.loadCalendarEvents()
    ]).pipe(
      map(([date, events]) => {
        return this.calendarService.generateMonthCalendar(date, events);
      })
    );
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  onViewChange(view: CalendarView): void {
    this.calendarService.setCurrentView(view);
  }
  
  onNavigatePrevious(): void {
    this.calendarService.navigatePrevious();
  }
  
  onNavigateNext(): void {
    this.calendarService.navigateNext();
  }
  
  onNavigateToday(): void {
    this.calendarService.navigateToToday();
  }
  
  onEventDrop(event: CdkDragDrop<CalendarEvent[]>, targetDate: Date): void {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      const draggedEvent = event.previousContainer.data[event.previousIndex];
      
      // Move the event to the new date
      this.calendarService.moveEvent(draggedEvent.id, targetDate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            transferArrayItem(
              event.previousContainer.data,
              event.container.data,
              event.previousIndex,
              event.currentIndex
            );
          },
          error: (error) => {
            console.error('Failed to move event:', error);
          }
        });
    }
  }
  
  trackByWeek(index: number, week: CalendarWeek): number {
    return week.weekNumber;
  }
  
  trackByDay(index: number, day: CalendarDay): string {
    return day.date.toISOString();
  }
  
  trackByEvent(index: number, event: CalendarEvent): string {
    return event.id;
  }

  openNewPost(): void {
    this.postDrawer.openDrawer('create');
  }
}
