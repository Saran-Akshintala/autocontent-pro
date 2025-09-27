import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts; trackBy: trackByToastId"
        class="toast"
        [class]="getToastClass(toast.type)"
        [@slideIn]
      >
        <div class="toast-icon">{{ getToastIcon(toast.type) }}</div>
        <div class="toast-content">
          <div class="toast-title">{{ toast.title }}</div>
          <div class="toast-message" *ngIf="toast.message">{{ toast.message }}</div>
        </div>
        <div class="toast-actions">
          <button 
            *ngIf="toast.action" 
            class="toast-action-btn"
            (click)="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>
          <button class="toast-close-btn" (click)="closeToast(toast.id)">×</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(10px);
      border-left: 4px solid;
      min-width: 320px;
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .toast-success {
      background: rgba(39, 174, 96, 0.95);
      border-left-color: #27ae60;
      color: white;
    }

    .toast-error {
      background: rgba(231, 76, 60, 0.95);
      border-left-color: #e74c3c;
      color: white;
    }

    .toast-warning {
      background: rgba(243, 156, 18, 0.95);
      border-left-color: #f39c12;
      color: white;
    }

    .toast-info {
      background: rgba(52, 152, 219, 0.95);
      border-left-color: #3498db;
      color: white;
    }

    .toast-icon {
      font-size: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .toast-content {
      flex: 1;
      min-width: 0;
    }

    .toast-title {
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .toast-message {
      font-size: 13px;
      opacity: 0.9;
      line-height: 1.4;
    }

    .toast-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    .toast-action-btn {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .toast-action-btn:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .toast-close-btn {
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: background 0.2s ease;
    }

    .toast-close-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 480px) {
      .toast-container {
        left: 20px;
        right: 20px;
        max-width: none;
      }

      .toast {
        min-width: 0;
      }
    }
  `]
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private destroy$ = new Subject<void>();

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.toastService.toasts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(toasts => {
        this.toasts = toasts;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackByToastId(index: number, toast: Toast): string {
    return toast.id;
  }

  getToastClass(type: string): string {
    return `toast-${type}`;
  }

  getToastIcon(type: string): string {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  }

  handleAction(toast: Toast): void {
    if (toast.action) {
      toast.action.handler();
      this.closeToast(toast.id);
    }
  }

  closeToast(id: string): void {
    this.toastService.remove(id);
  }
}
