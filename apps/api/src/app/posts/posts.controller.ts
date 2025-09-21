import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ValidationPipe
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @Roles('OWNER', 'ADMIN', 'STAFF')
  create(@Request() req: any, @Body(ValidationPipe) createPostDto: CreatePostDto) {
    const tenantId = req.tenantId;
    return this.postsService.create(tenantId, createPostDto);
  }

  @Get()
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findAll(@Request() req: any, @Query() query: any) {
    const tenantId = req.tenantId;
    console.log('Posts endpoint called with tenantId:', tenantId);
    console.log('Query params:', query);
    
    // Use default values to avoid validation issues
    const safeQuery = {
      page: parseInt(query.page) || 1,
      limit: parseInt(query.limit) || 10,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc'
    };
    
    return this.postsService.findAll(tenantId, safeQuery);
  }

  @Get('brand/:brandId')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findByBrand(
    @Request() req: any,
    @Param('brandId') brandId: string,
    @Query(ValidationPipe) query: PostsQueryDto
  ) {
    const tenantId = req.tenantId;
    return this.postsService.findByBrand(tenantId, brandId, query);
  }

  @Get(':id')
  @Roles('OWNER', 'ADMIN', 'STAFF', 'CLIENT')
  findOne(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.postsService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'STAFF')
  update(
    @Request() req: any,
    @Param('id') id: string,
    @Body(ValidationPipe) updatePostDto: UpdatePostDto
  ) {
    const tenantId = req.tenantId;
    return this.postsService.update(tenantId, id, updatePostDto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  remove(@Request() req: any, @Param('id') id: string) {
    const tenantId = req.tenantId;
    return this.postsService.remove(tenantId, id);
  }
}
