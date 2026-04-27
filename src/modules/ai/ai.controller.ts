import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../users/users.service';
import { AiService } from './ai.service';

@ApiTags('AI鍔╂墜')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly usersService: UsersService,
  ) {}

  @Get('avatar')
  @ApiOperation({ summary: '鑾峰彇鐢ㄦ埛AI澶村儚' })
  @ApiResponse({ status: 200, description: '鑾峰彇鎴愬姛' })
  async getUserAvatar() {
    const defaultUser = await this.usersService.getDefaultUser();
    const avatar = await this.aiService.getUserAvatar(defaultUser.id);
    return {
      code: 0,
      data: avatar,
      message: '鑾峰彇鎴愬姛',
    };
  }

  @Put('avatar')
  @ApiOperation({ summary: '鏇存柊鐢ㄦ埛AI澶村儚' })
  @ApiResponse({ status: 200, description: '鏇存柊鎴愬姛' })
  @ApiResponse({ status: 400, description: '鏇存柊澶辫触' })
  async updateAvatar(@Body() body: { avatar_url: string }) {
    const defaultUser = await this.usersService.getDefaultUser();
    const avatar = await this.aiService.updateAvatar(defaultUser.id, body.avatar_url);
    return {
      code: 0,
      data: avatar,
      message: '鏇存柊鎴愬姛',
    };
  }

  @Post('chat')
  @ApiOperation({ summary: 'AI瀵硅瘽' })
  @ApiResponse({ status: 200, description: '瀵硅瘽鎴愬姛' })
  async chat(@Body() body: { message: string }) {
    const response = await this.aiService.chat(body.message);
    return {
      code: 0,
      data: response,
      message: '瀵硅瘽鎴愬姛',
    };
  }
}
