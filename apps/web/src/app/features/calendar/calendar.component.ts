import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { CalendarService } from './services/calendar.service';
import { PostDrawerService } from '../posts/services/post-drawer.service';
import { PostDrawerComponent } from '../posts/components/post-drawer/post-drawer.component';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';
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
  imports: [CommonModule, DragDropModule, PostDrawerComponent],
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

          <div class="calendar-body" cdkDropListGroup>
            <div class="calendar-week" *ngFor="let week of calendar.weeks; trackBy: trackByWeek">
              <div 
                class="calendar-day"
                *ngFor="let day of week.days; trackBy: trackByDay"
                [class.other-month]="!day.isCurrentMonth"
                [class.today]="day.isToday"
                [class.weekend]="day.isWeekend"
                cdkDropList
                [cdkDropListData]="day.events"
                (cdkDropListDropped)="onEventDrop($event, day.date)"
                (click)="onEmptyDayClick(day.date, $event)"
                [id]="'day-' + day.date.getTime()">
                
                <span class="day-number">{{ day.date.getDate() }}</span>
                
                <div class="events-container">
                  <div 
                    class="event-item"
                    *ngFor="let event of day.events; trackBy: trackByEvent"
                    [style.background-color]="event.color"
                    [style.color]="event.textColor"
                    cdkDrag
                    [cdkDragData]="event"
                    [title]="event.title"
                    (click)="onEventClick(event)"
                    (dblclick)="onEventDoubleClick(event)">
                    
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

      <!-- Week View -->
      <div class="calendar-container" *ngIf="(currentView$ | async) === 'week'">
        <div class="week-view" *ngIf="calendarWeek$ | async as week">
          <div class="week-header">
            <div class="time-column"></div>
            <div class="day-column" *ngFor="let day of week.days; trackBy: trackByDay">
              <div class="day-label">{{ day.date | date:'EEE' }}</div>
              <div class="day-number" [class.today]="day.isToday">{{ day.date.getDate() }}</div>
            </div>
          </div>
          
          <div class="week-body">
            <div class="time-slots">
              <div class="time-slot" *ngFor="let hour of getHours()">
                <span class="time-label">{{ hour }}:00</span>
              </div>
            </div>
            
            <div class="week-days" cdkDropListGroup>
              <div 
                class="week-day-column"
                *ngFor="let day of week.days; trackBy: trackByDay">
                
                <!-- Time slots for each hour -->
                <div 
                  class="week-time-slot"
                  *ngFor="let hour of getHours(); trackBy: trackByHour"
                  [attr.data-hour]="hour"
                  [attr.data-date]="day.date.toISOString()"
                  cdkDropList
                  [cdkDropListData]="getEventsForHour(day.events, hour)"
                  (cdkDropListDropped)="onTimeSlotDrop($event, day.date, hour)"
                  (click)="onEmptyTimeSlotClick(day.date, hour, $event)"
                  [id]="'week-slot-' + day.date.getTime() + '-' + hour">
                  
                  <!-- Events positioned within this time slot -->
                  <div 
                    class="week-event"
                    *ngFor="let event of getEventsForHour(day.events, hour); trackBy: trackByEvent"
                    [style.background-color]="event.color"
                    [style.color]="event.textColor"
                    cdkDrag
                    [cdkDragData]="event"
                    [title]="event.title"
                    (click)="onEventClick(event)"
                    (dblclick)="onEventDoubleClick(event)">
                    
                    <div class="week-event-content">
                      <div class="event-title">{{ event.title }}</div>
                      <div class="event-time">{{ event.start | date:'shortTime' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Day View -->
      <div class="calendar-container" *ngIf="(currentView$ | async) === 'day'">
        <div class="day-view" *ngIf="calendarDay$ | async as day">
          <div class="day-header">
            <h3>{{ day.date | date:'fullDate' }}</h3>
            <p>{{ day.events.length }} event(s) scheduled</p>
          </div>
          
          <div class="day-body">
            <div class="time-slots">
              <div class="time-slot" *ngFor="let hour of getHours()">
                <span class="time-label">{{ hour }}:00</span>
              </div>
            </div>
            
            <div class="day-events-container" cdkDropListGroup>
              <!-- Time slots for each hour -->
              <div 
                class="day-time-slot"
                *ngFor="let hour of getHours(); trackBy: trackByHour"
                [attr.data-hour]="hour"
                [attr.data-date]="day.date.toISOString()"
                cdkDropList
                [cdkDropListData]="getEventsForHour(day.events, hour)"
                (cdkDropListDropped)="onTimeSlotDrop($event, day.date, hour)"
                (click)="onEmptyTimeSlotClick(day.date, hour, $event)"
                [id]="'day-slot-' + day.date.getTime() + '-' + hour">
                
                <!-- Events positioned within this time slot -->
                <div 
                  class="day-event"
                  *ngFor="let event of getEventsForHour(day.events, hour); trackBy: trackByEvent"
                  [style.background-color]="event.color"
                  [style.color]="event.textColor"
                  cdkDrag
                  [cdkDragData]="event"
                  [title]="event.title"
                  (click)="onEventClick(event)"
                  (dblclick)="onEventDoubleClick(event)">
                  
                  <div class="day-event-content">
                    <div class="event-title">{{ event.title }}</div>
                    <div class="event-time">{{ event.start | date:'shortTime' }} - {{ event.end | date:'shortTime' }}</div>
                    <div class="event-description" *ngIf="event.content && event.content.hook">{{ event.content.hook }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Post Drawer Component -->
    <app-post-drawer></app-post-drawer>
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
      min-width: 1050px;
      width: 100%;
      overflow-x: auto;
    }

    .calendar-week {
      display: grid;
      grid-template-columns: repeat(7, minmax(150px, 1fr));
      width: 100%;
      min-width: 1050px;
    }

    .calendar-day {
      min-height: 140px;
      max-height: 140px;
      min-width: 150px;
      width: 100%;
      border: 1px solid #e9ecef;
      background: white;
      padding: 6px;
      position: relative;
      cursor: pointer;
      transition: background-color 0.2s ease;
      overflow: hidden;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
    }

    .calendar-day.cdk-drop-list-dragging {
      background: #f8f9fa;
    }

    .calendar-day.cdk-drop-list-receiving {
      background: #e3f2fd;
      border-color: #3498db;
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

    .event-item {
      padding: 8px 6px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 3px solid rgba(255, 255, 255, 0.3);
      width: calc(100% - 2px);
      min-width: 120px;
      overflow: visible;
      min-height: 36px;
      height: auto;
      display: block;
      margin-bottom: 1px;
      background-color: #3498db;
      color: white;
      line-height: 1.4;
      word-wrap: break-word;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-sizing: border-box;
    }

    .event-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      opacity: 0.9;
    }

    .day-event {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      margin-bottom: 2px;
      min-height: 30px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      white-space: nowrap;
      overflow: hidden;
      transition: all 0.2s ease;
      background-color: #3498db;
      color: white;
    }

    .day-event:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
      opacity: 0.9;
    }

    .week-event:hover {
      transform: translateY(-1px);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
      opacity: 0.9;
    }

    .event-item.cdk-drag-dragging {
      cursor: grabbing;
      opacity: 0.8;
      transform: rotate(5deg);
      z-index: 1000;
    }

    .cdk-drag-placeholder {
      opacity: 0.3;
      background: #ddd;
    }

    .events-container {
      display: flex;
      flex-direction: column;
      gap: 1px;
      overflow: visible;
      flex: 1;
      margin-top: 4px;
      min-height: 80px;
      width: 100%;
      min-width: 120px;
    }

    .event-content {
      display: block;
      width: 100%;
      min-height: 24px;
      line-height: 1.3;
    }

    .event-title {
      font-weight: 500;
      white-space: normal;
      word-wrap: break-word;
      overflow-wrap: break-word;
      font-size: 11px;
      line-height: 1.3;
      max-width: 100%;
      display: block;
      margin-bottom: 2px;
    }

    .event-time {
      font-size: 9px;
      opacity: 0.9;
      display: block;
      line-height: 1.2;
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

    /* Week View Styles */
    .week-view {
      display: flex;
      flex-direction: column;
      height: 600px;
    }

    .week-header {
      display: grid;
      grid-template-columns: 60px repeat(7, 1fr);
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      padding: 12px 0;
    }

    .time-column {
      border-right: 1px solid #e9ecef;
    }

    .day-column {
      text-align: center;
      padding: 8px;
      border-right: 1px solid #e9ecef;
    }

    .day-column:last-child {
      border-right: none;
    }

    .day-label {
      font-size: 12px;
      color: #6c757d;
      font-weight: 500;
    }

    .day-number {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin-top: 4px;
    }

    .day-number.today {
      background: #3498db;
      color: white;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 4px auto 0;
    }

    .week-body {
      display: grid;
      grid-template-columns: 60px 1fr;
      flex: 1;
      overflow-y: auto;
    }

    .time-slots {
      border-right: 1px solid #e9ecef;
      background: #fafafa;
    }

    .time-slot {
      height: 60px;
      border-bottom: 1px solid #e9ecef;
      display: flex;
      align-items: flex-start;
      padding: 4px 8px;
    }

    .time-label {
      font-size: 11px;
      color: #6c757d;
    }

    .week-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      position: relative;
    }

    .week-day-column {
      border-right: 1px solid #e9ecef;
      position: relative;
      min-height: 1440px; /* 24 hours * 60px */
      display: flex;
      flex-direction: column;
    }

    .week-day-column:last-child {
      border-right: none;
    }

    .week-time-slot {
      height: 60px;
      border-bottom: 1px solid #f0f0f0;
      position: relative;
      min-height: 60px;
      transition: background-color 0.2s ease;
    }

    .week-time-slot:hover {
      background-color: #f8f9fa;
    }

    .week-time-slot.cdk-drop-list-receiving {
      background-color: #e3f2fd;
      border-color: #3498db;
    }

    .day-events {
      position: relative;
      height: 100%;
    }

    .week-event {
      background: #3498db;
      color: white;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 11px;
      cursor: grab;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 1;
      margin: 2px;
      min-height: 24px;
      display: flex;
      align-items: center;
    }

    .week-event:hover {
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .week-event-content {
      overflow: hidden;
    }

    .week-event .event-title {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .week-event .event-time {
      font-size: 9px;
      opacity: 0.9;
      margin-top: 2px;
    }

    /* Day View Styles */
    .day-view {
      display: flex;
      flex-direction: column;
      height: 600px;
    }

    .day-header {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 1px solid #e9ecef;
      text-align: center;
    }

    .day-header h3 {
      margin: 0 0 8px 0;
      color: #2c3e50;
      font-size: 24px;
    }

    .day-header p {
      margin: 0;
      color: #6c757d;
      font-size: 14px;
    }

    .day-body {
      display: grid;
      grid-template-columns: 60px 1fr;
      flex: 1;
      overflow-y: auto;
    }

    .day-events-container {
      position: relative;
      min-height: 1440px; /* 24 hours * 60px */
      background: linear-gradient(to bottom, transparent 59px, #e9ecef 59px, #e9ecef 60px, transparent 60px);
      background-size: 100% 60px;
      display: flex;
      flex-direction: column;
    }

    .day-time-slot {
      height: 60px;
      border-bottom: 1px solid #f0f0f0;
      position: relative;
      min-height: 60px;
      transition: background-color 0.2s ease;
      display: flex;
      align-items: flex-start;
      padding: 4px 8px;
    }

    .day-time-slot:hover {
      background-color: #f8f9fa;
    }

    .day-time-slot.cdk-drop-list-receiving {
      background-color: #e3f2fd;
      border-color: #3498db;
    }

    .day-event {
      background: #3498db;
      color: white;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: grab;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      z-index: 1;
      margin: 4px;
      min-height: 40px;
      flex: 1;
    }

    .day-event:hover {
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .day-event-content {
      overflow: hidden;
    }

    .day-event .event-title {
      font-weight: 600;
      margin-bottom: 4px;
    }

    .day-event .event-time {
      font-size: 11px;
      opacity: 0.9;
      margin-bottom: 4px;
    }

    .day-event .event-description {
      font-size: 11px;
      opacity: 0.8;
      line-height: 1.3;
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

      .week-view, .day-view {
        height: 400px;
      }

      .week-header {
        grid-template-columns: 40px repeat(7, 1fr);
      }

      .day-body, .week-body {
        grid-template-columns: 40px 1fr;
      }

      .time-slot {
        height: 40px;
      }

      .week-day-column, .day-events-container {
        min-height: 960px; /* 24 hours * 40px */
      }
    }
  `]
})
export class CalendarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  currentView$!: Observable<CalendarView>;
  currentDate$!: Observable<Date>;
  calendarMonth$!: Observable<CalendarMonth | null>;
  calendarWeek$!: Observable<CalendarWeek | null>;
  calendarDay$!: Observable<CalendarDay | null>;
  
  private http = inject(HttpClient);
  private env = inject<Environment>(ENVIRONMENT);
  
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

    this.calendarWeek$ = combineLatest([
      this.currentDate$,
      this.calendarService.loadCalendarEvents()
    ]).pipe(
      map(([date, events]) => {
        return this.calendarService.generateWeekCalendar(date, events);
      })
    );

    this.calendarDay$ = combineLatest([
      this.currentDate$,
      this.calendarService.loadCalendarEvents()
    ]).pipe(
      map(([date, events]) => {
        return this.calendarService.generateDayCalendar(date, events);
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
    console.log('🎯 Drop event triggered:', {
      previousContainer: event.previousContainer.id,
      container: event.container.id,
      previousIndex: event.previousIndex,
      currentIndex: event.currentIndex,
      targetDate: targetDate
    });

    if (event.previousContainer === event.container) {
      // Same container - just reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      console.log('📝 Reordered within same container');
    } else {
      // Different containers - move between dates
      const draggedEvent = event.previousContainer.data[event.previousIndex];
      console.log('🚀 Moving event between containers:', {
        eventTitle: draggedEvent.title,
        eventId: draggedEvent.id,
        postId: draggedEvent.postId,
        targetDate: targetDate
      });
      
      // Move the event to the new date
      this.calendarService.moveEvent(draggedEvent.id, targetDate)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Successfully moved event via API');
            
            // Update the event's date in the local data
            draggedEvent.start = targetDate;
            
            // Transfer the item between arrays
            transferArrayItem(
              event.previousContainer.data,
              event.container.data,
              event.previousIndex,
              event.currentIndex
            );
            
            console.log('📅 Updated local data and refreshing calendar');
            // Refresh the calendar data to reflect the changes
            this.refreshCalendar();
          },
          error: (error) => {
            console.error('❌ Failed to move event:', error);
            alert('Failed to reschedule post. Please try again.');
          }
        });
    }
  }

  private refreshCalendar(): void {
    console.log('🔄 Refreshing calendar data...');
    
    // Simply trigger a reload of calendar events
    // The observables will automatically update due to the reactive streams
    this.calendarService.loadCalendarEvents().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (events) => {
        console.log('✅ Calendar events reloaded:', events.length, 'events');
      },
      error: (error) => {
        console.error('❌ Failed to refresh calendar:', error);
      }
    });
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

  trackByHour(index: number, hour: number): number {
    return hour;
  }

  openNewPost(): void {
    this.postDrawer.openDrawer('create');
  }

  onEventClick(event: CalendarEvent): void {
    // Single click - open post for editing
    if (event.postId) {
      this.openPostForEdit(event.postId);
    }
  }

  onEventDoubleClick(event: CalendarEvent): void {
    // Double click - also open post for editing (same as single click)
    if (event.postId) {
      this.openPostForEdit(event.postId);
    }
  }

  private openPostForEdit(postId: string): void {
    // Fetch the complete post data before opening the drawer
    this.http.get<any>(`${this.env.apiBaseUrl}/posts/${postId}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (post) => {
          console.log('📅 Calendar: Opening post for edit:', post);
          // Open the drawer with the complete post data
          this.postDrawer.openDrawer('edit', post);
        },
        error: (error) => {
          console.error('Failed to load post for editing:', error);
          // Don't open the drawer with incomplete data - show error instead
          alert('Failed to load post for editing. Please try again.');
        }
      });
  }

  onEmptyDayClick(date: Date, event: Event): void {
    // Prevent event bubbling from child elements
    if ((event.target as HTMLElement).closest('.event-item')) {
      return;
    }
    
    // Open new post drawer with date pre-filled (default time: 9:00 AM)
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(9, 0, 0, 0);
    
    this.openNewPostWithSchedule(scheduledDateTime);
  }

  onEmptyTimeSlotClick(date: Date, hour: number, event: Event): void {
    // Prevent event bubbling from child elements
    if ((event.target as HTMLElement).closest('.week-event, .day-event')) {
      return;
    }
    
    // Open new post drawer with specific date and time pre-filled
    const scheduledDateTime = new Date(date);
    scheduledDateTime.setHours(hour, 0, 0, 0);
    
    this.openNewPostWithSchedule(scheduledDateTime);
  }

  private openNewPostWithSchedule(scheduledDateTime: Date): void {
    // CRITICAL FIX: Don't pass a post object with an ID to create mode
    // This was potentially causing the post drawer to treat it as an edit operation
    // Instead, just open in create mode and let the drawer handle scheduling separately
    
    console.log('📅 Opening new post with scheduled time:', scheduledDateTime);
    
    // Open the post drawer in create mode without passing a post object
    // The scheduling will need to be handled differently
    this.postDrawer.openDrawer('create');
    
    // TODO: Need to implement a way to pre-fill scheduling in the drawer
    // For now, this prevents the potential ID confusion that might be causing
    // posts to be overwritten
  }

  // Helper methods for Week and Day views
  getHours(): number[] {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  getEventTop(event: CalendarEvent): number {
    if (!event.start) return 0;
    const startTime = new Date(event.start);
    const hours = startTime.getHours();
    const minutes = startTime.getMinutes();
    return (hours * 60 + minutes) * (60 / 60); // 60px per hour, 1px per minute
  }

  getEventHeight(event: CalendarEvent): number {
    if (!event.start || !event.end) return 30; // Default height
    const start = new Date(event.start);
    const end = new Date(event.end);
    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    return Math.max(30, durationMinutes * (60 / 60)); // Minimum 30px height
  }

  // Time-based drag and drop helpers

  getEventsForHour(events: CalendarEvent[], hour: number): CalendarEvent[] {
    return events.filter(event => {
      if (!event.start) return false;
      const eventHour = new Date(event.start).getHours();
      return eventHour === hour;
    });
  }

  onTimeSlotDrop(event: CdkDragDrop<CalendarEvent[]>, targetDate: Date, targetHour: number): void {
    console.log('🕐 Time slot drop:', {
      previousContainer: event.previousContainer.id,
      container: event.container.id,
      targetDate: targetDate,
      targetHour: targetHour
    });

    if (event.previousContainer === event.container) {
      // Same time slot - just reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      console.log('📝 Reordered within same time slot');
    } else {
      // Different time slots - move between times/dates
      const draggedEvent = event.previousContainer.data[event.previousIndex];
      
      // Create new date with the target date and hour
      const newDateTime = new Date(targetDate);
      newDateTime.setHours(targetHour, 0, 0, 0); // Set to the beginning of the hour
      
      console.log('🚀 Moving event to new time:', {
        eventTitle: draggedEvent.title,
        eventId: draggedEvent.id,
        currentTime: draggedEvent.start,
        newDateTime: newDateTime
      });
      
      // Move the event to the new date and time
      this.calendarService.moveEvent(draggedEvent.id, newDateTime)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Successfully moved event to new time via API');
            
            // Update the event's date and time in the local data
            draggedEvent.start = newDateTime;
            draggedEvent.end = new Date(newDateTime.getTime() + (60 * 60 * 1000)); // 1 hour duration
            
            // Transfer the item between arrays
            transferArrayItem(
              event.previousContainer.data,
              event.container.data,
              event.previousIndex,
              event.currentIndex
            );
            
            console.log('📅 Updated local data and refreshing calendar');
            // Refresh the calendar data to reflect the changes
            this.refreshCalendar();
          },
          error: (error) => {
            console.error('❌ Failed to move event to new time:', error);
            alert('Failed to reschedule post. Please try again.');
          }
        });
    }
  }
}
