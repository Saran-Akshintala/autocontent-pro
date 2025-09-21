import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, switchMap, of, tap, catchError } from 'rxjs';
import { AuthService } from './auth.service';
import { ENVIRONMENT, Environment } from '../tokens/environment.token';

export interface Brand {
  id: string;
  name: string;
  timezone?: string;
  brandKit?: {
    logoUrl?: string;
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
    console.log('🚀 BrandService: Constructor called');
    this.auth.authState$.pipe(
      tap(state => {
        console.log('🔄 BrandService: Auth state:', {
          isAuthenticated: state.isAuthenticated,
          hasTenant: !!state.currentTenant,
          tenantId: state.currentTenant?.tenantId
        });
      }),
      switchMap(state => {
        if (state.currentTenant) {
          console.log('✅ BrandService: Fetching brands for tenant:', state.currentTenant.tenantId);
          return this.fetchBrands();
        }
        console.log('❌ BrandService: No tenant, clearing brands');
        this.brandsSubject.next([]);
        this.currentBrandSubject.next(null);
        return of([]);
      })
    ).subscribe({
      next: (brands) => console.log('📦 BrandService: Subscription result:', brands),
      error: (error) => console.error('❌ BrandService: Subscription error:', error)
    });
  }

  fetchBrands(): Observable<Brand[]> {
    const url = `${this.env.apiBaseUrl}/brands`;
    console.log('🔍 BrandService: Making HTTP request to', url);
    return this.http.get<{ brands: Brand[] }>(url).pipe(
      tap(response => {
        console.log('✅ BrandService: HTTP response received:', response);
        const { brands } = response;
        this.brandsSubject.next(brands);
        console.log('📊 BrandService: Updated brands subject with', brands.length, 'brands');
        
        // Restore previously selected brand for this tenant
        const tenantId = this.auth.currentTenant?.tenantId;
        if (tenantId) {
          const storedId = localStorage.getItem(this.STORAGE_KEY_PREFIX + tenantId);
          const found = brands.find(b => b.id === storedId) || brands[0] || null;
          console.log('🎯 BrandService: Setting current brand:', found?.name || 'none');
          this.currentBrandSubject.next(found || null);
        } else {
          this.currentBrandSubject.next(brands[0] || null);
        }
      }),
      switchMap(({ brands }) => of(brands)),
      catchError(error => {
        console.error('❌ BrandService: HTTP error:', error);
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
