import {
  Controller,
  Post,
  Get,
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
import { ChatDto } from './dto/chat.dto';

@ApiTags('AI 助手')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
