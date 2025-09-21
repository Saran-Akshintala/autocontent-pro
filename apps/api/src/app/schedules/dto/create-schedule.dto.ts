import { IsUUID, IsDateString, IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateScheduleDto {
  @IsUUID()
  postId: string;

  @IsDateString()
  runAt: string; // ISO string

  @IsString()
  timezone: string; // e.g., 'America/New_York', 'UTC'
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsDateString()
  runAt?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'])
  status?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
}
