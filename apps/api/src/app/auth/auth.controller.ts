import { Controller, Post, Get, Body, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    // Remove sensitive information
    const { password, ...userProfile } = user;
    
    return {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        createdAt: userProfile.createdAt,
        updatedAt: userProfile.updatedAt,
        tenants: userProfile.userTenants?.map((ut: any) => ({
          tenantId: ut.tenantId,
          role: ut.role,
          tenantName: ut.tenant?.name,
          joinedAt: ut.createdAt,
        })) || [],
      },
    };
  }
}
