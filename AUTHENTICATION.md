# Authentication System

This document describes the comprehensive authentication and authorization system implemented in AutoContent Pro.

## Overview

The authentication system provides:
- **JWT-based authentication** with access tokens
- **Role-based access control** (RBAC) with tenant scoping
- **Multi-tenant security** with tenant validation
- **Password hashing** using Argon2
- **Comprehensive testing** with e2e test coverage

## Architecture

### Core Components

1. **AuthModule**: Main authentication module
2. **AuthService**: Business logic for authentication
3. **JwtStrategy**: Passport JWT strategy for token validation
4. **Guards**: JwtAuthGuard and RolesGuard for route protection
5. **Middleware**: TenantValidationMiddleware for tenant scoping
6. **Decorators**: @Public, @Roles, @CurrentUser for easy usage

## Authentication Flow

### 1. User Login
```bash
POST /auth/login
Content-Type: application/json

{
  "email": "owner@demo.io",
  "password": "Pass@123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "owner@demo.io",
    "firstName": "Demo",
    "lastName": "Owner",
    "tenants": [
      {
        "tenantId": "demo-tenant",
        "role": "OWNER",
        "tenantName": "Demo Company"
      }
    ]
  }
}
```

### 2. JWT Token Structure
```json
{
  "sub": "user-id",
  "email": "owner@demo.io",
  "tenants": [
    {
      "tenantId": "demo-tenant",
      "role": "OWNER"
    }
  ],
  "iat": 1640995200,
  "exp": 1641600000
}
```

### 3. Protected Route Access
```bash
GET /auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
x-tenant-id: demo-tenant
```

## Role-Based Access Control

### User Roles
- **OWNER**: Full access to tenant resources
- **ADMIN**: Administrative access with some restrictions
- **STAFF**: Limited access to operational features
- **CLIENT**: Read-only access to specific resources

### Usage Example
```typescript
@Controller('brands')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BrandsController {
  
  @Get()
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async findAll(@CurrentUser() user: any) {
    // Only OWNER, ADMIN, or STAFF can access
    return this.brandsService.findAll(user.tenantId);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  async create(@Body() createBrandDto: CreateBrandDto) {
    // Only OWNER or ADMIN can create brands
    return this.brandsService.create(createBrandDto);
  }
}
```

## Multi-Tenant Security

### Tenant Validation
The `TenantValidationMiddleware` ensures users can only access tenants they belong to:

1. Extracts `x-tenant-id` header from request
2. Validates JWT token and extracts user's tenant list
3. Checks if user belongs to the requested tenant
4. Blocks access if tenant mismatch is detected

### Request Headers
```bash
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-id>
```

## Security Features

### Password Security
- **Argon2 hashing**: Industry-standard password hashing
- **Salt generation**: Automatic salt generation for each password
- **Verification**: Secure password verification

### JWT Security
- **Secret key**: Configurable JWT secret (change in production!)
- **Expiration**: Configurable token expiration (default: 7 days)
- **Payload validation**: Comprehensive token payload validation

### Route Protection
- **Global guard**: JWT authentication applied globally
- **Public routes**: Use `@Public()` decorator to bypass authentication
- **Role enforcement**: Use `@Roles()` decorator for role-based access

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | User login | No |
| GET | `/auth/me` | Get current user profile | Yes |

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | API root | 
| GET | `/health` | Health check |
| GET | `/db/status` | Database status |

## Environment Configuration

Add these variables to your `.env` file:

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

## Testing

### Running Authentication Tests
```bash
# Run e2e tests
pnpm nx test api --testPathPattern=auth.e2e-spec.ts

# Run all API tests
pnpm nx test api
```

### Test Coverage
The e2e tests cover:
- ✅ Successful login with valid credentials
- ✅ Failed login with invalid credentials
- ✅ User profile retrieval
- ✅ Tenant access control validation
- ✅ Public endpoint access
- ✅ JWT token validation
- ✅ Role-based access control

## Usage Examples

### 1. Creating a Protected Controller
```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('protected')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProtectedController {
  
  @Get('admin-only')
  @Roles('OWNER', 'ADMIN')
  async adminOnly(@CurrentUser() user: any) {
    return { message: 'Admin access granted', user: user.email };
  }
}
```

### 2. Making Routes Public
```typescript
import { Public } from '../auth/decorators/public.decorator';

@Controller('public')
export class PublicController {
  
  @Public()
  @Get('info')
  async getInfo() {
    return { message: 'This is a public endpoint' };
  }
}
```

### 3. Accessing Current User
```typescript
@Get('profile')
async getProfile(@CurrentUser() user: any) {
  return {
    userId: user.id,
    email: user.email,
    tenants: user.userTenants.map(ut => ({
      tenantId: ut.tenantId,
      role: ut.role
    }))
  };
}
```

## Security Best Practices

### Production Deployment
1. **Change JWT secret**: Use a strong, unique secret key
2. **Use HTTPS**: Always use HTTPS in production
3. **Token expiration**: Set appropriate token expiration times
4. **Rate limiting**: Implement rate limiting on auth endpoints
5. **Audit logging**: Log authentication events

### Development
1. **Environment variables**: Never commit secrets to version control
2. **Test coverage**: Maintain comprehensive test coverage
3. **Error handling**: Implement proper error handling and logging
4. **Validation**: Use validation pipes for all input data

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check if JWT token is valid and not expired
2. **403 Forbidden**: Verify user has required role for the endpoint
3. **Tenant mismatch**: Ensure `x-tenant-id` header matches user's tenants
4. **Invalid credentials**: Check email/password combination

### Debug Tips
- Check JWT token payload using jwt.io
- Verify database user-tenant relationships
- Review server logs for detailed error messages
- Test with Postman or similar API client

## Migration from bcrypt

If migrating from bcrypt to argon2:

1. Update password hashing in AuthService
2. Update seed script to use argon2
3. Re-hash existing passwords or implement gradual migration
4. Update tests to use argon2

The system is now ready for production use with comprehensive security features!
