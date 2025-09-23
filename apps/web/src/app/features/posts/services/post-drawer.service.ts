import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { ENVIRONMENT } from '../../../core/tokens/environment.token';
import { inject } from '@angular/core';

export interface PostContent {
  hook: string;
  body: string;
  hashtags: string[];
  platforms: string[];
}

export interface CreatePostRequest {
  brandId: string;
  title: string;
  content: PostContent;
}

export interface UpdatePostRequest {
  title?: string;
  content?: Partial<PostContent>;
  status?: 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PAUSED';
}

export interface ScheduleRequest {
  runAt: string; // ISO date string
  timezone: string;
}

export interface Post {
  id: string;
  tenantId: string;
  brandId: string;
  title: string;
  content: PostContent;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED' | 'PAUSED';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  brand?: {
    id: string;
    name: string;
    brandKit?: {
      logoUrl?: string;
    };
  };
  schedule?: {
    id: string;
    postId: string;
    runAt: string;
    timezone: string;
    status: string;
  };
}

export interface Brand {
  id: string;
  name: string;
  timezone: string;
}

@Injectable({
  providedIn: 'root',
})
export class PostDrawerService {
  private isOpen$ = new BehaviorSubject<boolean>(false);
  private currentPost$ = new BehaviorSubject<Post | null>(null);
  private editMode$ = new BehaviorSubject<'create' | 'edit'>('create');

  private readonly env = inject(ENVIRONMENT);
  constructor(private http: HttpClient) {}

  // Drawer State Management
  getIsOpen(): Observable<boolean> {
    return this.isOpen$.asObservable();
  }

  getCurrentPost(): Observable<Post | null> {
    return this.currentPost$.asObservable();
  }

  getEditMode(): Observable<'create' | 'edit'> {
    return this.editMode$.asObservable();
  }

  openDrawer(mode: 'create' | 'edit', post?: Post): void {
    this.editMode$.next(mode);
    this.currentPost$.next(post || null);
    this.isOpen$.next(true);
  }

  closeDrawer(): void {
    this.isOpen$.next(false);
    this.currentPost$.next(null);
    this.editMode$.next('create');
  }

  // API Operations
  createPost(postData: CreatePostRequest): Observable<Post> {
    return this.http.post<Post>(`${this.env.apiBaseUrl}/posts`, postData);
  }

  updatePost(postId: string, postData: UpdatePostRequest): Observable<Post> {
    return this.http.patch<Post>(
      `${this.env.apiBaseUrl}/posts/${postId}`,
      postData
    );
  }

  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/posts/${postId}`);
  }

  schedulePost(postId: string, scheduleData: ScheduleRequest): Observable<any> {
    return this.http.post(`${this.env.apiBaseUrl}/schedules`, {
      postId,
      ...scheduleData,
    });
  }

  updateSchedule(
    postId: string,
    scheduleData: ScheduleRequest
  ): Observable<any> {
    // Deprecated: This mistakenly uses postId as schedule id. Prefer updateScheduleById or upsertSchedule.
    return this.http.patch(
      `${this.env.apiBaseUrl}/schedules/${postId}`,
      scheduleData
    );
  }

  removeSchedule(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.env.apiBaseUrl}/schedules/${postId}`);
  }

  // Upsert schedule for a post: create if not exists, otherwise update by schedule id
  upsertSchedule(
    postId: string,
    scheduleData: ScheduleRequest
  ): Observable<any> {
    return this.http
      .get<any>(`${this.env.apiBaseUrl}/schedules/post/${postId}`)
      .pipe(
        switchMap((existing: any) => {
          if (existing && existing.id) {
            return this.http.patch(
              `${this.env.apiBaseUrl}/schedules/${existing.id}`,
              scheduleData
            );
          }
          return this.http.post(`${this.env.apiBaseUrl}/schedules`, {
            postId,
            ...scheduleData,
          });
        }),
        // Handle the case where no schedule exists (404 error)
        catchError(error => {
          if (error.status === 404 || error.status === 204) {
            // No existing schedule found, create a new one
            return this.http.post(`${this.env.apiBaseUrl}/schedules`, {
              postId,
              ...scheduleData,
            });
          }
          // Re-throw other errors
          throw error;
        })
      );
  }

  // Convenience to open create drawer from anywhere
  openCreate(): void {
    this.openDrawer('create');
  }

  // Utility Methods
  getBrands(): Observable<Brand[]> {
    return this.http
      .get<{ brands: Brand[] }>(`${this.env.apiBaseUrl}/brands`)
      .pipe(map(response => response.brands));
  }

  validateContent(content: PostContent): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!content.hook?.trim()) {
      errors.push('Hook is required');
    }

    if (!content.body?.trim()) {
      errors.push('Body content is required');
    }

    if (!content.platforms?.length) {
      errors.push('At least one platform must be selected');
    }

    if (content.hook && content.hook.length > 150) {
      errors.push('Hook must be 150 characters or less');
    }

    if (content.body && content.body.length > 2200) {
      errors.push('Body content must be 2200 characters or less');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  generateHashtags(content: string): string[] {
    // Simple hashtag generation based on keywords
    const keywords = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const commonWords = [
      'this',
      'that',
      'with',
      'have',
      'will',
      'from',
      'they',
      'know',
      'want',
      'been',
      'good',
      'much',
      'some',
      'time',
      'very',
      'when',
      'come',
      'here',
      'just',
      'like',
      'long',
      'make',
      'many',
      'over',
      'such',
      'take',
      'than',
      'them',
      'well',
      'were',
    ];

    const filteredKeywords = keywords
      .filter(word => !commonWords.includes(word))
      .filter((word, index, arr) => arr.indexOf(word) === index) // Remove duplicates
      .slice(0, 5) // Limit to 5 hashtags
      .map(word => `#${word}`);

    return filteredKeywords;
  }

  getCharacterCount(text: string): {
    count: number;
    remaining: number;
    maxLength: number;
  } {
    const maxLength = 2200;
    const count = text?.length || 0;
    return {
      count,
      remaining: Math.max(0, maxLength - count),
      maxLength,
    };
  }

  getPlatformLimits(platform: string): { maxLength: number; name: string } {
    const limits: Record<string, { maxLength: number; name: string }> = {
      TWITTER: { maxLength: 280, name: 'Twitter' },
      INSTAGRAM: { maxLength: 2200, name: 'Instagram' },
      FACEBOOK: { maxLength: 63206, name: 'Facebook' },
      LINKEDIN: { maxLength: 3000, name: 'LinkedIn' },
      TIKTOK: { maxLength: 2200, name: 'TikTok' },
    };

    return limits[platform] || { maxLength: 2200, name: platform };
  }

  formatScheduleDate(date: Date, timezone: string): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    }).format(date);
  }
}
