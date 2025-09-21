# AutoContent Pro

AutoContent Pro — a next-gen SaaS built to beat Publer and set new standards in automated social media content marketing.

## 🏗️ Architecture

This is an Nx monorepo containing:

### Applications
- **`api`** - NestJS REST API server
- **`web`** - Angular standalone web application (SSR disabled)
- **`wa-worker`** - Node.js service for WhatsApp automation using whatsapp-web.js

### Libraries
- **`libs/types`** - Shared TypeScript type definitions
- **`libs/utils`** - Common utility functions
- **`libs/queue`** - BullMQ client wrappers for job processing

## 🚀 Quick Start

### Prerequisites
- Node.js 18 LTS (see `.nvmrc`)
- pnpm 8.15.6+
- Redis (for queue management)

### Installation

```bash
# Install dependencies
pnpm install

# Start all services in development mode
pnpm dev:all
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

Create `.env` files in the root directory:

```bash
# API Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration (for queues)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# WhatsApp Worker Configuration
WA_WORKER_CONCURRENCY=3
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

## 🚀 Deployment

### Production Build

```bash
# Build all applications for production
pnpm nx build api --prod
pnpm nx build web --prod
pnpm nx build wa-worker --prod
```

### Docker Deployment

```bash
# Build and run with Docker Compose (create docker-compose.yml as needed)
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `pnpm commit`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in this repository
- Check the documentation in each app's README
- Review the Nx documentation: https://nx.dev

---

Built with ❤️ using Nx, NestJS, Angular, and Node.js
