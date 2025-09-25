import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BehaviorSubject, Subject, combineLatest, finalize, map, take, takeUntil } from 'rxjs';
import { AiOrchestratorService, GenerateContentPayload, GenerateVariantsPayload, PostsListResponse } from '../../core/services/ai-orchestrator.service';
import { BrandService } from '../../core/services/brand.service';

interface ConnectionResult {
  success: boolean;
  connected?: boolean;
  message?: string;
  timestamp?: string;
  error?: string;
}

interface VariantOption {
  id: string;
  title: string;
  status: string;
  brandId: string;
}

@Component({
  selector: 'app-ai-orchestrator',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h2>🤖 AI Content Orchestrator (Text)</h2>
          <p>Test the provider wrapper + JSON spec via the API</p>
        </div>
        <button class="secondary" type="button" (click)="resetAll()">Reset Forms</button>
      </header>

      <section class="card">
        <div class="card-header">
          <div>
            <h3>AI Provider Health Check</h3>
            <p>Verify connectivity with the configured AI provider.</p>
          </div>
          <button class="primary" type="button" (click)="testConnection()" [disabled]="testingConnection">
            <span *ngIf="!testingConnection">Run Health Check</span>
            <span *ngIf="testingConnection">Testing...</span>
          </button>
        </div>

        <div class="result" *ngIf="connectionResult">
          <h4>Result</h4>
          <pre>{{ connectionResult | json }}</pre>
        </div>
      </section>

      <section class="card">
        <h3>Generate 30-Day Content Plan</h3>
        <p>Submit a prompt to generate an orchestrated content plan powered by the AI provider wrapper.</p>

        <form [formGroup]="generateForm" (ngSubmit)="onGenerate()" class="form-grid">
          <div class="form-control">
            <label for="brandId">Brand</label>
            <select id="brandId" formControlName="brandId">
              <option value="" disabled>Select a brand</option>
              <option *ngFor="let brand of brands$ | async" [value]="brand.id">{{ brand.name }}</option>
            </select>
          </div>

          <div class="form-control">
            <label for="niche">Niche / Industry</label>
            <input id="niche" type="text" formControlName="niche" placeholder="e.g. fitness and wellness" />
          </div>

          <div class="form-control">
            <label for="persona">Audience Persona</label>
            <input id="persona" type="text" formControlName="persona" placeholder="e.g. health-conscious millennials" />
          </div>

          <div class="form-control">
            <label for="tone">Tone</label>
            <select id="tone" formControlName="tone">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="authoritative">Authoritative</option>
              <option value="playful">Playful</option>
              <option value="inspirational">Inspirational</option>
            </select>
          </div>

          <div class="form-control span-2">
            <label for="ctaGoals">CTA Goals (comma separated)</label>
            <input id="ctaGoals" type="text" formControlName="ctaGoals" placeholder="e.g. sign up for newsletter, book consultation" />
          </div>

          <div class="form-control">
            <label for="platforms">Platforms (comma separated)</label>
            <input id="platforms" type="text" formControlName="platforms" placeholder="e.g. INSTAGRAM, LINKEDIN" />
          </div>

          <div class="form-control">
            <label for="startDate">Start Date</label>
            <input id="startDate" type="date" formControlName="startDate" />
          </div>

          <div class="form-control span-2">
            <button class="primary" type="submit" [disabled]="generateForm.invalid || generating">
              <span *ngIf="!generating">Generate Monthly Plan</span>
              <span *ngIf="generating">Generating...</span>
            </button>
          </div>
        </form>

        <div class="result" *ngIf="generateResult">
          <h4>API Response</h4>
          <pre>{{ generateResult | json }}</pre>
        </div>

        <div class="error" *ngIf="generateError">
          <strong>Error:</strong>
          <pre>{{ generateError }}</pre>
        </div>
      </section>

      <section class="card">
        <h3>Generate Content Variants</h3>
        <p>Create alternate versions of an existing post.</p>

        <form [formGroup]="variantForm" (ngSubmit)="onGenerateVariants()" class="form-grid small">
          <div class="form-control">
            <label for="postId">Post</label>
            <select id="postId" formControlName="postId">
              <option value="" disabled>Select a post</option>
              <option *ngFor="let post of posts$ | async" [value]="post.id">
                {{ post.title || ('Post ' + post.id) }} — {{ post.status }}
              </option>
            </select>
          </div>

          <div class="form-control">
            <label for="variantTone">Tone</label>
            <select id="variantTone" formControlName="tone">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="authoritative">Authoritative</option>
              <option value="playful">Playful</option>
              <option value="inspirational">Inspirational</option>
            </select>
          </div>

          <div class="form-control">
            <label for="variantCount">Variant Count (1-3)</label>
            <input id="variantCount" type="number" min="1" max="3" formControlName="variantCount" />
          </div>

          <div class="form-control span-2">
            <button class="secondary" type="button" (click)="reloadPosts()" [disabled]="loadingPosts">
              <span *ngIf="!loadingPosts">Reload Posts</span>
              <span *ngIf="loadingPosts">Refreshing...</span>
            </button>
            <button class="secondary" type="submit" [disabled]="variantForm.invalid || generatingVariants">
              <span *ngIf="!generatingVariants">Generate Variants</span>
              <span *ngIf="generatingVariants">Generating...</span>
            </button>
          </div>
        </form>

        <div class="result" *ngIf="variantResult">
          <h4>API Response</h4>
          <pre>{{ variantResult | json }}</pre>
        </div>

        <div class="error" *ngIf="variantError">
          <strong>Error:</strong>
          <pre>{{ variantError }}</pre>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page {
      max-width: 1100px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .page-header h2 {
      margin: 0 0 4px;
    }

    .page-header p {
      margin: 0;
      color: #6c757d;
    }

    .card {
      background: white;
      border-radius: 16px;
      padding: 28px;
      box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(15, 23, 42, 0.05);
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }

    .card-header h3 {
      margin: 0 0 4px;
    }

    .card-header p {
      margin: 0;
      color: #6c757d;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 20px;
      align-items: end;
    }

    .form-grid.small {
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    }

    .form-control {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-control.span-2 {
      grid-column: span 2;
    }

    label {
      font-weight: 600;
      color: #2c3e50;
    }

    input, select {
      padding: 12px;
      border-radius: 10px;
      border: 1px solid #d0d7de;
      background: #f8fafc;
      transition: border 0.2s ease;
      font-size: 14px;
    }

    input:focus, select:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
      background: white;
    }

    button.primary, button.secondary {
      padding: 12px 18px;
      border-radius: 10px;
      border: none;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.1s ease, box-shadow 0.2s ease;
    }

    button.primary {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);
    }

    button.primary:disabled {
      background: #cbd5f5;
      cursor: not-allowed;
      box-shadow: none;
    }

    button.secondary {
      background: white;
      border: 1px solid rgba(99, 102, 241, 0.3);
      color: #4f46e5;
    }

    button.secondary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .result, .error {
      background: #0f172a0d;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(15, 23, 42, 0.08);
    }

    .result h4 {
      margin-top: 0;
      margin-bottom: 12px;
    }

    .error {
      background: rgba(239, 68, 68, 0.08);
      border-color: rgba(239, 68, 68, 0.2);
      color: #b91c1c;
    }

    pre {
      margin: 0;
      max-height: 360px;
      overflow: auto;
      background: rgba(15, 23, 42, 0.04);
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
    }

    @media (max-width: 768px) {
      .page {
        padding-bottom: 40px;
      }

      .card {
        padding: 20px;
      }

      .form-control.span-2 {
        grid-column: span 1;
      }
    }
  `]
})
export class AiOrchestratorComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly aiService = inject(AiOrchestratorService);
  private readonly brandService = inject(BrandService);
  private readonly destroy$ = new Subject<void>();

  generateForm: FormGroup = this.fb.group({
    brandId: ['', Validators.required],
    niche: ['fitness and wellness', Validators.required],
    persona: ['health-conscious millennials', Validators.required],
    tone: ['professional', Validators.required],
    ctaGoals: ['sign up for newsletter, book consultation', Validators.required],
    platforms: ['INSTAGRAM, LINKEDIN', Validators.required],
    startDate: [this.getTodayDate(), Validators.required]
  });

  variantForm: FormGroup = this.fb.group({
    postId: ['', Validators.required],
    tone: ['professional', Validators.required],
    variantCount: [2, [Validators.required, Validators.min(1), Validators.max(3)]]
  });

  connectionResult: ConnectionResult | null = null;
  testingConnection = false;

  generateResult: unknown = null;
  generateError: string | null = null;
  generating = false;

  variantResult: unknown = null;
  variantError: string | null = null;
  generatingVariants = false;
  loadingPosts = false;

  brands$ = this.brandService.brands$;
  private postsSubject = new BehaviorSubject<VariantOption[]>([]);
  posts$ = this.postsSubject.asObservable();
  private currentBrandId: string | null = null;
  private hasInitializedBrand = false;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.generateForm.get('brandId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((brandId: string) => {
        if (brandId) {
          this.currentBrandId = brandId;
          this.loadPostsForBrand(brandId);
        } else {
          this.currentBrandId = null;
          this.postsSubject.next([]);
        }
      });

    this.brandService.currentBrand$
      .pipe(takeUntil(this.destroy$))
      .subscribe(currentBrand => {
        if (currentBrand?.id) {
          this.currentBrandId = currentBrand.id;
          if (!this.generateForm.value.brandId) {
            this.generateForm.patchValue({ brandId: currentBrand.id }, { emitEvent: false });
            this.loadPostsForBrand(currentBrand.id);
            this.hasInitializedBrand = true;
          }
        }
      });

    this.brands$
      .pipe(takeUntil(this.destroy$))
      .subscribe(brands => {
        if (brands.length === 0) {
          return;
        }

        const currentFormBrand = this.generateForm.value.brandId;
        if (!this.hasInitializedBrand && !currentFormBrand) {
          const fallbackBrandId = brands[0].id;
          this.generateForm.patchValue({ brandId: fallbackBrandId }, { emitEvent: false });
          this.currentBrandId = fallbackBrandId;
          this.loadPostsForBrand(fallbackBrandId);
          this.hasInitializedBrand = true;
        }
      });
  }

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  resetAll(): void {
    const currentBrandId = this.resolveCurrentBrandId();
    this.generateForm.reset({
      brandId: currentBrandId,
      niche: 'fitness and wellness',
      persona: 'health-conscious millennials',
      tone: 'professional',
      ctaGoals: 'sign up for newsletter, book consultation',
      platforms: 'INSTAGRAM, LINKEDIN',
      startDate: this.getTodayDate()
    });
    this.variantForm.reset({
      postId: '',
      tone: 'professional',
      variantCount: 2
    });
    this.generateResult = null;
    this.generateError = null;
    this.variantResult = null;
    this.variantError = null;
    this.connectionResult = null;

    if (currentBrandId) {
      this.loadPostsForBrand(currentBrandId);
    } else {
      this.postsSubject.next([]);
    }
  }

  testConnection(): void {
    this.testingConnection = true;
    this.connectionResult = null;

    this.aiService.testConnection()
      .pipe(finalize(() => this.testingConnection = false))
      .subscribe({
        next: (res: unknown) => {
          this.connectionResult = (res as ConnectionResult) ?? { success: true };
        },
        error: (error: any) => {
          this.connectionResult = {
            success: false,
            error: error?.error?.message || error?.message || 'Connection test failed'
          };
        }
      });
  }

  onGenerate(): void {
    if (this.generateForm.invalid) {
      this.generateForm.markAllAsTouched();
      return;
    }

    const formValue = this.generateForm.value;

    const payload: GenerateContentPayload = {
      brandId: formValue.brandId,
      niche: formValue.niche,
      persona: formValue.persona,
      tone: formValue.tone,
      ctaGoals: this.splitAndTrim(formValue.ctaGoals),
      platforms: this.splitAndTrim(formValue.platforms),
      startDate: formValue.startDate ? new Date(formValue.startDate).toISOString() : new Date().toISOString()
    };

    this.generating = true;
    this.generateResult = null;
    this.generateError = null;

    this.aiService.generateMonthlyPlan(payload)
      .pipe(finalize(() => this.generating = false))
      .subscribe({
        next: (res: unknown) => this.generateResult = res,
        error: (error: any) => {
          this.generateError = JSON.stringify(error.error || error.message || error, null, 2);
        }
      });
  }

  onGenerateVariants(): void {
    if (this.variantForm.invalid) {
      this.variantForm.markAllAsTouched();
      return;
    }

    const formValue = this.variantForm.value;
    const payload: GenerateVariantsPayload = {
      tone: formValue.tone,
      variantCount: Number(formValue.variantCount)
    };

    this.generatingVariants = true;
    this.variantResult = null;
    this.variantError = null;

    this.aiService.generateVariants(formValue.postId, payload)
      .pipe(finalize(() => this.generatingVariants = false))
      .subscribe({
        next: (res: unknown) => this.variantResult = res,
        error: (error: any) => {
          this.variantError = JSON.stringify(error.error || error.message || error, null, 2);
        }
      });
  }

  private splitAndTrim(value: string | null | undefined): string[] {
    if (!value) {
      return [];
    }
    return value
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);
  }

  private loadPostsForBrand(brandId: string): void {
    this.loadingPosts = true;
    this.aiService.listPosts({ brandId, limit: 100 })
      .pipe(
        map((response: PostsListResponse) => response.posts.map(post => ({
          id: post.id,
          title: post.title,
          status: post.status,
          brandId: post.brandId
        } as VariantOption))),
        finalize(() => {
          this.loadingPosts = false;
        })
      )
      .subscribe({
        next: posts => {
          this.postsSubject.next(posts);
          const currentPostId = this.variantForm.value.postId;
          if (currentPostId && !posts.some(post => post.id === currentPostId)) {
            this.variantForm.patchValue({ postId: '' });
          }
        },
        error: () => {
          this.postsSubject.next([]);
        }
      });
  }

  reloadPosts(): void {
    const brandId = this.resolveCurrentBrandId();
    if (brandId) {
      this.loadPostsForBrand(brandId);
    } else {
      this.postsSubject.next([]);
    }
  }

  private resolveCurrentBrandId(): string {
    return this.generateForm.value.brandId || this.currentBrandId || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
