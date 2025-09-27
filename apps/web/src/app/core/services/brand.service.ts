import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, switchMap, of, tap, catchError, map } from 'rxjs';
import { AuthService } from './auth.service';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';

export interface Brand {
  id: string;
  name: string;
  timezone?: string;
  brandKit?: {
    logoUrl?: string;
    colors?: string[];
    fonts?: string[];
  };
}

@Injectable({ providedIn: 'root' })
export class BrandService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly env = inject(ENVIRONMENT);

  private readonly STORAGE_KEY_PREFIX = 'acp_current_brand_';

  private brandsSubject = new BehaviorSubject<Brand[]>([]);
  private currentBrandSubject = new BehaviorSubject<Brand | null>(null);

  brands$ = this.brandsSubject.asObservable();
  currentBrand$ = this.currentBrandSubject.asObservable();

  constructor() {
    // Load brands whenever tenant changes
    this.auth.authState$.pipe(
      switchMap(state => {
        if (state.currentTenant) {
          return this.fetchBrands();
        }
        this.brandsSubject.next([]);
        this.currentBrandSubject.next(null);
        return of([]);
      })
    ).subscribe({
      error: (error) => console.error('BrandService: Error loading brands:', error)
    });
  }

  fetchBrands(): Observable<Brand[]> {
    const url = `${this.env.apiBaseUrl}/brands`;
    return this.http.get<{ brands: Brand[] }>(url).pipe(
      tap(response => {
        const { brands } = response;
        this.brandsSubject.next(brands);
        
        // Restore previously selected brand for this tenant
        const tenantId = this.auth.currentTenant?.tenantId;
        if (tenantId) {
          const storedId = localStorage.getItem(this.STORAGE_KEY_PREFIX + tenantId);
          const found = brands.find(b => b.id === storedId) || brands[0] || null;
          this.currentBrandSubject.next(found || null);
        } else {
          this.currentBrandSubject.next(brands[0] || null);
        }
      }),
      map((response: { brands: Brand[] }) => response.brands),
      catchError((error) => {
        console.error('BrandService: Error fetching brands:', error);
        return of([]);
      })
    );
  }

  setCurrentBrandById(brandId: string): void {
    const tenantId = this.auth.currentTenant?.tenantId;
    const brand = this.brandsSubject.value.find(b => b.id === brandId) || null;
    this.currentBrandSubject.next(brand);
    if (tenantId && brand) {
      localStorage.setItem(this.STORAGE_KEY_PREFIX + tenantId, brand.id);
    }
  }
}
