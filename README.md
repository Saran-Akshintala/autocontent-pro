# 🚀 AutoContent Pro

**Next-generation social media automation platform** - A comprehensive SaaS solution for automated content creation, scheduling, and multi-platform publishing with advanced analytics and affiliate management.

## ✨ Key Features

- **🤖 AI Content Generation** - Automated post creation with multiple variants
- **📅 Smart Scheduling** - Multi-timezone content calendar with drag-drop interface
- **📊 Advanced Analytics** - Real-time performance tracking across all platforms
- **💰 Affiliate System** - Built-in referral program with 30% commission tracking
- **💳 Billing Management** - Subscription plans with usage-based billing
- **📱 WhatsApp Integration** - Approval workflows via WhatsApp Business API
- **🎨 Brand Management** - Multi-brand support with brand kits and templates
- **🔐 Enterprise Security** - Multi-tenant architecture with role-based access

## 🏗️ Architecture

Modern **Nx monorepo** with microservices architecture:

### Core Applications
- **`api`** - NestJS REST API with PostgreSQL & Prisma ORM
- **`web`** - Angular 17+ standalone web application
- **`wa-worker`** - WhatsApp Business API integration service

### Shared Libraries
- **`libs/types`** - TypeScript type definitions
- **`libs/utils`** - Common utility functions
- **`libs/queue`** - BullMQ job processing

## 🚀 Quick Start

### Prerequisites
- **Node.js 18 LTS** (see `.nvmrc`)
- **pnpm 8.15.6+**
- **PostgreSQL 14+** (database)
- **Redis** (queue management)

### Installation & Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Setup database
pnpm prisma migrate dev
pnpm prisma generate

# 3. Seed demo data
pnpm db:seed

# 4. Start all services
pnpm dev:all
```

### Demo Login Credentials
```
Email: owner@demo.io
Password: Pass@123
Role: OWNER (full access)
```

### Individual Services

```bash
# API Server (http://localhost:3000)
pnpm nx serve api

# Web App (http://localhost:4200)
pnpm nx serve web

# WhatsApp Worker
pnpm nx serve wa-worker
```

## 🛠️ Development

### Building Applications

```bash
# Build all apps
pnpm nx build api
pnpm nx build web
pnpm nx build wa-worker

# Build specific app
pnpm nx build <app-name>
```

### Testing

```bash
# Run tests for all projects
pnpm nx test

# Run tests for specific project
pnpm nx test <project-name>
```

### Linting & Formatting

```bash
# Lint all projects
pnpm nx lint

# Format code
pnpm nx format:write
```

## 📦 Docker Support

Multi-stage Dockerfiles are provided for production deployments:

```bash
# Build API container
docker build -f apps/api/Dockerfile -t autocontent-pro-api .

# Build WhatsApp Worker container
docker build -f apps/wa-worker/Dockerfile -t autocontent-pro-wa-worker .
```

## 🔧 Configuration

### Environment Variables

Create `.env` file in the root directory:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/autocontent_pro"

# API Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET="your-jwt-secret-key"

# Redis (Queue Management)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# WhatsApp Integration
WA_WORKER_CONCURRENCY=3

# Optional: External Services
# AWS_ACCESS_KEY_ID=your-aws-key
# AWS_SECRET_ACCESS_KEY=your-aws-secret
# OPENAI_API_KEY=your-openai-key
```

### VSCode Setup

Recommended extensions are configured in `.vscode/extensions.json`. Install them for the best development experience.

## 📚 Project Structure

```
autocontent-pro/
├── apps/
│   ├── api/                 # NestJS API
│   ├── web/                 # Angular Web App
│   └── wa-worker/           # WhatsApp Worker Service
├── libs/
│   ├── types/               # Shared TypeScript types
│   ├── utils/               # Utility functions
│   └── queue/               # BullMQ wrappers
├── tools/                   # Build tools and scripts
├── .vscode/                 # VSCode configuration
├── nx.json                  # Nx workspace configuration
├── package.json             # Root package.json
└── tsconfig.base.json       # Base TypeScript configuration
```

## 🎯 Available Scripts

```bash
# Development
pnpm dev:api          # Start API server
pnpm dev:web          # Start web app
pnpm dev:wa-worker    # Start WhatsApp worker
pnpm dev:all          # Start all services concurrently

# Building
pnpm build:api        # Build API
pnpm build:web        # Build web app
pnpm build:wa-worker  # Build WhatsApp worker

# Testing
pnpm test:api         # Test API
pnpm test:web         # Test web app
pnpm test:wa-worker   # Test WhatsApp worker

# Utilities
pnpm lint             # Lint all projects
pnpm format           # Format code
pnpm commit           # Conventional commit with commitizen
```

## 🔄 Git Workflow

This project uses conventional commits with commitlint and husky:

```bash
# Use commitizen for conventional commits
pnpm commit

# Or manually follow conventional commit format
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update README"
```

## 📊 System Features

### 📝 Content Management
- **Multi-Brand Support** - Manage multiple brands with custom brand kits
- **AI Content Generation** - Generate post variants with different tones
- **Smart Scheduling** - Timezone-aware scheduling across platforms
- **Approval Workflows** - WhatsApp-based content approval system

### 📊 Analytics & Reporting
- **Real-time Analytics** - Track impressions, engagement, clicks across platforms
- **Performance Insights** - Identify top-performing content and optimal posting times
- **Revenue Tracking** - Monitor subscription usage and billing metrics

### 💰 Business Features
- **Affiliate Program** - 30% commission tracking with automated payouts
- **Subscription Billing** - STARTER ($29), GROWTH ($79), AGENCY ($199) plans
- **Usage Monitoring** - Track post credits, image credits, and brand limits
- **Multi-tenant Architecture** - Complete tenant isolation and security

## 🚀 Deployment

### Production Build

```bash
# Build all applications for production
pnpm nx build api --prod
pnpm nx build web --prod
pnpm nx build wa-worker --prod
```

### Database Migration

```bash
# Run migrations in production
pnpm prisma migrate deploy
pnpm prisma generate
```

## 🏭 Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
DATABASE_URL="postgresql://user:pass@host:5432/autocontent_pro"
JWT_SECRET="your-production-jwt-secret"
REDIS_HOST=your-redis-host
REDIS_PORT=6379
```

### Build & Deploy
```bash
# Build for production
pnpm nx build api --prod
pnpm nx build web --prod

# Run database migrations
pnpm prisma migrate deploy

# Start production server
node dist/apps/api/main.js
```

## 🔧 Troubleshooting

### Common Issues
- **Database Connection**: Ensure PostgreSQL is running and DATABASE_URL is correct
- **Authentication Errors**: Verify JWT_SECRET is set and consistent
- **Brand Loading Issues**: Check API server is running and accessible
- **Post Creation Problems**: Ensure brands are seeded and user has proper role

### Health Checks
```bash
# API Health
curl http://localhost:3000/api/health

# Database Status  
curl http://localhost:3000/api/db/status
```

## 📚 Documentation

Detailed technical documentation available in:
- `docs/AI_CONTENT_GENERATION.md` - AI content generation system
- `docs/QUEUE_SYSTEM.md` - Redis and BullMQ queue architecture

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `pnpm commit`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

**Built with ❤️ using Nx, NestJS, Angular, and Node.js**

*AutoContent Pro - Next-generation social media automation platform*
