import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

interface WhiteLabelSettings {
  logoUrl?: string;
  primaryColor?: string;
  supportEmail?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentTheme = new BehaviorSubject<WhiteLabelSettings | null>(null);
  public theme$ = this.currentTheme.asObservable();

  constructor(
    private http: HttpClient,
    @Inject('API_BASE_URL') private env: { apiBaseUrl: string }
  ) {
    this.loadTenantBranding();
  }

  /**
   * Load tenant branding from API and apply theme
   */
  async loadTenantBranding(): Promise<void> {
    try {
      const response = await this.http.get<{ success: boolean; data: WhiteLabelSettings | null }>(
        `${this.env.apiBaseUrl}/tenant/branding`
      ).toPromise();

      if (response?.success && response.data) {
        this.applyTheme(response.data);
        this.currentTheme.next(response.data);
      } else {
        // Apply default theme
        this.applyDefaultTheme();
      }
    } catch (error) {
      console.warn('Failed to load tenant branding, using default theme:', error);
      this.applyDefaultTheme();
    }
  }

  /**
   * Apply theme settings to CSS variables
   */
  applyTheme(theme: WhiteLabelSettings): void {
    const root = document.documentElement;

    // Apply primary color
    if (theme.primaryColor) {
      root.style.setProperty('--primary-color', theme.primaryColor);
      root.style.setProperty('--primary-color-hover', this.darkenColor(theme.primaryColor, 10));
      root.style.setProperty('--primary-color-light', this.lightenColor(theme.primaryColor, 90));
    }

    // Store logo URL for components to use
    if (theme.logoUrl) {
      root.style.setProperty('--logo-url', `url(${theme.logoUrl})`);
    }

    // Apply other theme properties as needed
    this.currentTheme.next(theme);
  }

  /**
   * Apply default AutoContent Pro theme
   */
  applyDefaultTheme(): void {
    const defaultTheme: WhiteLabelSettings = {
      primaryColor: '#3B82F6',
      logoUrl: undefined,
      supportEmail: 'support@autocontentpro.com'
    };

    this.applyTheme(defaultTheme);
  }

  /**
   * Get current theme settings
   */
  getCurrentTheme(): WhiteLabelSettings | null {
    return this.currentTheme.value;
  }

  /**
   * Update theme (typically called after settings update)
   */
  updateTheme(theme: WhiteLabelSettings): void {
    this.applyTheme(theme);
  }

  /**
   * Get logo URL for header component
   */
  getLogoUrl(): string | null {
    return this.currentTheme.value?.logoUrl || null;
  }

  /**
   * Get support email for contact links
   */
  getSupportEmail(): string {
    return this.currentTheme.value?.supportEmail || 'support@autocontentpro.com';
  }

  /**
   * Get primary color for dynamic styling
   */
  getPrimaryColor(): string {
    return this.currentTheme.value?.primaryColor || '#3B82F6';
  }

  /**
   * Utility: Darken a hex color by percentage
   */
  private darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Utility: Lighten a hex color by percentage
   */
  private lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  /**
   * Generate CSS custom properties for the current theme
   */
  generateThemeCSS(): string {
    const theme = this.currentTheme.value;
    if (!theme) return '';

    let css = ':root {\n';
    
    if (theme.primaryColor) {
      css += `  --primary-color: ${theme.primaryColor};\n`;
      css += `  --primary-color-hover: ${this.darkenColor(theme.primaryColor, 10)};\n`;
      css += `  --primary-color-light: ${this.lightenColor(theme.primaryColor, 90)};\n`;
    }
    
    css += '}\n';
    return css;
  }
}
