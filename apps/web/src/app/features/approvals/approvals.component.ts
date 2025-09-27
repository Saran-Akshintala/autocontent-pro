import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, takeUntil } from 'rxjs';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';
import { ToastService } from '../../core/services/toast.service';
import { PostDrawerService } from '../posts/services/post-drawer.service';

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
    brandKit?: {
      logoUrl?: string;
      colors?: string[];
      fonts?: string[];
    };
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
        <div>
          <h2>✅ Approvals Board</h2>
          <p>Review and manage content workflow</p>
        </div>
        <div class="header-actions">
          <button class="view-toggle" [class.active]="viewMode === 'board'" (click)="viewMode = 'board'">📋 Board</button>
          <button class="view-toggle" [class.active]="viewMode === 'list'" (click)="viewMode = 'list'">📝 List</button>
        </div>
      </div>

      <div class="approval-stats">
        <div class="stat-card">
          <div class="stat-number">{{ getPostsByStatus('PENDING_APPROVAL').length }}</div>
          <div class="stat-label">Pending Approval</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getPostsByStatus('SCHEDULED').length }}</div>
          <div class="stat-label">Approved & Scheduled</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getPostsByStatus('DRAFT').length }}</div>
          <div class="stat-label">Needs Revision</div>
        </div>
        <div class="stat-card">
          <div class="stat-number">{{ getPostsByStatus('PUBLISHED').length }}</div>
          <div class="stat-label">Published</div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading approvals...</p>
      </div>

      <!-- Kanban Board View -->
      <div class="kanban-board" *ngIf="!loading && viewMode === 'board'">
        <div class="kanban-lane" *ngFor="let lane of kanbanLanes">
          <div class="lane-header">
            <h3>{{ lane.title }}</h3>
            <span class="lane-count">{{ getPostsByStatus(lane.status).length }}</span>
          </div>
          <div class="lane-content">
            <div class="post-card" 
                 *ngFor="let post of getPostsByStatus(lane.status); trackBy: trackByPostId"
                 (click)="openPostEditor(post)">
              <div class="post-header">
                <div class="post-title">{{ post.title }}</div>
                <div class="post-brand">{{ post.brand.name }}</div>
              </div>
              <div class="post-platforms">
                <span *ngFor="let platform of post.content.platforms" class="platform-icon">
                  {{ getPlatformIcon(platform) }}
                </span>
              </div>
              <div class="post-content-preview">
                <p>{{ post.content.hook || post.content.body | slice:0:80 }}...</p>
              </div>
              <div class="post-meta">
                <span class="post-time">{{ getTimeAgo(post.createdAt) }}</span>
                <div class="post-actions" (click)="$event.stopPropagation()">
                  <button class="action-btn approve" 
                          *ngIf="lane.status === 'PENDING_APPROVAL'"
                          (click)="approvePost(post)"
                          [disabled]="processingPost === post.id"
                          title="Approve">
                    ✅
                  </button>
                  <button class="action-btn change" 
                          *ngIf="lane.status === 'PENDING_APPROVAL'"
                          (click)="requestChange(post)"
                          [disabled]="processingPost === post.id"
                          title="Request Changes">
                    📝
                  </button>
                  <button class="action-btn reject" 
                          *ngIf="lane.status === 'PENDING_APPROVAL'"
                          (click)="rejectPost(post)"
                          [disabled]="processingPost === post.id"
                          title="Reject">
                    ❌
                  </button>
                  <button class="action-btn preview" 
                          (click)="previewPost(post)"
                          title="Preview">
                    👁️
                  </button>
                </div>
              </div>
            </div>
            <div class="empty-lane" *ngIf="getPostsByStatus(lane.status).length === 0">
              <p>{{ lane.emptyMessage }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- List View -->
      <div class="approval-queue" *ngIf="!loading && viewMode === 'list' && posts.length > 0">
        <div class="approval-item" *ngFor="let post of posts; trackBy: trackByPostId">
          <div class="approval-content">
            <div class="approval-header">
              <h4 (click)="openPostEditor(post)" class="clickable-title">{{ post.title }}</h4>
              <div class="approval-meta">
                <span class="platform" *ngFor="let platform of post.content.platforms; let first = first">
                  <span *ngIf="!first"> • </span>{{ getPlatformIcon(platform) }} {{ platform }}
                </span>
                <span class="submitted-by">Brand: {{ post.brand.name }}</span>
                <span class="submitted-time">{{ getTimeAgo(post.createdAt) }}</span>
                <span class="post-status" [class]="getStatusClass(post.status)">{{ post.status }}</span>
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
              <button class="btn btn-outline" (click)="openPostEditor(post)">
                ✏️ Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="empty-state" *ngIf="!loading && posts.length === 0">
        <p>No posts found. All caught up! 🎉</p>
      </div>
    </div>
  `,
  styles: [`
    .approvals-page {
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .header-actions {
      display: flex;
      gap: 8px;
    }

    .view-toggle {
      padding: 8px 16px;
      border: 1px solid #dee2e6;
      background: #fff;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .view-toggle:hover {
      background: #f8f9fa;
    }

    .view-toggle.active {
      background: #3498db;
      color: #fff;
      border-color: #3498db;
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

    /* Kanban Board Styles */
    .kanban-board {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }

    .kanban-lane {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px;
      min-height: 400px;
    }

    .lane-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #dee2e6;
    }

    .lane-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .lane-count {
      background: #3498db;
      color: white;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .lane-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .post-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: all 0.2s ease;
      border-left: 4px solid #3498db;
    }

    .post-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
    }

    .post-header {
      margin-bottom: 12px;
    }

    .post-title {
      font-weight: 600;
      font-size: 14px;
      color: #2c3e50;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .post-brand {
      font-size: 12px;
      color: #6c757d;
    }

    .post-platforms {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
    }

    .platform-icon {
      font-size: 16px;
    }

    .post-content-preview {
      margin-bottom: 12px;
    }

    .post-content-preview p {
      margin: 0;
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }

    .post-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .post-time {
      font-size: 11px;
      color: #6c757d;
    }

    .post-actions {
      display: flex;
      gap: 4px;
    }

    .action-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: rgba(0, 0, 0, 0.1);
    }

    .action-btn.approve:hover {
      background: rgba(39, 174, 96, 0.2);
    }

    .action-btn.change:hover {
      background: rgba(243, 156, 18, 0.2);
    }

    .action-btn.reject:hover {
      background: rgba(231, 76, 60, 0.2);
    }

    .action-btn.preview:hover {
      background: rgba(52, 152, 219, 0.2);
    }

    .empty-lane {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
      font-style: italic;
    }

    .empty-lane p {
      margin: 0;
      font-size: 14px;
    }

    /* List View Styles */
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
      transition: all 0.2s ease;
    }

    .approval-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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

    .clickable-title {
      cursor: pointer;
      transition: color 0.2s ease;
    }

    .clickable-title:hover {
      color: #3498db;
    }

    .approval-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 14px;
      color: #6c757d;
      align-items: center;
    }

    .platform {
      font-weight: 500;
    }

    .post-status {
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending_approval {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-scheduled {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-draft {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-published {
      background: #e8f5e8;
      color: #2e7d32;
    }

    .status-failed {
      background: #ffebee;
      color: #c62828;
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
      .approvals-page {
        max-width: 100%;
        padding: 0 16px;
      }

      .page-header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .approval-stats {
        grid-template-columns: repeat(2, 1fr);
      }

      .kanban-board {
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

    @media (max-width: 480px) {
      .approval-stats {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ApprovalsComponent implements OnInit, OnDestroy {
  posts: ApprovalPost[] = [];
  loading = true;
  processingPost: string | null = null;
  viewMode: 'board' | 'list' = 'board';
  
  kanbanLanes = [
    {
      title: 'Pending Approval',
      status: 'PENDING_APPROVAL',
      emptyMessage: 'No posts pending approval'
    },
    {
      title: 'Approved & Scheduled',
      status: 'SCHEDULED',
      emptyMessage: 'No approved posts scheduled'
    },
    {
      title: 'Needs Revision',
      status: 'DRAFT',
      emptyMessage: 'No posts need revision'
    },
    {
      title: 'Published',
      status: 'PUBLISHED',
      emptyMessage: 'No posts published yet'
    }
  ];
  
  private destroy$ = new Subject<void>();
  private readonly env = inject<Environment>(ENVIRONMENT);
  private readonly toastService = inject(ToastService);
  private readonly postDrawerService = inject(PostDrawerService);

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
    // Load all posts for the board view, not just pending approvals
    this.http.get<any>(`${this.env.apiBaseUrl}/posts`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.posts = response.posts || [];
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load posts:', error);
          this.toastService.error('Loading Error', 'Failed to load posts. Please try again.');
          this.loading = false;
        }
      });
  }

  approvePost(post: ApprovalPost): void {
    this.processingPost = post.id;
    
    // Optimistic update
    const originalStatus = post.status;
    post.status = 'SCHEDULED';
    
    this.http.post(`${this.env.apiBaseUrl}/approvals/approve`, {
      postId: post.id,
      brandId: post.brand.id
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.toastService.success('Post Approved', `"${post.title}" has been approved and scheduled.`);
          this.loadPendingApprovals(); // Reload to get accurate data
        },
        error: (error) => {
          console.error('Failed to approve post:', error);
          // Revert optimistic update
          post.status = originalStatus;
          this.processingPost = null;
          this.toastService.error('Approval Failed', 'Failed to approve post. Please try again.');
        }
      });
  }

  rejectPost(post: ApprovalPost): void {
    const feedback = prompt('Reason for rejection (optional):');
    if (feedback === null) return; // User cancelled

    this.processingPost = post.id;
    
    // Optimistic update
    const originalStatus = post.status;
    post.status = 'DRAFT';
    
    this.http.post(`${this.env.apiBaseUrl}/approvals/reject/${post.id}`, { 
      feedback,
      brandId: post.brand.id
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.toastService.success('Post Rejected', `"${post.title}" has been rejected and moved to drafts.`);
          this.loadPendingApprovals(); // Reload to get accurate data
        },
        error: (error) => {
          console.error('Failed to reject post:', error);
          // Revert optimistic update
          post.status = originalStatus;
          this.processingPost = null;
          this.toastService.error('Rejection Failed', 'Failed to reject post. Please try again.');
        }
      });
  }

  requestChange(post: ApprovalPost): void {
    const feedback = prompt('What changes are needed?');
    if (!feedback) return; // User cancelled or empty

    this.processingPost = post.id;
    
    // Optimistic update
    const originalStatus = post.status;
    post.status = 'DRAFT';
    
    this.http.post(`${this.env.apiBaseUrl}/approvals/request-change`, { 
      postId: post.id,
      brandId: post.brand.id,
      feedback 
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.processingPost = null;
          this.toastService.success('Changes Requested', `Change request sent for "${post.title}".`);
          this.loadPendingApprovals(); // Reload to get accurate data
        },
        error: (error) => {
          console.error('Failed to request change:', error);
          // Revert optimistic update
          post.status = originalStatus;
          this.processingPost = null;
          this.toastService.error('Request Failed', 'Failed to request changes. Please try again.');
        }
      });
  }

  previewPost(post: ApprovalPost): void {
    this.http.get(`${this.env.apiBaseUrl}/approvals/preview/${post.id}`)
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
  
  // New methods for board functionality
  getPostsByStatus(status: string): ApprovalPost[] {
    return this.posts.filter(post => post.status === status);
  }
  
  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }
  
  openPostEditor(post: ApprovalPost): void {
    // Open the post in the drawer editor for editing
    this.postDrawerService.openDrawer('edit', post as any);
  }
}
