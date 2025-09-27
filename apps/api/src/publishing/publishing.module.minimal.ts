import { Module } from '@nestjs/common';
import { PublishingController } from './publishing.controller.minimal';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [PublishingController],
  providers: [PrismaService],
  exports: [],
})
export class PublishingModule {}
