import { Body, Controller, Get, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user AI avatar' })
  @ApiResponse({ status: 200, description: 'Loaded successfully' })
  async getUserAvatar(@CurrentUser() user: AuthenticatedUser) {
    const avatar = await this.aiService.getUserAvatar(user.userId);
    return {
      code: 0,
      data: avatar,
      message: 'success',
    };
  }

  @Put('avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user AI avatar' })
  @ApiResponse({ status: 200, description: 'Updated successfully' })
  @ApiResponse({ status: 400, description: 'Update failed' })
  async updateAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { avatar_url: string },
  ) {
    const avatar = await this.aiService.updateAvatar(user.userId, body.avatar_url);
    return {
      code: 0,
      data: avatar,
      message: 'success',
    };
  }

  @Post('chat')
  @ApiOperation({ summary: 'AI chat' })
  @ApiResponse({ status: 200, description: 'Success' })
  async chat(@Body() body: { message: string }) {
    const response = await this.aiService.chat(body.message);
    return {
      code: 0,
      data: response,
      message: 'success',
    };
  }
}
