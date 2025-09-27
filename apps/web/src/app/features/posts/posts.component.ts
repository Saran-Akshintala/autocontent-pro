import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, takeUntil } from 'rxjs';
import { PostDrawerService } from './services/post-drawer.service';
import { PostDrawerComponent } from './components/post-drawer/post-drawer.component';
import { ENVIRONMENT, Environment } from '../../core/tokens/environment.token';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';

// Local types
interface Post {
  id: string;
  tenantId: string;
  title: string;
  brandId: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PAUSED';
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    platforms: string[];
  };
  schedule?: {
    id: string;
    postId: string;
    runAt: string;
    timezone: string;
    status: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  limit: number;
}

@Component({
  selector: 'app-posts',
  standalone: true,
  imports: [CommonModule, FormsModule, PostDrawerComponent],
  template: `
    <div class="posts-page">
      <div class="page-header">
        <div class="header-content">
          <div>
            <h2>📝 Posts</h2>
            <p>Create, edit, and manage your content</p>
          </div>
          <button class="btn btn-primary" (click)="openCreate()">+ Create Post</button>
        </div>
      </div>

      <div class="posts-filters">
        <div class="filter-group">
          <select class="filter-select" [(ngModel)]="selectedStatus" (change)="applyFilters()">
            <option>All Statuses</option>
            <option>DRAFT</option>
            <option>PENDING_APPROVAL</option>
            <option>SCHEDULED</option>
            <option>PUBLISHED</option>
            <option>PAUSED</option>
            <option>FAILED</option>
          </select>
          <select class="filter-select" [(ngModel)]="selectedPlatform" (change)="applyFilters()">
            <option>All Platforms</option>
            <option>INSTAGRAM</option>
            <option>LINKEDIN</option>
            <option>TWITTER</option>
            <option>FACEBOOK</option>
          </select>
          <button class="btn btn-outline clear-filters" (click)="clearFilters()" 
                  *ngIf="selectedStatus !== 'All Statuses' || selectedPlatform !== 'All Platforms' || searchQuery.trim()">
            Clear Filters
          </button>
        </div>
        <div class="search-box">
          <input type="text" placeholder="Search posts..." class="search-input" [(ngModel)]="searchQuery" (input)="applyFilters()">
          <span class="search-icon">🔍</span>
        </div>
      </div>

      <!-- Filter Results Count -->
      <div class="filter-results" *ngIf="!loading && allPosts.length > 0">
        <span class="results-count">
          Showing {{ posts.length }} of {{ allPosts.length }} posts
          <span *ngIf="posts.length !== allPosts.length" class="filtered-indicator">(filtered)</span>
        </span>
      </div>

      <div class="posts-grid" *ngIf="!loading">
        <div class="post-card" *ngFor="let post of posts; trackBy: trackByPostId">
          <div class="post-header">
            <div class="post-status" [class]="getStatusClass(post.status)">{{ post.status || 'Draft' }}</div>
            <div class="post-platform">
              <span *ngFor="let platform of post.content.platforms; let first = first">
                <span *ngIf="!first"> • </span>{{ getPlatformIcon(platform) }} {{ platform }}
              </span>
            </div>
          </div>
          <div class="post-content">
            <h4>{{ post.title }}</h4>
            <p>{{ post.content.hook || post.content.body }}</p>
          </div>
          <div class="post-footer">
            <span class="post-date">{{ getPostDate(post) }}</span>
            <div class="post-actions">
              <button class="btn-icon" (click)="openEdit(post)" title="Edit">✏️</button>
              <button class="btn-icon" (click)="viewPost(post)" title="View">👁️</button>
              <button class="btn-icon" (click)="copyPostLink(post)" title="Copy Link">🔗</button>
              <button 
                *ngIf="canForcePublish(post)" 
                class="btn-icon btn-publish" 
                (click)="forcePublishPost(post)" 
                title="Force Publish Now"
                [disabled]="publishingPosts.has(post.id)">
                {{ publishingPosts.has(post.id) ? '⏳' : '🚀' }}
              </button>
              <button class="btn-icon" (click)="deletePost(post)" title="Delete">🗑️</button>
            </div>
          </div>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading posts...</p>
      </div>

      <div class="empty-state" *ngIf="!loading && posts.length === 0">
        <p>No posts found. Create your first post to get started!</p>
        <button class="btn btn-primary" (click)="openCreate()">+ Create Post</button>
      </div>
    </div>
    
    <!-- Post Drawer Component -->
    <app-post-drawer></app-post-drawer>
  `,
  styles: [`
    .posts-page {
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
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

    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #3498db;
      color: white;
    }

    .btn-icon:hover {
      background: #f8f9fa;
      transform: translateY(-1px);
    }

    .btn-publish {
      background: #28a745 !important;
      color: white !important;
    }

    .btn-publish:hover:not(:disabled) {
      background: #218838 !important;
    }

    .btn-publish:disabled {
      background: #6c757d !important;
      cursor: not-allowed;
      opacity: 0.6;
    }
    .posts-filters {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .filter-group {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .clear-filters {
      padding: 8px 16px;
      font-size: 12px;
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

    .filter-select {
      padding: 8px 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      background: white;
      font-size: 14px;
      color: #495057;
      min-width: 140px;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      right: 12px;
      color: #6c757d;
      pointer-events: none;
      font-size: 16px;
    }

    .search-input {
      padding: 8px 16px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-size: 14px;
      width: 250px;
    }
    .search-input:focus {
      outline: none;
      border-color: #3498db;
      box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
    }

    .filter-results {
      margin-bottom: 16px;
      padding: 8px 0;
    }

    .results-count {
      font-size: 14px;
      color: #6c757d;
    }

    .filtered-indicator {
      color: #3498db;
      font-weight: 500;
    }

    .posts-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .post-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      transition: transform 0.2s ease;
    }

    .post-card:hover {
      transform: translateY(-2px);
    }

    .post-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #f8f9fa;
    }

    .post-status {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
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

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-pending_approval {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-paused {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-failed {
      background: #ffebee;
      color: #c62828;
    }

    .post-platform {
      font-size: 14px;
      color: #6c757d;
    }

    .post-content {
      padding: 20px;
    }

    .post-content h4 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
    }

    .post-content p {
      margin: 0;
      font-size: 14px;
      color: #6c757d;
      line-height: 1.5;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .post-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-top: 1px solid #f8f9fa;
      background: #fafafa;
    }

    .post-date {
      font-size: 12px;
      color: #6c757d;
    }

    .post-actions {
      display: flex;
      gap: 8px;
    }

    .btn-icon {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease;
    }

    .btn-icon:hover {
      background: #e9ecef;
    }

    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .posts-filters {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .filter-group {
        justify-content: center;
      }

      .search-input {
        width: 100%;
      }

      .posts-grid {
        grid-template-columns: 1fr;
      }
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }

    .empty-state .btn {
      margin-top: 16px;
    }
  `]
})
export class PostsComponent implements OnInit, OnDestroy {
  posts: Post[] = [];
  allPosts: Post[] = []; // Store all posts for filtering
  loading = false;
  publishingPosts = new Set<string>();
  userRole: string = '';
  private destroy$ = new Subject<void>();

