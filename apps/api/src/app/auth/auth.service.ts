import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          userTenants: {
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        this.logger.warn(`Login attempt with non-existent email: ${email}`);
        return null;
      }

      const isPasswordValid = await argon2.verify(user.password, password);
      if (!isPasswordValid) {
        this.logger.warn(`Invalid password attempt for user: ${email}`);
        return null;
      }

      // Remove password from user object
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      this.logger.error('Error validating user:', error);
      return null;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenants: user.userTenants.map((ut: any) => ({
        tenantId: ut.tenantId,
        role: ut.role,
      })),
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`User ${user.email} logged in successfully`);

    return {
      access_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenants: user.userTenants.map((ut: any) => ({
          tenantId: ut.tenantId,
          role: ut.role,
          tenantName: ut.tenant.name,
        })),
      },
    };
  }

  async findUserById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userTenants: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password);
  }

  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return argon2.verify(hashedPassword, plainPassword);
  }

  /**
   * Check if user belongs to a specific tenant
   */
  async userBelongsToTenant(userId: string, tenantId: string): Promise<boolean> {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    return !!userTenant;
  }

  /**
   * Get user's role in a specific tenant
   */
  async getUserTenantRole(userId: string, tenantId: string): Promise<string | null> {
    const userTenant = await this.prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId,
          tenantId,
        },
      },
    });

    return userTenant?.role || null;
  }
}
