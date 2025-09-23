import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsQueryDto } from './dto/posts-query.dto';
import { validatePostContent } from './validators/post-content.validator';
import { Post, PostsListResponse, PostStatus } from '@autocontent-pro/types';
import { ApprovalsService } from '../approvals/approvals.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    private approvalsService: ApprovalsService
  ) {}

  async create(tenantId: string, createPostDto: CreatePostDto): Promise<Post> {
    // Validate brand belongs to tenant
    const brand = await this.prisma.brand.findFirst({
      where: {
        id: createPostDto.brandId,
        tenantId: tenantId
      }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found or does not belong to your organization');
    }

    // Validate post content with Zod
    try {
      const validatedContent = validatePostContent(createPostDto.content);
      
      const post = await this.prisma.post.create({
        data: {
          tenantId,
          brandId: createPostDto.brandId,
          title: createPostDto.title,
          content: validatedContent,
          status: PostStatus.DRAFT
        },
        include: {
          brand: {
            select: {
              id: true,
              name: true,
              brandKit: {
                select: {
                  logoUrl: true
                }
              }
            }
          },
          schedule: true,
          assets: true
        }
      });

      // Check if post should go to approval workflow
      // For now, let's make all new posts require approval
      if (createPostDto.requiresApproval !== false) {
        // Update post status to PENDING_APPROVAL
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'PENDING_APPROVAL' }
        });

        // Send approval notification
        await this.approvalsService.sendApprovalNotification(tenantId, post.id);
        
        console.log(`📋 Post ${post.id} created and sent for approval`);
      }

      return this.mapToPostType({
        ...post,
        status: createPostDto.requiresApproval !== false ? 'PENDING_APPROVAL' : post.status
      });
    } catch (error) {
      throw new BadRequestException(`Invalid post content: ${error.message}`);
    }
  }

  async findAll(tenantId: string, query: PostsQueryDto): Promise<PostsListResponse> {
    const { page, limit, status, brandId, search, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      ...(status && { status }),
      ...(brandId && { brandId })
      // Temporarily disable search to isolate the issue
      // ...(search && {
      //   OR: [
      //     { title: { contains: search, mode: 'insensitive' } },
      //     { content: { path: ['hook'], string_contains: search } },
      //     { content: { path: ['body'], string_contains: search } }
      //   ]
      // })
    };

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          brand: {
            select: {
              id: true,
              name: true
            }
          },
          schedule: true,
          assets: true
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit
      }),
      this.prisma.post.count({ where })
    ]);

    return {
      posts: posts.map(post => this.mapToPostType(post)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async findOne(tenantId: string, id: string): Promise<Post> {
    const post = await this.prisma.post.findFirst({
      where: {
        id,
        tenantId
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            brandKit: {
              select: {
                logoUrl: true
              }
            }
          }
        },
        schedule: true,
        assets: true
      }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.mapToPostType(post);
  }

  async update(tenantId: string, id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const existingPost = await this.prisma.post.findFirst({
      where: { id, tenantId }
    });

    if (!existingPost) {
      throw new NotFoundException('Post not found');
    }

    // If updating content, validate with Zod
    let validatedContent;
    if (updatePostDto.content) {
      try {
        // Merge existing content with updates
        const mergedContent = {
          ...existingPost.content as any,
          ...updatePostDto.content
        };
        validatedContent = validatePostContent(mergedContent);
      } catch (error) {
        throw new BadRequestException(`Invalid post content: ${error.message}`);
      }
    }

    const post = await this.prisma.post.update({
      where: { id },
      data: {
        ...(updatePostDto.title && { title: updatePostDto.title }),
        ...(validatedContent && { content: validatedContent }),
        ...(updatePostDto.status && { status: updatePostDto.status }),
        updatedAt: new Date()
      },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            brandKit: {
              select: {
                logoUrl: true
              }
            }
          }
        },
        schedule: true,
        assets: true
      }
    });

    return this.mapToPostType(post);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const post = await this.prisma.post.findFirst({
      where: { id, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if post is published - maybe we want to archive instead of delete
    if (post.status === PostStatus.PUBLISHED) {
      await this.prisma.post.update({
        where: { id },
        data: { status: PostStatus.ARCHIVED }
      });
    } else {
      // Delete related schedules and assets first
      await this.prisma.schedule.deleteMany({ where: { postId: id } });
      await this.prisma.asset.deleteMany({ where: { postId: id } });
      await this.prisma.post.delete({ where: { id } });
    }
  }

  async findByBrand(tenantId: string, brandId: string, query: PostsQueryDto): Promise<PostsListResponse> {
    // Verify brand belongs to tenant
    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, tenantId }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    return this.findAll(tenantId, { ...query, brandId });
  }

  private mapToPostType(post: any): Post {
    return {
      id: post.id,
      tenantId: post.tenantId,
      brandId: post.brandId,
      title: post.title,
      content: post.content,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      publishedAt: post.publishedAt,
      brand: post.brand ? {
        id: post.brand.id,
        name: post.brand.name
      } : undefined,
      schedule: post.schedule ? {
        id: post.schedule.id,
        postId: post.schedule.postId,
        runAt: post.schedule.runAt,
        timezone: post.schedule.timezone,
        status: post.schedule.status,
        createdAt: post.schedule.createdAt,
        updatedAt: post.schedule.updatedAt
      } : null,
      assets: post.assets || []
    };
  }
}
