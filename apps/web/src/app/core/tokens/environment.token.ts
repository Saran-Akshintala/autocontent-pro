import { InjectionToken } from '@angular/core';

export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  appName: string;
  version: string;
}

export const ENVIRONMENT = new InjectionToken<Environment>('Environment');
