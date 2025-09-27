import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BrandsModule } from './brands/brands.module';
import { TenantModule } from './tenant/tenant.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { BillingModule } from './billing/billing.module';
import { AffiliateModule } from './affiliate/affiliate.module';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { ContentModule } from './content/content.module';
import { AIModule } from './ai/ai.module';
import { QueueModule } from './queue/queue.module';
import { ImagesModule } from '../images/images.module.minimal';
import { PublishingModule } from '../publishing/publishing.module.minimal';
import { SchedulingModule } from '../scheduling/scheduling.module.minimal';
import { AnalyticsModule } from '../analytics/analytics.module.minimal';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { TenantScopingInterceptor } from './common/interceptors/tenant-scoping.interceptor';

@Module({
  imports: [
    PrismaModule, 
    AuthModule, 
    PostsModule, 
    SchedulesModule, 
    BrandsModule,
    TenantModule,
    BillingModule,
    AffiliateModule,
    // WhatsAppModule, // Temporarily disabled
    ApprovalsModule,
    ContentModule,
    AIModule,
    ImagesModule,
    PublishingModule,
    SchedulingModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantScopingInterceptor,
    },
  ],
})
export class AppModule {}
