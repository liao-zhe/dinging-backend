import { Controller, Post, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('AI助手')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户AI头像' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserAvatar(@Request() req) {
    const avatar = await this.aiService.getUserAvatar(req.user.userId);
    return {
      code: 0,
      data: avatar,
      message: '获取成功',
    };
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户AI头像' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '更新失败' })
  async updateAvatar(@Request() req, @Body() body: { avatar_url: string }) {
    const avatar = await this.aiService.updateAvatar(req.user.userId, body.avatar_url);
    return {
      code: 0,
      data: avatar,
      message: '更新成功',
    };
  }

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'AI对话' })
  @ApiResponse({ status: 200, description: '对话成功' })
  async chat(@Body() body: { message: string }) {
    const response = await this.aiService.chat(body.message);
    return {
      code: 0,
      data: response,
      message: '对话成功',
    };
  }
}