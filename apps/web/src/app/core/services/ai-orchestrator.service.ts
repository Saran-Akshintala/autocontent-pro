import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';

export interface GenerateContentPayload {
  brandId: string;
  niche: string;
  persona: string;
  tone: string;
  ctaGoals: string[];
  platforms: string[];
  startDate: string;
}

export interface GenerateVariantsPayload {
  tone: string;
  variantCount: number;
}

export interface PostSummary {
  id: string;
  title: string;
  status: string;
  brandId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PostsListResponse {
  posts: PostSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface PostListFilters {
  brandId?: string;
  status?: string;
  search?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class AiOrchestratorService {
  private readonly http = inject(HttpClient);
  private readonly env = inject<Environment>(ENVIRONMENT);

  testConnection(): Observable<unknown> {
    return this.http.get(`${this.env.apiBaseUrl}/content/ai/test-connection`);
  }

  generateMonthlyPlan(payload: GenerateContentPayload): Observable<unknown> {
    return this.http.post(`${this.env.apiBaseUrl}/content/generate`, payload);
  }

  generateVariants(postId: string, payload: GenerateVariantsPayload): Observable<unknown> {
    return this.http.post(`${this.env.apiBaseUrl}/content/variants/${postId}`, payload);
  }

  listPosts(filters?: PostListFilters): Observable<PostsListResponse> {
    const params: Record<string, string> = {};
    if (filters?.brandId) {
      params['brandId'] = filters.brandId;
    }
    if (filters?.status) {
      params['status'] = filters.status;
    }
    if (filters?.search) {
      params['search'] = filters.search;
    }
    params['limit'] = (filters?.limit ?? 50).toString();

    return this.http.get<PostsListResponse>(`${this.env.apiBaseUrl}/posts`, { params });
  }
}
