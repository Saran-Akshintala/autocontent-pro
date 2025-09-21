export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenants: UserTenant[];
}

export interface UserTenant {
  tenantId: string;
  role: UserRole;
  tenantName: string;
}

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'CLIENT';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  currentTenant: UserTenant | null;
}
