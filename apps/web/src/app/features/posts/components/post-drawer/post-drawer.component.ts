import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, combineLatest, Observable, firstValueFrom } from 'rxjs';
import { PostDrawerService } from '../../services/post-drawer.service';
import { Brand, BrandService } from '../../../../core/services/brand.service';
import { ToastService } from '../../../../core/services/toast.service';
import { HttpClient } from '@angular/common/http';
import { ENVIRONMENT, Environment } from '../../../../core/tokens/environment.token';
import { ImageGalleryComponent } from '../image-gallery/image-gallery.component';

// Local types to avoid import issues
interface Post {
  id: string;
  title: string;
  brandId: string;
  content: {
    hook: string;
    body: string;
    hashtags: string[];
    platforms: string[];
  };
  schedule?: {
    runAt: string;
    timezone: string;
  };
  brand?: {
    id: string;
    name: string;
    brandKit?: {
      colors?: string[];
      fonts?: string[];
      logoUrl?: string;
    };
  };
}

interface ContentVariant {
  hook: string;
  body: string;
  hashtags: string[];
}

interface VariantsResponse {
  variants: ContentVariant[];
}

@Component({
  selector: 'app-post-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ImageGalleryComponent],
  template: `
    <div class="drawer-overlay" *ngIf="isOpen$ | async" (click)="closeIfOverlay($event)">
      <div class="drawer-panel" (click)="$event.stopPropagation()">
        <div class="drawer-header">
          <div>
            <h3>{{ (editMode$ | async) === 'edit' ? 'Edit Post' : 'Create Post' }}</h3>
            <p>Compose content, select platforms, and schedule</p>
          </div>
          <button class="icon-btn" (click)="closeDrawer()">×</button>
        </div>

        <div class="drawer-content">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <!-- Brand with Brand Kit Preview -->
            <div class="form-row">
              <label>Brand</label>
              <select formControlName="brandId" (change)="onBrandChange($event)">
                <option value="">Select brand</option>
                <option *ngFor="let b of brands$ | async" [value]="b.id">{{ b.name }}</option>
              </select>
              <div class="brand-kit-preview" *ngIf="selectedBrand?.brandKit">
                <div class="brand-colors" *ngIf="selectedBrand?.brandKit?.colors?.length">
                  <span class="brand-color" 
                        *ngFor="let color of selectedBrand?.brandKit?.colors || []" 
                        [style.background-color]="color"
                        [title]="color">
                  </span>
                </div>
                <div class="brand-fonts" *ngIf="selectedBrand?.brandKit?.fonts?.length">
                  <span class="brand-font" *ngFor="let font of selectedBrand?.brandKit?.fonts || []">{{ font }}</span>
                </div>
              </div>
            </div>

            <!-- Title -->
            <div class="form-row">
              <label>Title</label>
              <input type="text" formControlName="title" placeholder="Post title" />
            </div>

            <!-- Platform Tabs -->
            <div class="form-row">
              <label>Platforms & Content</label>
              <div class="platform-tabs">
                <button type="button" 
                        *ngFor="let platform of availablePlatforms" 
                        class="platform-tab"
                        [class.active]="activePlatform === platform.id"
                        [class.selected]="isPlatformSelected(platform.id)"
                        (click)="selectPlatformTab(platform.id)">
                  {{ getPlatformIcon(platform.id) }} {{ platform.name }}
                  <span class="platform-indicator" *ngIf="isPlatformSelected(platform.id)">✓</span>
                </button>
              </div>
              <div class="error-message" *ngIf="submitted && platforms.length === 0">
                Select at least one platform
              </div>
            </div>

            <!-- Content for Active Platform -->
            <div class="platform-content" *ngIf="activePlatform">
              <div class="content-variants">
                <div class="variant-tabs">
                  <button type="button" 
                          class="variant-tab"
                          [class.active]="activeVariant === 'current'"
                          (click)="activeVariant = 'current'">
                    Current
                  </button>
                  <button type="button" 
                          *ngFor="let variant of contentVariants; let i = index"
                          class="variant-tab"
                          [class.active]="activeVariant === 'variant-' + i"
                          (click)="activeVariant = 'variant-' + i">
                    Variant {{ i + 1 }}
                  </button>
                  <button type="button" 
                          class="generate-variants-btn"
                          (click)="generateVariants()"
                          [disabled]="generatingVariants">
                    {{ generatingVariants ? '⏳' : '✨' }} Generate Variants
                  </button>
                </div>

                <!-- Current Content -->
                <div class="variant-content" *ngIf="activeVariant === 'current'">
                  <div class="form-row">
                    <label>Hook ({{ getPlatformLimits(activePlatform).hookLimit }} chars)</label>
                    <textarea formControlName="hook" rows="2" 
                              [placeholder]="'Attention-grabbing opener for ' + getPlatformName(activePlatform) + '...'"
                              [maxlength]="getPlatformLimits(activePlatform).hookLimit"></textarea>
                    <div class="hint">{{ form.get('hook')?.value?.length || 0 }}/{{ getPlatformLimits(activePlatform).hookLimit }}</div>
                  </div>

                  <div class="form-row">
                    <label>Body ({{ getPlatformLimits(activePlatform).bodyLimit }} chars)</label>
                    <textarea formControlName="body" rows="6" 
                              [placeholder]="'Write your content for ' + getPlatformName(activePlatform) + '...'"
                              [maxlength]="getPlatformLimits(activePlatform).bodyLimit"></textarea>
                    <div class="hint">{{ form.get('body')?.value?.length || 0 }}/{{ getPlatformLimits(activePlatform).bodyLimit }}</div>
                  </div>

                  <div class="form-row">
                    <label>Hashtags</label>
                    <div class="tags-input">
                      <input type="text" placeholder="#hashtag and press Enter" (keydown.enter)="addHashtag(hashtagInput)" #hashtagInput />
                      <div class="tags-list">
                        <span class="tag" *ngFor="let tag of hashtags.controls; let i = index">
                          {{ tag.value }}
                          <button type="button" (click)="removeHashtag(i)">×</button>
                        </span>
                      </div>
                      <button class="link" type="button" (click)="autoGenerateHashtags()">✨ Auto-generate</button>
                    </div>
                  </div>
                </div>

                <!-- Variant Content -->
                <div class="variant-content" *ngIf="activeVariant.startsWith('variant-')">
                  <div class="variant-preview">
                    <div class="form-row">
                      <label>Hook</label>
                      <div class="variant-text">{{ getActiveVariantContent()?.hook }}</div>
                    </div>
                    <div class="form-row">
                      <label>Body</label>
                      <div class="variant-text">{{ getActiveVariantContent()?.body }}</div>
                    </div>
                    <div class="form-row" *ngIf="getActiveVariantContent()?.hashtags?.length">
                      <label>Hashtags</label>
                      <div class="tags-list">
                        <span class="tag" *ngFor="let tag of getActiveVariantContent()?.hashtags">
                          {{ tag }}
                        </span>
                      </div>
                    </div>
                    <button type="button" class="btn btn-primary use-variant-btn" (click)="useVariant()">Use This Variant</button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Platform Selection Toggle -->
            <div class="form-row">
              <label>Enable/Disable Platforms</label>
              <div class="platforms-toggle">
                <label *ngFor="let p of availablePlatforms" class="platform-toggle">
                  <input type="checkbox" [checked]="isPlatformSelected(p.id)" (change)="togglePlatform(p.id, $event)" />
                  <span>{{ getPlatformIcon(p.id) }} {{ p.name }}</span>
                </label>
              </div>
            </div>

            <!-- Image Gallery -->
            <div class="form-row" *ngIf="currentPostId">
              <app-image-gallery 
                [postId]="currentPostId"
                (imagesGenerated)="onImagesGenerated($event)">
              </app-image-gallery>
            </div>

            <!-- Schedule -->
            <div class="form-row">
              <label>Schedule</label>
              <div class="schedule">
                <label class="switch">
                  <input type="checkbox" [checked]="isScheduled" (change)="onScheduleToggle($event)" />
                  <span>Schedule for later</span>
                </label>
                <div class="schedule-fields" *ngIf="isScheduled">
                  <input type="datetime-local" formControlName="scheduledDate" />
                  <select formControlName="timezone">
                    <option *ngFor="let tz of timezones" [value]="tz">{{ tz }}</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="drawer-footer">
              <button type="button" class="btn" (click)="closeDrawer()">Cancel</button>
              <button type="button" class="btn btn-outline" (click)="saveDraft()" [disabled]="!form.valid">Save Draft</button>
              <button type="submit" class="btn btn-primary" [disabled]="!canSubmit()">{{ (editMode$ | async) === 'edit' ? 'Update' : (isScheduled ? 'Schedule' : 'Create') }}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; justify-content: flex-end; z-index: 1000; }
    .drawer-panel { width: 720px; max-width: 100%; height: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -2px 0 12px rgba(0,0,0,.15); }
    .drawer-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #eee; }
    .drawer-header h3 { margin: 0; font-size: 18px; font-weight: 700; }
    .drawer-header p { margin: 4px 0 0 0; color: #6c757d; font-size: 13px; }
    .icon-btn { border: none; background: transparent; font-size: 22px; cursor: pointer; }
    .drawer-content { padding: 16px 20px; overflow: auto; flex: 1; }

    .form-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .form-row label { font-weight: 600; font-size: 13px; color: #2c3e50; }
    input[type=text], textarea, select, input[type=datetime-local] { padding: 10px 12px; border: 1px solid #dee2e6; border-radius: 6px; font-size: 14px; }
    input:focus, textarea:focus, select:focus { outline: none; border-color: #3498db; box-shadow: 0 0 0 2px rgba(52,152,219,.15); }
    .hint { font-size: 12px; color: #6c757d; }
    .error-message { color: #e74c3c; font-size: 12px; margin-top: 4px; }

    /* Brand Kit Preview */
    .brand-kit-preview { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
    .brand-colors { display: flex; gap: 6px; align-items: center; }
    .brand-color { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,.1); cursor: pointer; }
    .brand-fonts { display: flex; gap: 8px; flex-wrap: wrap; }
    .brand-font { background: #f8f9fa; padding: 4px 8px; border-radius: 4px; font-size: 11px; color: #6c757d; }

    /* Platform Tabs */
    .platform-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 16px; }
    .platform-tab { padding: 8px 12px; border: 1px solid #dee2e6; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease; position: relative; }
    .platform-tab:hover { background: #f8f9fa; }
    .platform-tab.active { background: #3498db; color: #fff; border-color: #3498db; }
    .platform-tab.selected { border-color: #27ae60; background: #e8f5e8; }
    .platform-tab.selected.active { background: #3498db; }
    .platform-indicator { font-size: 10px; background: #27ae60; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; position: absolute; top: -4px; right: -4px; }

    /* Platform Content */
    .platform-content { border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; background: #fafafa; }
    .content-variants { display: flex; flex-direction: column; gap: 16px; }
    
    /* Variant Tabs */
    .variant-tabs { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
    .variant-tab { padding: 6px 12px; border: 1px solid #dee2e6; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease; }
    .variant-tab:hover { background: #f8f9fa; }
    .variant-tab.active { background: #3498db; color: #fff; border-color: #3498db; }
    .generate-variants-btn { padding: 6px 12px; border: 1px solid #f39c12; background: #f39c12; color: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; transition: all 0.2s ease; margin-left: auto; }
    .generate-variants-btn:hover:not(:disabled) { background: #e67e22; }
    .generate-variants-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Variant Content */
    .variant-content { background: #fff; border-radius: 6px; padding: 16px; }
    .variant-preview { display: flex; flex-direction: column; gap: 12px; }
    .variant-text { background: #f8f9fa; padding: 12px; border-radius: 6px; border-left: 3px solid #3498db; font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
    .use-variant-btn { align-self: flex-start; }

    .tags-input { display: flex; flex-direction: column; gap: 8px; }
    .tags-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: #f1f3f5; color: #495057; padding: 4px 8px; border-radius: 12px; font-size: 12px; display: inline-flex; gap: 6px; align-items: center; }
    .tag button { border: none; background: transparent; cursor: pointer; }
    .link { background: transparent; border: none; color: #3498db; cursor: pointer; font-size: 13px; padding: 0; width: fit-content; }

    /* Platform Toggle */
    .platforms-toggle { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
    .platform-toggle { display: flex; align-items: center; gap: 8px; font-size: 14px; padding: 8px; border: 1px solid #dee2e6; border-radius: 6px; background: #fff; cursor: pointer; transition: all 0.2s ease; }
    .platform-toggle:hover { background: #f8f9fa; }
    .platform-toggle input[type=checkbox] { margin: 0; }

    .schedule { display: flex; flex-direction: column; gap: 8px; }
    .switch { display: inline-flex; align-items: center; gap: 8px; }
    .schedule-fields { display: flex; gap: 8px; }

    .drawer-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid #eee; }
    .btn { padding: 10px 14px; border-radius: 6px; border: 1px solid #dee2e6; background: #fff; cursor: pointer; transition: all 0.2s ease; }
    .btn:hover:not(:disabled) { transform: translateY(-1px); }
    .btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-outline { background: #fff; }
    .btn-primary { background: #3498db; border-color: #3498db; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #2980b9; }

    @media (max-width: 768px) {
      .drawer-panel { width: 100%; }
      .platform-tabs { flex-direction: column; }
      .variant-tabs { flex-direction: column; align-items: stretch; }
      .generate-variants-btn { margin-left: 0; }
      .platforms-toggle { grid-template-columns: 1fr; }
    }
  `]
})
export class PostDrawerComponent implements OnInit, OnDestroy {
  isOpen$!: Observable<boolean>;
  editMode$!: Observable<'create' | 'edit'>;
  currentPost$!: Observable<Post | null>;
  brands$!: Observable<Brand[]>;

