import { IsString, IsNotEmpty, IsUUID, ValidateNested, IsArray, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { Platform } from '@autocontent-pro/types';

export class PostContentDto {
  @IsString()
  @IsNotEmpty()
  hook: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsArray()
  @IsString({ each: true })
  hashtags: string[];

  @IsArray()
  @IsEnum(Platform, { each: true })
  platforms: Platform[];
}

export class CreatePostDto {
  @IsString()
  @IsNotEmpty()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @ValidateNested()
  @Type(() => PostContentDto)
  content: PostContentDto;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;
}
