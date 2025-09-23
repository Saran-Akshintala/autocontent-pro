import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class ApprovePostDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}

export class RequestChangeDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @IsString()
  @IsNotEmpty()
  feedback: string;
}

export class RejectPostDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  postId: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  brandId: string;

  @IsString()
  @IsOptional()
  feedback?: string;
}
