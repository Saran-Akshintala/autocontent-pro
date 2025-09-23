import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';

// Local types
interface ApprovalPost {
  id: string;
  title: string;
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    platforms: string[];
  };
  status: string;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  schedule?: {
    runAt: string;
    timezone: string;
    status: string;
  };
}

interface ApprovalsResponse {
  posts: ApprovalPost[];
  total: number;
}

@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="approvals-page">
      <div class="page-header">
        <h2>✅ Approvals</h2>
        <p>Review and approve content before publishing</p>
      </div>

      <div class="approval-stats">
        <div class="stat-card">
          <div class="stat-number">{{ posts.length }}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Approved Today</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">0</div>
          <div class="stat-label">Needs Revision</div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading pending approvals...</p>
      </div>

      <div class="empty-state" *ngIf="!loading && posts.length === 0">
        <p>No posts pending approval. All caught up! 🎉</p>
      </div>

      <div class="approval-queue" *ngIf="!loading && posts.length > 0">
        <div class="approval-item" *ngFor="let post of posts; trackBy: trackByPostId">
          <div class="approval-content">
            <div class="approval-header">
              <h4>{{ post.title }}</h4>
              <div class="approval-meta">
                <span class="platform" *ngFor="let platform of post.content.platforms; let first = first">
                  <span *ngIf="!first"> • </span>{{ getPlatformIcon(platform) }} {{ platform }}
                </span>
                <span class="submitted-by">Brand: {{ post.brand.name }}</span>
                <span class="submitted-time">{{ getTimeAgo(post.createdAt) }}</span>
              </div>
            </div>
            <div class="approval-preview">
              <p><strong>Hook:</strong> {{ post.content.hook }}</p>
              <p><strong>Body:</strong> {{ post.content.body }}</p>
              <div class="hashtags" *ngIf="post.content.hashtags.length > 0">
                <span class="hashtag" *ngFor="let hashtag of post.content.hashtags">#{{ hashtag }}</span>
              </div>
            </div>
            <div class="approval-actions">
              <button class="btn btn-success" (click)="approvePost(post)" [disabled]="processingPost === post.id">
                ✅ Approve
              </button>
              <button class="btn btn-warning" (click)="requestChange(post)" [disabled]="processingPost === post.id">
                📝 Request Changes
              </button>
              <button class="btn btn-danger" (click)="rejectPost(post)" [disabled]="processingPost === post.id">
                ❌ Reject
              </button>
              <button class="btn btn-outline" (click)="previewPost(post)">
                👁️ Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .approvals-page {
      max-width: 1000px;
      margin: 0 auto;
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

    .approval-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      text-align: center;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 700;
      color: #3498db;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      color: #6c757d;
      font-weight: 500;
    }

    .approval-queue {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .approval-item {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .approval-content {
      padding: 24px;
    }

    .approval-header {
      margin-bottom: 16px;
    }

    .approval-header h4 {
      margin: 0 0 12px 0;
      font-size: 20px;
      font-weight: 600;
      color: #2c3e50;
    }

    .approval-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #6c757d;
    }

    .platform {
      font-weight: 500;
    }

    .approval-preview {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }

    .approval-preview p {
      margin: 0;
      font-size: 15px;
      line-height: 1.5;
      color: #495057;
    }

    .approval-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .btn-success {
      background: #27ae60;
      color: white;
    }

    .btn-success:hover {
      background: #229954;
    }

    .btn-warning {
      background: #f39c12;
      color: white;
    }

    .btn-warning:hover {
      background: #e67e22;
    }

    .btn-danger {
      background: #e74c3c;
      color: white;
    }

    .btn-danger:hover {
      background: #c0392b;
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

    .hashtags {
      margin-top: 12px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .hashtag {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .approval-stats {
        grid-template-columns: 1fr;
      }

      .approval-meta {
        flex-direction: column;
        gap: 8px;
      }

      .approval-actions {
        flex-direction: column;
      }

      .btn {
        justify-content: center;
      }
    }
  `]
})
export class ApprovalsComponent implements OnInit, OnDestroy {
  posts: ApprovalPost[] = [];
  loading = true;
  processingPost: string | null = null;
  private destroy$ = new Subject<void>();
  private readonly env = inject<Environment>(ENVIRONMENT);

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadPendingApprovals();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPendingApprovals(): void {
    this.loading = true;
    this.http.get<ApprovalsResponse>(`${this.env.apiBaseUrl}/approvals`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.posts = response.posts;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load pending approvals:', error);
          this.loading = false;
        }
      });
  }

  approvePost(post: ApprovalPost): void {
    this.processingPost = post.id;
    this.http.post(`${this.env.apiBaseUrl}/approvals/${post.id}/approve`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.loadPendingApprovals(); // Reload list
          alert(`Post "${post.title}" approved successfully!`);
        },
        error: (error) => {
          console.error('Failed to approve post:', error);
          this.processingPost = null;
          alert('Failed to approve post. Please try again.');
        }
      });
  }

  rejectPost(post: ApprovalPost): void {
    const feedback = prompt('Reason for rejection (optional):');
    if (feedback === null) return; // User cancelled

    this.processingPost = post.id;
    this.http.post(`${this.env.apiBaseUrl}/approvals/${post.id}/reject`, { feedback })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.loadPendingApprovals(); // Reload list
          alert(`Post "${post.title}" rejected successfully!`);
        },
        error: (error) => {
          console.error('Failed to reject post:', error);
          this.processingPost = null;
          alert('Failed to reject post. Please try again.');
        }
      });
  }

  requestChange(post: ApprovalPost): void {
    const feedback = prompt('What changes are needed?');
    if (!feedback) return; // User cancelled or empty

    this.processingPost = post.id;
    this.http.post(`${this.env.apiBaseUrl}/approvals/${post.id}/request-change`, { feedback })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.loadPendingApprovals(); // Reload list
          alert(`Change request sent for "${post.title}"!`);
        },
        error: (error) => {
          console.error('Failed to request change:', error);
          this.processingPost = null;
          alert('Failed to request change. Please try again.');
        }
      });
  }

  previewPost(post: ApprovalPost): void {
    this.http.get(`${this.env.apiBaseUrl}/approvals/${post.id}/preview`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (preview: any) => {
          const platforms = preview.content.platforms.join(', ');
          const hashtags = preview.content.hashtags.map((h: string) => '#' + h).join(' ');
          const when = preview.schedule ? this.formatDate(preview.schedule.runAt) : 'Not scheduled';
          
          alert(
            `📝 POST PREVIEW\n\n` +
            `Title: ${preview.title}\n` +
            `Brand: ${preview.brand.name}\n` +
            `Platforms: ${platforms}\n` +
            `When: ${when}\n\n` +
            `Hook:\n${preview.content.hook}\n\n` +
            `Body:\n${preview.content.body}\n\n` +
            `Hashtags: ${hashtags}`
          );
        },
        error: (error) => {
          console.error('Failed to load preview:', error);
          alert('Failed to load preview. Please try again.');
        }
      });
  }

  trackByPostId(index: number, post: ApprovalPost): string {
    return post.id;
  }

  getPlatformIcon(platform: string): string {
    switch (platform?.toLowerCase()) {
      case 'instagram': return '📷';
      case 'linkedin': return '💼';
      case 'twitter': return '🐦';
      case 'facebook': return '📘';
      case 'tiktok': return '🎵';
      default: return '📱';
    }
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }
}
