import { IsString, IsUUID, IsEnum, IsArray, IsOptional, IsDateString, IsInt, Min, Max } from 'class-validator';

export class GenerateContentDto {
  @IsUUID()
  brandId: string;

  @IsString()
  niche: string;

  @IsString()
  persona: string;

  @IsEnum(['professional', 'casual', 'friendly', 'authoritative', 'playful', 'inspirational'])
  tone: string;

  @IsArray()
  @IsString({ each: true })
  ctaGoals: string[];

  @IsArray()
  @IsEnum(['INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'TWITTER'], { each: true })
  platforms: string[];

  @IsDateString()
  startDate: string;
}

export class GenerateVariantsDto {
  @IsInt()
  @Min(1)
  @Max(3)
  @IsOptional()
  variantCount?: number = 2;

  @IsEnum(['professional', 'casual', 'friendly', 'authoritative', 'playful', 'inspirational'])
  @IsOptional()
  tone?: string;
}
