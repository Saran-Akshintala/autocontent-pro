import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, combineLatest, Observable, firstValueFrom } from 'rxjs';
import { PostDrawerService } from '../../services/post-drawer.service';
import { Brand, BrandService } from '../../../../core/services/brand.service';

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
}

@Component({
  selector: 'app-post-drawer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
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
            <!-- Brand -->
            <div class="form-row">
              <label>Brand</label>
              <select formControlName="brandId">
                <option value="">Select brand</option>
                <option *ngFor="let b of brands$ | async" [value]="b.id">{{ b.name }}</option>
              </select>
            </div>

            <!-- Title -->
            <div class="form-row">
              <label>Title</label>
              <input type="text" formControlName="title" placeholder="Post title" />
            </div>

            <!-- Hook -->
            <div class="form-row">
              <label>Hook</label>
              <textarea formControlName="hook" rows="2" placeholder="Attention-grabbing opener..."></textarea>
              <div class="hint">{{ form.get('hook')?.value?.length || 0 }}/150</div>
            </div>

            <!-- Body -->
            <div class="form-row">
              <label>Body</label>
              <textarea formControlName="body" rows="6" placeholder="Write your content..."></textarea>
              <div class="hint">{{ form.get('body')?.value?.length || 0 }}/2200</div>
            </div>

            <!-- Hashtags -->
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

            <!-- Platforms -->
            <div class="form-row">
              <label>Platforms</label>
              <div class="platforms">
                <label *ngFor="let p of availablePlatforms">
                  <input type="checkbox" [checked]="isPlatformSelected(p.id)" (change)="togglePlatform(p.id, $event)" />
                  <span>{{ p.name }}</span>
                </label>
              </div>
              <div class="error-message" *ngIf="submitted && platforms.length === 0">
                Select at least one platform
              </div>
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
    .drawer-panel { width: 560px; max-width: 100%; height: 100%; background: #fff; display: flex; flex-direction: column; box-shadow: -2px 0 12px rgba(0,0,0,.15); }
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

    .tags-input { display: flex; flex-direction: column; gap: 8px; }
    .tags-list { display: flex; gap: 6px; flex-wrap: wrap; }
    .tag { background: #f1f3f5; color: #495057; padding: 4px 8px; border-radius: 12px; font-size: 12px; display: inline-flex; gap: 6px; align-items: center; }
    .tag button { border: none; background: transparent; cursor: pointer; }
    .link { background: transparent; border: none; color: #3498db; cursor: pointer; font-size: 13px; padding: 0; width: fit-content; }

    .platforms { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px 12px; }
    .platforms label { display: flex; align-items: center; gap: 8px; font-size: 14px; }

    .schedule { display: flex; flex-direction: column; gap: 8px; }
    .switch { display: inline-flex; align-items: center; gap: 8px; }
    .schedule-fields { display: flex; gap: 8px; }

    .drawer-footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; border-top: 1px solid #eee; }
    .btn { padding: 10px 14px; border-radius: 6px; border: 1px solid #dee2e6; background: #fff; cursor: pointer; }
    .btn-outline { background: #fff; }
    .btn-primary { background: #3498db; border-color: #3498db; color: #fff; }
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
  availablePlatforms = [
    { id: 'INSTAGRAM', name: 'Instagram' },
    { id: 'FACEBOOK', name: 'Facebook' },
    { id: 'TWITTER', name: 'Twitter' },
    { id: 'LINKEDIN', name: 'LinkedIn' },
    { id: 'TIKTOK', name: 'TikTok' },
  ];
  timezones = ['UTC','America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo','Asia/Kolkata'];

  private destroy$ = new Subject<void>();

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
      } else {
        this.resetForm();
      }
    });

    // Pre-fill brand when creating new post
    this.editMode$.pipe(takeUntil(this.destroy$)).subscribe(mode => {
      if (mode === 'create') {
        // Get current brand and pre-fill if form is empty
        this.brandService.currentBrand$.pipe(takeUntil(this.destroy$)).subscribe(currentBrand => {
          if (currentBrand && !this.form.get('brandId')?.value) {
            this.form.patchValue({ brandId: currentBrand.id });
          }
        });
      }
    });

    // Auto limit inputs
    this.form.get('hook')?.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(v => {
      if (v && v.length > 150) this.form.get('hook')?.setValue(v.slice(0,150), { emitEvent: false });
    });
    this.form.get('body')?.valueChanges.pipe(debounceTime(50), takeUntil(this.destroy$)).subscribe(v => {
      if (v && v.length > 2200) this.form.get('body')?.setValue(v.slice(0,2200), { emitEvent: false });
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

      const mode = await firstValueFrom(this.editMode$);
      let savedPost: Post;
      if (mode === 'edit') {
        const cp = await firstValueFrom(this.currentPost$);
        if (cp) {
          savedPost = await firstValueFrom(this.service.updatePost(cp.id, payload));
        } else {
          savedPost = await firstValueFrom(this.service.createPost(payload));
        }
      } else {
        savedPost = await firstValueFrom(this.service.createPost(payload));
      }

      if (this.isScheduled && v.scheduledDate) {
        const runAtIso = new Date(v.scheduledDate).toISOString();
        await firstValueFrom(this.service.upsertSchedule(savedPost.id, { runAt: runAtIso, timezone: v.timezone || 'UTC' }));
      }

      this.closeDrawer();
      // Trigger a reload of the posts list
      window.dispatchEvent(new CustomEvent('post-saved'));
    } catch (err: any) {
      console.error('❌ Post submit failed:', err);
      console.error('❌ Error details:', {
        message: err?.message,
        status: err?.status,
        error: err?.error,
        url: err?.url
      });
      alert(`Failed to save post: ${err?.error?.message || err?.message || 'Unknown error'}. Please try again.`);
    }
  }

  closeIfOverlay(ev: Event): void { if (ev.target === ev.currentTarget) this.closeDrawer(); }
  closeDrawer(): void { this.service.closeDrawer(); }

  private resetForm(): void {
    this.form.reset({ brandId: '', title: '', hook: '', body: '', scheduledDate: '', timezone: 'UTC' });
    this.hashtags.clear();
    this.platforms.clear();
    this.isScheduled = false;
  }

  private toLocalDatetime(iso: string): string {
    const d = new Date(iso);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0,16);
  }
}
