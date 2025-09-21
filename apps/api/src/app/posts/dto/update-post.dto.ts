import { IsString, IsOptional, ValidateNested, IsEnum, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PostStatus, Platform } from '@autocontent-pro/types';

export class UpdatePostContentDto {
  @IsOptional()
  @IsString()
  hook?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString({ each: true })
  hashtags?: string[];

  @IsOptional()
  @IsEnum(Platform, { each: true })
  platforms?: Platform[];
}

export class UpdatePostDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePostContentDto)
  content?: UpdatePostContentDto;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;
}
