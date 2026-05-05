import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { UserPreferenceService } from './user-preference.service';
import { ChatDto } from './dto/chat.dto';
import { Message } from './providers/llm-provider.interface';

@ApiTags('AI 助手')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly preferenceService: UserPreferenceService,
  ) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送消息（非流式）' })
  async chat(@Request() req, @Body() dto: ChatDto) {
    return this.aiService.chat(req.user.userId, dto);
  }

  @Post('chat/stream')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '发送消息（流式 SSE）' })
  async chatStream(@Request() req, @Body() dto: ChatDto, @Res() res: Response) {
    const result = await this.aiService.chatStream(req.user.userId, dto);

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Session-Id', result.session_id);

    const chunks = await result.stream;
    for (const chunk of chunks) {
      res.write(chunk);
    }
    res.end();
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取会话列表' })
  async getSessions(@Request() req) {
    return this.aiService.getSessions(req.user.userId);
  }

  @Get('sessions/:id/messages')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取会话消息' })
  async getMessages(@Request() req, @Param('id') id: string) {
    return this.aiService.getMessages(req.user.userId, id);
  }

  @Delete('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除会话' })
  async deleteSession(@Request() req, @Param('id') id: string) {
    return this.aiService.deleteSession(req.user.userId, id);
  }

  @Get('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户偏好' })
  async getPreferences(@Request() req) {
    const preference = await this.preferenceService.getPreference(req.user.userId);
    return { code: 200, data: preference };
  }

  @Put('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户偏好' })
  async updatePreferences(@Request() req, @Body() body: any) {
    const preference = await this.preferenceService.upsertPreference(
      req.user.userId,
      body,
    );
    return { code: 200, data: preference };
  }

  @Post('analyze-image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '分析菜品图片' })
  async analyzeImage(@Request() req, @Body() body: { image_url: string }) {
    const llmFactory = (this.aiService as any).llmFactory;
    const provider = llmFactory.getProvider();

    const messages: Message[] = [
      {
        role: 'system',
        content: '你是一个菜品识别助手。请分析图片中的菜品，返回菜品名称、主要食材和可能的口味特点。',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: '请识别这张图片中的菜品' },
          { type: 'image_url', image_url: { url: body.image_url } },
        ] as any,
      },
    ];

    try {
      const response = await provider.chat({ messages });
      return {
        code: 200,
        data: {
          analysis: response.content,
        },
      };
    } catch (error) {
      return {
        code: 500,
        message: '图片分析失败: ' + (error?.message || '未知错误'),
      };
    }
  }
}
