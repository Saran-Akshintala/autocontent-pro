import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PostStatus, UserRole } from '@prisma/client';
import { WhatsAppClientService } from '../whatsapp/whatsapp-client.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaService,
    private whatsAppClientService: WhatsAppClientService
  ) {}

  /**
   * Verify user has access to the specified brand
   */
  private async verifyBrandAccess(tenantId: string, userId: string, brandId: string) {
    const userTenant = await this.prisma.userTenant.findFirst({
      where: {
        userId,
        tenantId,
        role: { in: ['CLIENT', 'ADMIN', 'OWNER'] }
      }
    });

    if (!userTenant) {
      throw new ForbiddenException('User does not have access to this tenant');
    }

    const brand = await this.prisma.brand.findFirst({
      where: { id: brandId, tenantId }
    });

    if (!brand) {
      throw new NotFoundException('Brand not found');
    }

    // Additional brand-specific access control can be added here
    // For now, CLIENT/ADMIN/OWNER can access any brand in their tenant
  }

  /**
   * Get approval logs for a post
   */
  async getApprovalLogs(tenantId: string, postId: string) {
    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const logs = await this.prisma.approvalLog.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    });

    return { logs };
  }

  async getPendingApprovals(tenantId: string) {
    try {
      const posts = await this.prisma.post.findMany({
        where: {
          tenantId,
          status: 'PENDING_APPROVAL',
        },
        include: {
          brand: {
            include: {
              brandKit: true,
            },
          },
          schedule: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        posts: posts.map(post => ({
          id: post.id,
          title: post.title,
          content: post.content,
          status: post.status,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          brand: {
            id: post.brand?.id,
            name: post.brand?.name,
            logoUrl: post.brand?.brandKit?.logoUrl,
          },
          schedule: post.schedule ? {
            runAt: post.schedule.runAt,
            timezone: post.schedule.timezone,
            status: post.schedule.status,
          } : null,
        })),
        total: posts.length,
      };
    } catch (error) {
      console.error('❌ Error fetching pending approvals:', error);
      throw error;
    }
  }

  async approvePost(tenantId: string, postId: string, approvedBy: string, feedback?: string) {
    try {
      const post = await this.prisma.post.findFirst({
        where: { id: postId, tenantId },
        include: { schedule: true },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.status !== 'PENDING_APPROVAL') {
        throw new Error('Post is not pending approval');
      }

      // Update post status to SCHEDULED if it has a schedule, otherwise DRAFT
      const newStatus = post.schedule ? 'SCHEDULED' : 'DRAFT';
      
      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: { 
          status: newStatus,
          // You could add an approvals table to track approval history
        },
      });

      console.log(`✅ Post ${postId} approved by ${approvedBy}`);

      return {
        success: true,
        message: 'Post approved successfully',
        post: {
          id: updatedPost.id,
          title: updatedPost.title,
          status: updatedPost.status,
        },
        feedback,
      };
    } catch (error) {
      console.error('❌ Error approving post:', error);
      throw error;
    }
  }

  async rejectPost(tenantId: string, postId: string, userId: string, brandId: string, feedback?: string) {
    try {
      const post = await this.prisma.post.findFirst({
        where: { id: postId, tenantId },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      if (post.status !== 'PENDING_APPROVAL') {
        throw new Error('Post is not pending approval');
      }

      const updatedPost = await this.prisma.post.update({
        where: { id: postId },
        data: { status: 'DRAFT' }, // Back to draft for revision
      });

      console.log(`❌ Post ${postId} rejected by ${userId}`);

      return {
        success: true,
        message: 'Post rejected successfully',
        post: {
          id: updatedPost.id,
          title: updatedPost.title,
          status: updatedPost.status,
        },
        feedback,
      };
    } catch (error) {
      console.error('❌ Error rejecting post:', error);
      throw error;
    }
  }

  async requestChange(tenantId: string, postId: string, userId: string, brandId: string, feedback: string) {
    // Verify user has permission for this brand
    await this.verifyBrandAccess(tenantId, userId, brandId);

    const post = await this.prisma.post.findFirst({
      where: { id: postId, tenantId, brandId }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Post is not pending approval');
    }

    // Use transaction for atomic updates
    const result = await this.prisma.$transaction(async (tx) => {
      // Update post status back to draft
      const updatedPost = await tx.post.update({
        where: { id: postId },
        data: {
          status: 'DRAFT',
          updatedAt: new Date()
        }
      });

      // Log the change request action
      await tx.approvalLog.create({
        data: {
          postId,
          userId,
          action: 'CHANGE_REQUESTED',
          status: 'DRAFT',
          feedback,
          metadata: {
            changeRequestedAt: new Date(),
            brandId
          }
        }
      });

      return updatedPost;
    });

    console.log(`🔄 Changes requested for post ${postId} by user ${userId}`);
    return { success: true, post: result, feedback };
  }

  async getPostPreview(tenantId: string, postId: string) {
    try {
      const post = await this.prisma.post.findFirst({
        where: { id: postId, tenantId },
        include: {
          brand: {
            include: { brandKit: true },
          },
          schedule: true,
        },
      });

      if (!post) {
        throw new Error('Post not found');
      }

      const content = post.content as any;

      return {
        id: post.id,
        title: post.title,
        content: {
          hook: content?.hook || '',
          body: content?.body || '',
          hashtags: content?.hashtags || [],
          platforms: content?.platforms || [],
        },
        brand: {
          name: post.brand?.name || 'Unknown Brand',
          logo: post.brand?.brandKit?.logoUrl,
        },
        schedule: post.schedule ? {
          runAt: post.schedule.runAt,
          timezone: post.schedule.timezone,
        } : null,
        status: post.status,
        createdAt: post.createdAt,
      };
    } catch (error) {
      console.error('❌ Error getting post preview:', error);
      throw error;
    }
  }

  async sendApprovalNotification(tenantId: string, postId: string) {
    try {
      // Get the post details
      const post = await this.prisma.post.findFirst({
        where: { id: postId, tenantId },
      });

      if (!post) {
        console.log('⚠️ Post not found:', postId);
        return;
      }

      console.log(`📧 Sending approval notification for post ${postId}: "${post.title}"`);

      // Use the integrated WhatsApp client service
      const success = await this.whatsAppClientService.sendApprovalNotification(
        tenantId,
        postId,
        post.title,
        `New post "${post.title}" requires approval`
      );

      if (success) {
        console.log(`✅ Approval notification sent to WhatsApp for post ${postId}`);
      } else {
        console.log(`⚠️ No active WhatsApp session found for tenant ${tenantId}`);
      }
    } catch (error) {
      console.error('❌ Error sending approval notification:', error);
      // Don't throw error - this shouldn't block post creation
    }
  }
}
