import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '微信小程序登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 400, description: '登录失败' })
  async login(@Body() body: { code: string; userInfo?: { nickname?: string; avatar_url?: string } }) {
    const result = await this.authService.wechatLogin(body.code, body.userInfo);
    return {
      code: 0,
      data: result,
      message: '登录成功',
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '检查登录状态' })
  @ApiResponse({ status: 200, description: '已登录' })
  @ApiResponse({ status: 401, description: '未登录' })
  async checkAuth(@Request() req) {
    return {
      code: 0,
      data: {
        userId: req.user.userId,
        openid: req.user.openid,
        role: req.user.role,
      },
      message: '已登录',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async logout() {
    // JWT是无状态的，客户端删除token即可
    return {
      code: 0,
      data: null,
      message: '退出成功',
    };
  }
}