  form: FormGroup;
  isScheduled = false;
  submitted = false;
  
  // Platform and variant management
  activePlatform = 'INSTAGRAM';
  activeVariant = 'current';
  contentVariants: ContentVariant[] = [];
  generatingVariants = false;
  selectedBrand: Brand | null = null;
  currentPostId: string | null = null;
  
  availablePlatforms = [
    { id: 'INSTAGRAM', name: 'Instagram' },
    { id: 'FACEBOOK', name: 'Facebook' },
    { id: 'TWITTER', name: 'Twitter' },
    { id: 'LINKEDIN', name: 'LinkedIn' },
    { id: 'TIKTOK', name: 'TikTok' },
  ];
  timezones = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Kolkata'];

  private destroy$ = new Subject<void>();
  private readonly env = inject<Environment>(ENVIRONMENT);
  private readonly toastService = inject(ToastService);
  private readonly http = inject(HttpClient);

  constructor(private fb: FormBuilder, private service: PostDrawerService, private brandService: BrandService) {
    this.form = this.fb.group({
      brandId: ['', Validators.required],
      title: ['', Validators.required],
      hook: ['', [Validators.required, Validators.maxLength(150)]],
      body: ['', [Validators.required, Validators.maxLength(2200)]],
      hashtags: this.fb.array<string>([]),
      platforms: this.fb.array<string>([]),
      scheduledDate: [''],
      timezone: ['UTC']
    });
    // Initialize streams after service is available
    this.isOpen$ = this.service.getIsOpen();
    this.editMode$ = this.service.getEditMode();
    this.currentPost$ = this.service.getCurrentPost();
    this.brands$ = this.service.getBrands();
  }

