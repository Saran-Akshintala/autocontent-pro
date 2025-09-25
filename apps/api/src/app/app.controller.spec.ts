import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { QueueService } from './queue/queue.service';

describe('AppController', () => {
  let app: TestingModule;

  beforeAll(async () => {
    const prismaMock = {
      healthCheck: jest.fn().mockResolvedValue({ status: 'healthy' }),
      getDatabaseStats: jest.fn().mockResolvedValue({
        connections: 1,
        tables: 1,
      }),
    } as Partial<PrismaService>;

    const queueMock = {
      getQueueHealth: jest.fn().mockResolvedValue({ status: 'ok' }),
    } as Partial<QueueService>;

    app = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: QueueService, useValue: queueMock },
      ],
    }).compile();
  });

  describe('getData', () => {
    it('should return "Hello AutoContent Pro API! 🚀"', () => {
      const appController = app.get<AppController>(AppController);
      expect(appController.getData()).toEqual({
        message: 'Hello AutoContent Pro API! 🚀',
      });
    });
  });
});
