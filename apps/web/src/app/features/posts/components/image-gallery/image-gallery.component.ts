import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ENVIRONMENT, Environment } from '../../../../core/tokens/environment.token';
import { ToastService } from '../../../../core/services/toast.service';

interface Asset {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  signedUrl?: string;
  mimeType: string;
  size: number;
  metadata?: {
    width?: number;
    height?: number;
    generated?: boolean;
    visualIdea?: string;
  };
  createdAt: string;
}

interface AssetsResponse {
  postId: string;
  assets: Asset[];
  total: number;
}

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="image-gallery">
      <div class="gallery-header">
        <h4>Generated Images</h4>
        <div class="gallery-actions">
          <button 
            class="btn btn-primary btn-sm" 
            (click)="generateImages()"
            [disabled]="generating">
            {{ generating ? '⏳ Generating...' : '✨ Generate Images' }}
          </button>
          <button 
            class="btn btn-outline btn-sm" 
            (click)="refreshGallery()">
            🔄 Refresh
          </button>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <p>Loading images...</p>
      </div>

      <div class="empty-state" *ngIf="!loading && assets.length === 0">
        <div class="empty-icon">🖼️</div>
        <p>No images generated yet</p>
        <button class="btn btn-primary" (click)="generateImages()">
          Generate Images
        </button>
      </div>

      <div class="gallery-grid" *ngIf="!loading && assets.length > 0">
        <div class="image-card" *ngFor="let asset of assets; trackBy: trackByAssetId">
          <div class="image-container">
            <img 
              [src]="asset.signedUrl || asset.url" 
              [alt]="asset.originalName"
              (error)="onImageError($event, asset)"
              loading="lazy">
            
            <div class="image-overlay">
              <div class="image-actions">
                <button 
                  class="action-btn" 
                  (click)="previewImage(asset)"
                  title="Preview">
                  👁️
                </button>
                <button 
                  class="action-btn" 
                  (click)="downloadImage(asset)"
                  title="Download">
                  ⬇️
                </button>
                <button 
                  class="action-btn canva-btn" 
                  (click)="openInCanva(asset)"
                  title="Open in Canva">
                  🎨
                </button>
                <button 
                  class="action-btn" 
                  (click)="copyImageUrl(asset)"
                  title="Copy URL">
                  🔗
                </button>
              </div>
            </div>
          </div>
          
          <div class="image-info">
            <div class="image-title">{{ asset.originalName }}</div>
            <div class="image-meta">
              <span class="image-size" *ngIf="asset.metadata?.width && asset.metadata?.height">
                {{ asset.metadata?.width }}×{{ asset.metadata?.height }}
              </span>
              <span class="image-type">{{ getFileExtension(asset.mimeType) }}</span>
              <span class="image-file-size">{{ formatFileSize(asset.size) }}</span>
            </div>
            <div class="image-idea" *ngIf="asset.metadata?.visualIdea">
              "{{ asset.metadata?.visualIdea }}"
            </div>
          </div>
        </div>
      </div>

      <!-- Image Preview Modal -->
      <div class="modal-overlay" *ngIf="previewAsset" (click)="closePreview()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ previewAsset.originalName }}</h3>
            <button class="close-btn" (click)="closePreview()">×</button>
          </div>
          <div class="modal-body">
            <img 
              [src]="previewAsset.signedUrl || previewAsset.url" 
              [alt]="previewAsset.originalName"
              class="preview-image">
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="downloadImage(previewAsset)">
              ⬇️ Download
            </button>
            <button class="btn btn-primary" (click)="openInCanva(previewAsset)">
              🎨 Open in Canva
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .image-gallery {
      margin-top: 16px;
    }

    .gallery-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .gallery-header h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
    }

    .gallery-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      padding: 6px 12px;
      border-radius: 4px;
      border: 1px solid #dee2e6;
      background: #fff;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s ease;
    }

    .btn:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: #3498db;
      border-color: #3498db;
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      background: #2980b9;
    }

    .btn-outline {
      background: #fff;
      color: #3498db;
    }

    .btn-sm {
      padding: 4px 8px;
      font-size: 11px;
    }

    .loading-state, .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6c757d;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 16px;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .image-card {
      border: 1px solid #dee2e6;
      border-radius: 8px;
      overflow: hidden;
      background: #fff;
      transition: all 0.2s ease;
    }

    .image-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .image-container {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .image-container:hover .image-overlay {
      opacity: 1;
    }

    .image-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: rgba(255, 255, 255, 0.9);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      transition: all 0.2s ease;
    }

    .action-btn:hover {
      background: #fff;
      transform: scale(1.1);
    }

    .canva-btn:hover {
      background: #00c4cc;
      color: #fff;
    }

    .image-info {
      padding: 12px;
    }

    .image-title {
      font-weight: 600;
      font-size: 13px;
      color: #2c3e50;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .image-meta {
      display: flex;
      gap: 8px;
      font-size: 11px;
      color: #6c757d;
      margin-bottom: 4px;
    }

    .image-idea {
      font-size: 11px;
      color: #6c757d;
      font-style: italic;
      line-height: 1.3;
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #fff;
      border-radius: 8px;
      max-width: 90vw;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #dee2e6;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 16px;
    }

    .close-btn {
      border: none;
      background: transparent;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-body {
      padding: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .preview-image {
      max-width: 100%;
      max-height: 70vh;
      object-fit: contain;
    }

    .modal-footer {
      display: flex;
      gap: 8px;
      padding: 16px;
      border-top: 1px solid #dee2e6;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .gallery-grid {
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 12px;
      }

      .gallery-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .gallery-actions {
        justify-content: center;
      }
    }
  `]
})
export class ImageGalleryComponent implements OnInit {
  @Input() postId!: string;
  @Output() imagesGenerated = new EventEmitter<Asset[]>();

  assets: Asset[] = [];
  loading = false;
  generating = false;
  previewAsset: Asset | null = null;

  private readonly env = inject<Environment>(ENVIRONMENT);
  private readonly http = inject(HttpClient);
  private readonly toastService = inject(ToastService);

  ngOnInit(): void {
    if (this.postId) {
      this.loadAssets();
    }
  }

  loadAssets(): void {
    this.loading = true;
    this.http.get<AssetsResponse>(`${this.env.apiBaseUrl}/images/post/${this.postId}/assets`)
      .pipe(
        catchError(error => {
          console.error('Failed to load assets:', error);
          this.toastService.error('Loading Error', 'Failed to load images.');
          return of({ postId: this.postId, assets: [], total: 0 });
        })
      )
      .subscribe(response => {
        this.assets = response.assets;
        this.loading = false;
      });
  }

  generateImages(): void {
    if (!this.postId) {
      this.toastService.warning('No Post', 'Please save the post first before generating images.');
      return;
    }

    this.generating = true;
    this.http.post<any>(`${this.env.apiBaseUrl}/images/generate-for-post/${this.postId}`, {})
      .pipe(
        catchError(error => {
          console.error('Failed to generate images:', error);
          this.toastService.error('Generation Failed', 'Failed to generate images. Please try again.');
          return of({ success: false, assets: [] });
        })
      )
      .subscribe(response => {
        this.generating = false;
        if (response.success) {
          this.toastService.success('Images Generated', `Generated ${response.assets?.length || 0} images successfully.`);
          this.assets = response.assets || [];
          this.imagesGenerated.emit(this.assets);
        }
      });
  }

  refreshGallery(): void {
    this.loadAssets();
  }

  previewImage(asset: Asset): void {
    this.previewAsset = asset;
  }

  closePreview(): void {
    this.previewAsset = null;
  }

  downloadImage(asset: Asset): void {
    const link = document.createElement('a');
    link.href = asset.signedUrl || asset.url;
    link.download = asset.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.toastService.success('Download Started', `Downloading ${asset.filename}`);
  }

  openInCanva(asset: Asset): void {
    // Canva integration - opens Canva with the image
    const canvaUrl = `https://www.canva.com/design/new?template=${encodeURIComponent(asset.signedUrl || asset.url)}`;
    window.open(canvaUrl, '_blank');
    
    this.toastService.info('Opening Canva', 'Opening image in Canva for editing.');
  }

  copyImageUrl(asset: Asset): void {
    const url = asset.signedUrl || asset.url;
    navigator.clipboard.writeText(url).then(() => {
      this.toastService.success('URL Copied', 'Image URL copied to clipboard.');
    }).catch(() => {
      this.toastService.error('Copy Failed', 'Failed to copy URL to clipboard.');
    });
  }

  onImageError(event: Event, asset: Asset): void {
    console.warn(`Failed to load image: ${asset.filename}`);
    // Could implement fallback image here
  }

  trackByAssetId(index: number, asset: Asset): string {
    return asset.id;
  }

  getFileExtension(mimeType: string): string {
    const extensions: { [key: string]: string } = {
      'image/png': 'PNG',
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG',
      'image/gif': 'GIF',
      'image/webp': 'WEBP',
      'image/svg+xml': 'SVG',
    };
    return extensions[mimeType] || 'IMG';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
