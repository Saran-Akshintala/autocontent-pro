import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller.minimal';
import { PrismaService } from '../app/prisma/prisma.service';

@Module({
  imports: [],
  controllers: [ImagesController],
  providers: [
    PrismaService,
  ],
  exports: [],
})
export class ImagesModule {}
