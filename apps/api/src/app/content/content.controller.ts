import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TenantId } from '../auth/decorators/tenant-id.decorator';
import { GenerateContentDto, GenerateVariantsDto } from './dto/content.dto';
import {
  GenerateContentRequestSchema,
  GenerateVariantsRequestSchema,
  GenerateContentRequest,
  GenerateVariantsRequest,
} from '../ai/schemas/content.schema';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('content')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('generate')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @UsePipes(new ZodValidationPipe(GenerateContentRequestSchema))
  async generateMonthlyContent(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Body() generateRequest: GenerateContentRequest
  ) {
    const userId = req.user.id;
    return this.contentService.generateMonthlyContent(
      tenantId,
      userId,
      generateRequest
    );
  }

  @Post('variants/:postId')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  @UsePipes(new ZodValidationPipe(GenerateVariantsRequestSchema))
  async generateContentVariants(
    @TenantId() tenantId: string,
    @Param('postId') postId: string,
    @Body() variantsRequest: GenerateVariantsRequest
  ) {
    return this.contentService.generateContentVariants(
      tenantId,
      postId,
      variantsRequest
    );
  }

  @Get('generation-status/:jobId')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  async getGenerationStatus(
    @TenantId() tenantId: string,
    @Param('jobId') jobId: string
  ) {
    return this.contentService.getContentGenerationStatus(tenantId, jobId);
  }

  @Get('ai/test-connection')
  @Roles('OWNER', 'ADMIN')
  async testAIConnection() {
    return this.contentService.testAIConnection();
  }
}
