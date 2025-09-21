export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenants: Array<{
    tenantId: string;
    role: string;
  }>;
  iat?: number;
  exp?: number;
}
