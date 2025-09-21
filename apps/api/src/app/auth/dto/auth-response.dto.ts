export class AuthResponseDto {
  access_token: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    tenants: Array<{
      tenantId: string;
      role: string;
      tenantName: string;
    }>;
  };
}
