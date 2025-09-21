import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app/app.module';
import { PrismaService } from '../src/app/prisma/prisma.service';
import * as argon2 from 'argon2';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testTenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();

    // Create test data
    await setupTestData();
  });

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        id: 'test-tenant',
        name: 'Test Tenant',
        plan: 'STARTER',
        whatsappMode: 'BASIC',
      },
    });
    testTenantId = tenant.id;

    // Create test user with hashed password
    const hashedPassword = await argon2.hash('TestPass@123');
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
      },
    });
    testUserId = user.id;

    // Create user-tenant relationship
    await prisma.userTenant.create({
      data: {
        userId: user.id,
        tenantId: tenant.id,
        role: 'ADMIN',
      },
    });

    // Create another tenant that user doesn't belong to
    await prisma.tenant.create({
      data: {
        id: 'unauthorized-tenant',
        name: 'Unauthorized Tenant',
        plan: 'FREE',
        whatsappMode: 'DISABLED',
      },
    });
  }

  async function cleanupTestData() {
    await prisma.userTenant.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.deleteMany({
      where: { email: 'test@example.com' },
    });
    await prisma.tenant.deleteMany({
      where: {
        id: {
          in: ['test-tenant', 'unauthorized-tenant'],
        },
      },
    });
  }

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'TestPass@123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user.tenants).toHaveLength(1);
      expect(response.body.user.tenants[0].tenantId).toBe(testTenantId);
      expect(response.body.user.tenants[0].role).toBe('ADMIN');

      // Store token for subsequent tests
      authToken = response.body.access_token;
    });

    it('should fail login with invalid email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'TestPass@123',
        })
        .expect(401);
    });

    it('should fail login with invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });

    it('should fail login with invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'TestPass@123',
        })
        .expect(400);
    });

    it('should fail login with short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: '123',
        })
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user profile when authenticated', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email', 'test@example.com');
      expect(response.body.user).toHaveProperty('firstName', 'Test');
      expect(response.body.user).toHaveProperty('lastName', 'User');
      expect(response.body.user).toHaveProperty('tenants');
      expect(response.body.user.tenants).toHaveLength(1);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should fail without authentication token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });

    it('should fail with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Tenant Access Control', () => {
    it('should allow access with valid tenant header', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', testTenantId)
        .expect(200);

      expect(response.body.user.email).toBe('test@example.com');
    });

    it('should block access with unauthorized tenant header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', 'unauthorized-tenant')
        .expect(403);
    });

    it('should block access with non-existent tenant header', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .set('x-tenant-id', 'non-existent-tenant')
        .expect(403);
    });
  });

  describe('Public Endpoints', () => {
    it('should allow access to health endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);
    });

    it('should allow access to root endpoint without authentication', async () => {
      await request(app.getHttpServer())
        .get('/')
        .expect(200);
    });
  });
});
