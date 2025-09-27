import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    handler: () => void;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastsSubject = new BehaviorSubject<Toast[]>([]);
  public toasts$ = this.toastsSubject.asObservable();

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  show(toast: Omit<Toast, 'id'>): string {
    const id = this.generateId();
    const newToast: Toast = {
      id,
      duration: 5000,
      ...toast
    };

    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next([...currentToasts, newToast]);

    // Auto-remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        this.remove(id);
      }, newToast.duration);
    }

    return id;
  }

  success(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'error', title, message, duration: duration || 8000 });
  }

  warning(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message?: string, duration?: number): string {
    return this.show({ type: 'info', title, message, duration });
  }

  remove(id: string): void {
    const currentToasts = this.toastsSubject.value;
    this.toastsSubject.next(currentToasts.filter(toast => toast.id !== id));
  }

  clear(): void {
    this.toastsSubject.next([]);
  }
}