  ngOnInit(): void {
    // When editing, load post into form
    this.currentPost$.pipe(takeUntil(this.destroy$)).subscribe(post => {
      if (post) {
        console.log('📝 Post drawer: Loading post into form:', post);
        
        // Safety check: Don't set invalid IDs
        if (post.id && post.id !== 'new' && post.id !== 'undefined') {
          this.currentPostId = post.id;
        } else {
          console.warn('⚠️ Invalid post ID detected:', post.id);
          this.currentPostId = null;
        }
        this.form.patchValue({
          brandId: post.brandId,
          title: post.title,
          hook: post.content.hook,
          body: post.content.body,
          timezone: post.schedule?.timezone || 'UTC',
          scheduledDate: post.schedule ? this.toLocalDatetime(post.schedule.runAt) : ''
        });
        this.setArray(this.hashtags, post.content.hashtags);
        this.setArray(this.platforms, post.content.platforms);
        this.isScheduled = !!post.schedule;
        
        // Set selected brand for brand kit preview
        if (post.brand) {
          this.selectedBrand = post.brand;
        }
        
        // Set active platform to first selected platform
        if (post.content.platforms.length > 0) {
          this.activePlatform = post.content.platforms[0];
        }
      } else {
        this.currentPostId = null;
        this.resetForm();
        this.contentVariants = [];
        this.activeVariant = 'current';
      }
    });

    // Pre-fill brand when creating new post
    this.editMode$.pipe(takeUntil(this.destroy$)).subscribe(mode => {
      if (mode === 'create') {
        // Get current brand and pre-fill if form is empty
        this.brandService.currentBrand$.pipe(takeUntil(this.destroy$)).subscribe((currentBrand: Brand | null) => {
          if (currentBrand && !this.form.get('brandId')?.value) {
            this.form.patchValue({ brandId: currentBrand.id });
            this.selectedBrand = currentBrand;
          }
        });
      }
    });

    // Auto limit inputs based on active platform
    this.form.get('hook')?.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(v => {
      const limit = this.getPlatformLimits(this.activePlatform).hookLimit;
      if (v && v.length > limit) {
        this.form.get('hook')?.setValue(v.slice(0, limit), { emitEvent: false });
      }
    });
    this.form.get('body')?.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(v => {
      const limit = this.getPlatformLimits(this.activePlatform).bodyLimit;
      if (v && v.length > limit) {
        this.form.get('body')?.setValue(v.slice(0, limit), { emitEvent: false });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helpers
  get hashtags(): FormArray { return this.form.get('hashtags') as FormArray; }
  get platforms(): FormArray { return this.form.get('platforms') as FormArray; }

  setArray(arr: FormArray, values: string[]) {
    arr.clear();
    values.forEach(v => arr.push(this.fb.control(v)));
  }

  addHashtag(input: HTMLInputElement): void {
    const val = input.value.trim();
    if (!val) return;
    const tag = val.startsWith('#') ? val : `#${val}`;
    if (!this.hashtags.value.includes(tag)) {
      this.hashtags.push(this.fb.control(tag));
    }
    input.value = '';
  }

  removeHashtag(index: number): void {
    this.hashtags.removeAt(index);
  }

  autoGenerateHashtags(): void {
    const content = `${this.form.value.hook || ''} ${this.form.value.body || ''}`;
    const generated = this.service.generateHashtags(content);
    generated.forEach(g => { if (!this.hashtags.value.includes(g)) this.hashtags.push(this.fb.control(g)); });
  }

  isPlatformSelected(id: string): boolean { return this.platforms.value.includes(id); }
  togglePlatform(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    const idx = this.platforms.value.indexOf(id);
    if (checked && idx === -1) this.platforms.push(this.fb.control(id));
    if (!checked && idx > -1) this.platforms.removeAt(idx);
  }

  onScheduleToggle(ev: Event): void { this.isScheduled = (ev.target as HTMLInputElement).checked; }

  canSubmit(): boolean {
    return this.form.valid && this.platforms.value.length > 0;
  }

  saveDraft(): void {
    // A draft is just a create/update with status DRAFT (server may default to DRAFT)
    this.onSubmit();
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
    if (!this.canSubmit()) return;
    
    // Show optimistic loading state
    const mode = await firstValueFrom(this.editMode$);
    const actionText = mode === 'edit' ? 'Updating' : (this.isScheduled ? 'Scheduling' : 'Creating');
    
    try {
      const v = this.form.value;
      const payload = {
        brandId: v.brandId,
        title: v.title,
        content: {
          hook: v.hook,
          body: v.body,
          hashtags: this.hashtags.value,
          platforms: this.platforms.value
        }
      };

      let savedPost: Post;
      if (mode === 'edit') {
        const cp = await firstValueFrom(this.currentPost$);
        console.log('🔍 Edit mode - Current post:', cp);
        if (cp && cp.id) {
          console.log('✅ Updating post with ID:', cp.id);
          // Update existing post
          savedPost = await firstValueFrom(this.service.updatePost(cp.id, payload));
        } else {
          console.error('❌ Edit mode but no current post ID available:', cp);
          // This should not happen in edit mode - throw error instead of creating
          throw new Error('Cannot update post: No current post ID available');
        }
      } else {
        console.log('✅ Creating new post');
        // Create new post
        savedPost = await firstValueFrom(this.service.createPost(payload));
      }

      if (this.isScheduled && v.scheduledDate) {
        const runAtIso = new Date(v.scheduledDate).toISOString();
        await firstValueFrom(this.service.upsertSchedule(savedPost.id, { runAt: runAtIso, timezone: v.timezone || 'UTC' }));
      }

      // Update currentPostId for new posts
      if (mode === 'create') {
        this.currentPostId = savedPost.id;
      }
      
      // Show success toast
      this.toastService.success(
        `Post ${mode === 'edit' ? 'updated' : (this.isScheduled ? 'scheduled' : 'created')} successfully!`,
        `"${savedPost.title}" is now ${this.isScheduled ? 'scheduled' : 'ready'}.`
      );

      this.closeDrawer();
      // Trigger a reload of the posts list
      window.dispatchEvent(new CustomEvent('post-saved'));
    } catch (err: any) {
      console.error('❌ Post submit failed:', err);
      
      // Show error toast instead of alert
      this.toastService.error(
        `Failed to ${actionText.toLowerCase()} post`,
        err?.error?.message || err?.message || 'Please try again.',
        10000
      );
    }
  }

  copyPostLink(post: Post): void {
    const url = `${window.location.origin}${window.location.pathname}?edit=${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('Link Copied', 'Post edit link copied to clipboard.');
    }).catch(() => {
      this.toastService.error('Copy Failed', 'Failed to copy link to clipboard.');
    });
  }
  
  // Handle image generation events
  onImagesGenerated(assets: any[]): void {
    this.toastService.success('Images Generated', `Generated ${assets.length} images for this post.`);
  }

  closeIfOverlay(ev: Event): void { if (ev.target === ev.currentTarget) this.closeDrawer(); }
  closeDrawer(): void { this.service.closeDrawer(); }

  private resetForm(): void {
    this.form.reset({ brandId: '', title: '', hook: '', body: '', scheduledDate: '', timezone: 'UTC' });
    this.hashtags.clear();
    this.platforms.clear();
    this.isScheduled = false;
  }

  // New methods for platform tabs and variants
  selectPlatformTab(platformId: string): void {
    this.activePlatform = platformId;
    
    // Auto-enable platform if not already selected
    if (!this.isPlatformSelected(platformId)) {
      this.platforms.push(this.fb.control(platformId));
    }
  }
  
  onBrandChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const brandId = target.value;
    
    // Find and set selected brand for brand kit preview
    this.brands$.pipe(takeUntil(this.destroy$)).subscribe((brands: Brand[]) => {
      this.selectedBrand = brands.find(b => b.id === brandId) || null;
    });
  }
  
  async generateVariants(): Promise<void> {
    if (!this.form.get('hook')?.value || !this.form.get('body')?.value) {
      this.toastService.warning('Content Required', 'Please add hook and body content before generating variants.');
      return;
    }
    
    const currentPost = await firstValueFrom(this.currentPost$);
    if (!currentPost?.id) {
      this.toastService.warning('Save First', 'Please save the post before generating variants.');
      return;
    }
    
    this.generatingVariants = true;
    
    try {
      const response = await firstValueFrom(
        this.http.post<VariantsResponse>(`${this.env.apiBaseUrl}/content/variants/${currentPost.id}`, {
          variantCount: 3,
          tone: 'engaging'
        })
      );
      
      this.contentVariants = response.variants;
      this.toastService.success('Variants Generated', `Created ${response.variants.length} content variants.`);
    } catch (error: any) {
      console.error('Failed to generate variants:', error);
      this.toastService.error('Generation Failed', 'Could not generate content variants. Please try again.');
    } finally {
      this.generatingVariants = false;
    }
  }
  
  getActiveVariantContent(): ContentVariant | null {
    if (!this.activeVariant.startsWith('variant-')) return null;
    const index = parseInt(this.activeVariant.replace('variant-', ''));
    return this.contentVariants[index] || null;
  }
  
  useVariant(): void {
    const variant = this.getActiveVariantContent();
    if (!variant) return;
    
    // Update form with variant content
    this.form.patchValue({
      hook: variant.hook,
      body: variant.body
    });
    
    // Update hashtags
    this.setArray(this.hashtags, variant.hashtags);
    
    // Switch back to current tab
    this.activeVariant = 'current';
    
    this.toastService.success('Variant Applied', 'Content updated with selected variant.');
  }
  
  getPlatformIcon(platformId: string): string {
    switch (platformId) {
      case 'INSTAGRAM': return '📷';
      case 'FACEBOOK': return '📘';
      case 'TWITTER': return '🐦';
      case 'LINKEDIN': return '💼';
      case 'TIKTOK': return '🎵';
      default: return '📱';
    }
  }
  
  getPlatformName(platformId: string): string {
    const platform = this.availablePlatforms.find(p => p.id === platformId);
    return platform?.name || platformId;
  }
  
  getPlatformLimits(platformId: string): { hookLimit: number; bodyLimit: number } {
    switch (platformId) {
      case 'TWITTER':
        return { hookLimit: 100, bodyLimit: 280 };
      case 'INSTAGRAM':
        return { hookLimit: 150, bodyLimit: 2200 };
      case 'FACEBOOK':
        return { hookLimit: 200, bodyLimit: 63206 };
      case 'LINKEDIN':
        return { hookLimit: 150, bodyLimit: 3000 };
      case 'TIKTOK':
        return { hookLimit: 100, bodyLimit: 2200 };
      default:
        return { hookLimit: 150, bodyLimit: 2200 };
    }
  }

  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0,16);
  }
}