  // Filter properties
  selectedStatus: string = 'All Statuses';
  selectedPlatform: string = 'All Platforms';
  searchQuery: string = '';

  private env = inject(ENVIRONMENT);

  constructor(
    private postDrawer: PostDrawerService,
    private http: HttpClient,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  private postSavedListener = () => this.loadPosts();

  ngOnInit(): void {
    this.loadPosts();
    this.handleDeepLinking();
    this.loadUserRole();
    
    // Listen for post-saved events to reload
    window.addEventListener('post-saved', this.postSavedListener);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('post-saved', this.postSavedListener);
  }

  // Handle deep linking - check for postId in query params
  handleDeepLinking(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['edit']) {
        const postId = params['edit'];
        this.openPostById(postId);
        // Clean up URL after opening
        this.router.navigate([], { 
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  loadPosts(): void {
    this.loading = true;
    this.http.get<PostsResponse>(`${this.env.apiBaseUrl}/posts`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.allPosts = response.posts; // Store all posts
          this.applyFilters(); // Apply current filters
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load posts:', error);
          this.toastService.error('Loading Error', 'Failed to load posts. Please try again.');
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    let filteredPosts = [...this.allPosts];

    // Filter by status
    if (this.selectedStatus !== 'All Statuses') {
      filteredPosts = filteredPosts.filter(post => 
        (post.status || 'DRAFT').toUpperCase() === this.selectedStatus
      );
    }

    // Filter by platform
    if (this.selectedPlatform !== 'All Platforms') {
      filteredPosts = filteredPosts.filter(post => 
        post.content.platforms.some(platform => 
          platform.toUpperCase() === this.selectedPlatform
        )
      );
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filteredPosts = filteredPosts.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content.hook.toLowerCase().includes(query) ||
        post.content.body.toLowerCase().includes(query) ||
        post.content.hashtags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    this.posts = filteredPosts;
  }

  clearFilters(): void {
    this.selectedStatus = 'All Statuses';
    this.selectedPlatform = 'All Platforms';
    this.searchQuery = '';
    this.applyFilters();
  }

  openCreate(): void {
    this.postDrawer.openDrawer('create');
  }

  openEdit(post: Post): void {
    this.postDrawer.openDrawer('edit', post);
  }

  viewPost(post: Post): void {
    const platforms = (post.content?.platforms || []).join(', ');
    const when = post.schedule ? this.formatDate(post.schedule.runAt) : 'Not scheduled';
    alert(
      `Title: ${post.title}` +
      `\nStatus: ${post.status}` +
      `\nBrand: ${post.brandId}` +
      `\nPlatforms: ${platforms}` +
      `\nWhen: ${when}` +
      `\n\nHook:\n${post.content?.hook || ''}` +
      `\n\nBody:\n${post.content?.body || ''}`
    );
  }

  deletePost(post: Post): void {
    if (!confirm('Delete this post? This action cannot be undone.')) {
      return;
    }
    
    // Optimistic update - remove from UI immediately
    const originalPosts = [...this.posts];
    this.posts = this.posts.filter(p => p.id !== post.id);
    
    this.http.delete<void>(`${this.env.apiBaseUrl}/posts/${post.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toastService.success('Post Deleted', `"${post.title}" has been deleted successfully.`);
        },
        error: (error) => {
          console.error('Failed to delete post:', error);
          // Revert optimistic update
          this.posts = originalPosts;
          this.toastService.error('Delete Failed', 'Failed to delete post. Please try again.');
        }
      });
  }

  trackByPostId(index: number, post: Post): string {
    return post.id;
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'scheduled': return 'status-scheduled';
      case 'draft': return 'status-draft';
      case 'published': return 'status-published';
      case 'pending': return 'status-pending';
      case 'pending_approval': return 'status-pending_approval';
      case 'paused': return 'status-paused';
      case 'failed': return 'status-failed';
      default: return 'status-draft';
    }
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

  getPostDate(post: Post): string {
    if (post.schedule) {
      return this.formatDate(post.schedule.runAt);
    }
    return `Last edited ${this.formatDate(post.updatedAt)}`;
  }
  
  // Deep linking functionality
  openPostById(postId: string): void {
    const post = this.posts.find(p => p.id === postId);
    if (post) {
      this.openEdit(post);
    } else {
      // Post not found in current list, try to fetch it
      this.http.get<Post>(`${this.env.apiBaseUrl}/posts/${postId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (post) => {
            this.openEdit(post);
          },
          error: (error) => {
            console.error('Failed to load post for editing:', error);
            this.toastService.error('Post Not Found', 'The requested post could not be found.');
          }
        });
    }
  }
  
  // Generate deep link for sharing
  copyPostLink(post: Post): void {
    const url = `${window.location.origin}${window.location.pathname}?edit=${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('Link Copied', 'Post edit link copied to clipboard.');
    }).catch(() => {
      this.toastService.error('Copy Failed', 'Failed to copy link to clipboard.');
    });
  }

  loadUserRole(): void {
    // Get user role from localStorage or API
    const authData = localStorage.getItem('auth');
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        this.userRole = auth.user?.role || '';
      } catch (error) {
        console.error('Failed to parse auth data:', error);
      }
    }
  }

  canForcePublish(post: Post): boolean {
    // Only OWNER and ADMIN can force publish
    const canPublish = this.userRole === 'OWNER' || this.userRole === 'ADMIN';
    // Only show for posts that are not already published
    const isPublishable = post.status !== 'PUBLISHED' && post.status !== 'FAILED';
    return canPublish && isPublishable;
  }

  forcePublishPost(post: Post): void {
    if (this.publishingPosts.has(post.id)) {
      return; // Already publishing
    }

    this.publishingPosts.add(post.id);
    
    this.http.post(`${this.env.apiBaseUrl}/publish/dispatch/${post.id}`, {})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.publishingPosts.delete(post.id);
          
          if (response.success) {
            // Update post status optimistically
            const postIndex = this.posts.findIndex(p => p.id === post.id);
            if (postIndex !== -1) {
              this.posts[postIndex].status = 'PUBLISHED';
            }
            
            this.toastService.success(
              'Post Published! 🚀', 
              `Successfully published to ${response.data.successfulPlatforms} platforms`
            );
            
            // Reload posts to get updated data
            this.loadPosts();
          } else {
            this.toastService.error('Publish Failed', response.message || 'Failed to publish post');
          }
        },
        error: (error) => {
          this.publishingPosts.delete(post.id);
          console.error('Failed to publish post:', error);
          this.toastService.error(
            'Publish Failed', 
            error.error?.message || 'Failed to publish post. Please try again.'
          );
        }
      });
  }
}
