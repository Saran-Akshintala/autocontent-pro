import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto/create-schedule.dto';
import { Schedule } from '@autocontent-pro/types';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, createScheduleDto: CreateScheduleDto): Promise<Schedule> {
    // Verify post exists and belongs to tenant
    const post = await this.prisma.post.findFirst({
      where: {
        id: createScheduleDto.postId,
        tenantId
      }
    });

    if (!post) {
      throw new NotFoundException('Post not found or does not belong to your organization');
    }

    // Check if post already has a schedule
    const existingSchedule = await this.prisma.schedule.findUnique({
      where: { postId: createScheduleDto.postId }
    });

    if (existingSchedule) {
      throw new ConflictException('Post already has a schedule. Use update instead.');
    }

    // Validate timezone and date
    const runAt = new Date(createScheduleDto.runAt);
    if (runAt <= new Date()) {
      throw new BadRequestException('Schedule time must be in the future');
    }

    // Validate timezone format (basic check)
    if (!this.isValidTimezone(createScheduleDto.timezone)) {
      throw new BadRequestException('Invalid timezone format');
    }

    const schedule = await this.prisma.schedule.create({
      data: {
        postId: createScheduleDto.postId,
        runAt,
        timezone: createScheduleDto.timezone,
        status: 'PENDING'
      }
    });

    // Update post status to PENDING_APPROVAL for scheduled posts
    await this.prisma.post.update({
      where: { id: createScheduleDto.postId },
      data: { status: 'PENDING_APPROVAL' }
    });

    console.log(`📋 Scheduled post ${createScheduleDto.postId} requires approval`);

    return this.mapToScheduleType(schedule);
  }

  async findAll(tenantId: string): Promise<Schedule[]> {
    const schedules = await this.prisma.schedule.findMany({
      where: {
        post: {
          tenantId
        }
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            brandId: true
          }
        }
      },
      orderBy: { runAt: 'asc' }
    });

    return schedules.map(schedule => this.mapToScheduleType(schedule));
  }

  async findOne(tenantId: string, id: string): Promise<Schedule> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        post: {
          tenantId
        }
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            brandId: true
          }
        }
      }
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return this.mapToScheduleType(schedule);
  }

  async findByPost(tenantId: string, postId: string): Promise<Schedule | null> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        postId,
        post: {
          tenantId
        }
      }
    });

    return schedule ? this.mapToScheduleType(schedule) : null;
  }

  async update(tenantId: string, id: string, updateScheduleDto: UpdateScheduleDto): Promise<Schedule> {
    const existingSchedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        post: {
          tenantId
        }
      }
    });

    if (!existingSchedule) {
      throw new NotFoundException('Schedule not found');
    }

    // Validate new run time if provided
    if (updateScheduleDto.runAt) {
      const newRunAt = new Date(updateScheduleDto.runAt);
      if (newRunAt <= new Date()) {
        throw new BadRequestException('Schedule time must be in the future');
      }
    }

    // Validate timezone if provided
    if (updateScheduleDto.timezone && !this.isValidTimezone(updateScheduleDto.timezone)) {
      throw new BadRequestException('Invalid timezone format');
    }

    const schedule = await this.prisma.schedule.update({
      where: { id },
      data: {
        ...(updateScheduleDto.runAt && { runAt: new Date(updateScheduleDto.runAt) }),
        ...(updateScheduleDto.timezone && { timezone: updateScheduleDto.timezone }),
        ...(updateScheduleDto.status && { status: updateScheduleDto.status }),
        updatedAt: new Date()
      }
    });

    return this.mapToScheduleType(schedule);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        id,
        post: {
          tenantId
        }
      }
    });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.prisma.schedule.delete({ where: { id } });

    // Update post status back to DRAFT
    await this.prisma.post.update({
      where: { id: schedule.postId },
      data: { status: 'DRAFT' }
    });
  }

  async findUpcoming(tenantId: string, hours: number = 24): Promise<Schedule[]> {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    const schedules = await this.prisma.schedule.findMany({
      where: {
        post: {
          tenantId
        },
        runAt: {
          gte: now,
          lte: futureTime
        },
        status: 'PENDING'
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            status: true,
            brandId: true,
            content: true
          }
        }
      },
      orderBy: { runAt: 'asc' }
    });

    return schedules.map(schedule => this.mapToScheduleType(schedule));
  }

  private mapToScheduleType(schedule: any): Schedule {
    return {
      id: schedule.id,
      postId: schedule.postId,
      runAt: schedule.runAt,
      timezone: schedule.timezone,
      status: schedule.status,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt
    };
  }

  private isValidTimezone(timezone: string): boolean {
    try {
      // Basic timezone validation using Intl.DateTimeFormat
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }
}
