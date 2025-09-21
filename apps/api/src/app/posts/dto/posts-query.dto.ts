import { IsOptional, IsEnum, IsUUID, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus } from '@autocontent-pro/types';

export class PostsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsUUID()
  brandId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['createdAt', 'updatedAt', 'publishedAt', 'title'])
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'title' = 'createdAt';

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
