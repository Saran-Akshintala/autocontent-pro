# Database Setup Guide

This guide will help you set up PostgreSQL with Prisma for AutoContent Pro.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js 18+ and pnpm installed

## Quick Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure your database:

```bash
cp .env.example .env
```

Update the `DATABASE_URL` in your `.env` file:

```bash
DATABASE_URL="postgresql://username:password@localhost:5432/autocontent_pro"
```

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Create and Migrate Database

```bash
# Create the database and run migrations
pnpm db:migrate

# Or push schema directly (for development)
pnpm db:push
```

### 5. Seed the Database

```bash
pnpm db:seed
```

This will create:
- Demo tenant with Professional plan
- Owner user (email: `owner@demo.io`, password: `Pass@123`)
- Demo brand with brand kit
- Sample posts and analytics
- WhatsApp session placeholder

## Database Schema Overview

### Core Entities

- **Tenant**: Multi-tenant organization with plan and WhatsApp mode
- **User**: System users with authentication
- **UserTenant**: Many-to-many relationship with roles (OWNER, ADMIN, STAFF, CLIENT)
- **Brand**: Brand entities under tenants with timezone settings
- **BrandKit**: Brand assets (colors, fonts, logo)

### Content Management

- **Post**: Social media posts with content and status
- **Schedule**: Scheduled posts for different channels
- **Asset**: File uploads (images, videos, etc.)
- **PostAnalytics**: Performance metrics per channel

### Channel Integration

- **ChannelConnection**: Social media platform connections
- **WhatsAppSession**: WhatsApp Web sessions
- **WhatsAppMessageLog**: WhatsApp message history

## Available Scripts

```bash
# Generate Prisma client
pnpm db:generate

# Push schema to database (development)
pnpm db:push

# Create and run migrations (production)
pnpm db:migrate

# Seed database with demo data
pnpm db:seed

# Open Prisma Studio (database GUI)
pnpm db:studio
```

## API Endpoints

Once the API is running, you can check database status:

- `GET /api/health` - Overall health including database
- `GET /api/db/status` - Detailed database status and statistics

## Database Features

### PrismaService Features

- **Health Checks**: Database connectivity monitoring
- **Transactions**: Automatic retry logic with configurable options
- **Batch Operations**: Efficient bulk operations
- **Soft Deletes**: Helper for soft deletion patterns
- **Conflict Resolution**: Upsert with conflict handling
- **Statistics**: Database entity counts and metrics

### Example Usage

```typescript
// In your service
constructor(private prisma: PrismaService) {}

// Health check
const health = await this.prisma.healthCheck();

// Transaction with retry
await this.prisma.executeTransaction(async (tx) => {
  const user = await tx.user.create({ data: userData });
  const tenant = await tx.tenant.create({ data: tenantData });
  return { user, tenant };
});

// Get statistics
const stats = await this.prisma.getDatabaseStats();
```

## Troubleshooting

### Common Issues

1. **Connection refused**: Ensure PostgreSQL is running
2. **Database doesn't exist**: Create it manually or use `createdb autocontent_pro`
3. **Permission denied**: Check PostgreSQL user permissions
4. **Migration errors**: Reset with `prisma migrate reset` (development only)

### Reset Database (Development)

```bash
# Reset database and re-seed
npx prisma migrate reset
pnpm db:seed
```

### Production Deployment

```bash
# Generate client
pnpm db:generate

# Run migrations
pnpm db:migrate deploy

# Don't run seed in production
```

## Schema Changes

When modifying the schema:

1. Update `prisma/schema.prisma`
2. Generate migration: `pnpm db:migrate`
3. Update seed script if needed
4. Test with fresh database: `npx prisma migrate reset`

## Security Notes

- Database credentials should be in environment variables
- Use connection pooling for production
- Enable SSL for production databases
- Regularly backup your database
- Use read replicas for analytics queries

## Monitoring

The PrismaService includes built-in logging and monitoring:

- Query logging in development
- Error tracking
- Performance metrics
- Connection health checks

Check the `/api/db/status` endpoint for real-time database metrics.
