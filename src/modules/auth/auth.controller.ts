import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './auth.types';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wx-login')
  @ApiOperation({ summary: 'Login with WeChat mini-program code' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(
    @Body()
    body: {
      code: string;
      nickname?: string;
      avatar_url?: string;
      phone?: string;
    },
  ) {
    const result = await this.authService.wechatLogin(body);
    return {
      code: 0,
      data: result,
      message: 'login successful',
    };
  }

  @Post('chef-login')
  @ApiOperation({ summary: 'Login with chef username and password' })
  @ApiResponse({ status: 200, description: 'Chef login successful' })
  async chefLogin(
    @Body()
    body: {
      username: string;
      password: string;
    },
  ) {
    const result = await this.authService.chefLogin(body);
    return {
      code: 0,
      data: result,
      message: 'login successful',
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check login status' })
  @ApiResponse({ status: 200, description: 'Authenticated' })
  async checkAuth(@CurrentUser() user: AuthenticatedUser) {
    return {
      code: 0,
      data: user,
      message: 'authenticated',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile loaded' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    const profile = await this.authService.getCurrentUserProfile(user);
    return {
      code: 0,
      data: profile,
      message: 'success',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout() {
    return {
      code: 0,
      data: null,
      message: 'logout successful',
    };
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('chef')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change current chef password' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      currentPassword: string;
      newPassword: string;
    },
  ) {
    await this.authService.changeChefPassword(user, body);
    return {
      code: 0,
      data: null,
      message: 'password changed successfully',
    };
  }
}
