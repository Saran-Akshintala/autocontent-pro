import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BrandsModule } from './brands/brands.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ContentModule } from './content/content.module';
import { AIModule } from './ai/ai.module';
import { QueueModule } from './queue/queue.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    PostsModule, 
    SchedulesModule, 
    BrandsModule,
    QueueModule,
    WhatsAppModule,
    ApprovalsModule,
    ContentModule,
    AIModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
