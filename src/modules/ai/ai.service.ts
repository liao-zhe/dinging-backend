import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { Message, Tool } from './providers/llm-provider.interface';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly systemPrompt = `你是"哲哲私厨"的菜品助手，名叫小厨。

## 你的职责
- 根据用户需求推荐合适的菜品
- 回答关于菜品的问题（食材、口味、分量等）
- 帮用户搭配合理的菜单
- 基于用户收藏和历史订单给出个性化建议

## 回复规范
- 语气亲切自然，像朋友推荐一样
- 推荐菜品时必须基于真实数据，不要编造
- 推荐时附上价格和简要特点
- 菜单搭配建议：荤素比例约 2:1，适当搭配汤品
- 3-4人建议 2荤1素1汤，5-6人建议 3荤2素1汤

## 限制
- 只讨论与菜品相关的话题
- 不处理订单操作（引导用户去订单页）
- 不透露价格成本等内部信息
- 遇到不确定的问题，建议用户联系客服`;

  constructor(
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    private llmFactory: LLMProviderFactory,
  ) {}

  async chat(userId: string, dto: ChatDto) {
    const { session_id, content } = dto;

    // 获取或创建会话
    let session: ChatSession;
    if (session_id) {
      session = await this.sessionRepository.findOne({
        where: { id: session_id, user_id: userId },
      });
      if (!session) {
        throw new NotFoundException('会话不存在');
      }
    } else {
      session = this.sessionRepository.create({
        id: uuidv4(),
        user_id: userId,
        title: content.substring(0, 50),
      });
      await this.sessionRepository.save(session);
    }

    // 保存用户消息
    const userMessage = this.messageRepository.create({
      id: uuidv4(),
      user_id: userId,
      session_id: session.id,
      role: 'user',
      content,
    });
    await this.messageRepository.save(userMessage);

    // 获取历史消息（最近10条）
    const history = await this.messageRepository.find({
      where: { session_id: session.id },
      order: { created_at: 'ASC' },
      take: 10,
    });

    // 构建消息数组
    const messages: Message[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        tool_calls: m.tool_calls,
      })),
    ];

    // 调用 LLM
    const provider = this.llmFactory.getProvider();
    const response = await provider.chat({ messages });

    // 保存 AI 回复
    const assistantMessage = this.messageRepository.create({
      id: uuidv4(),
      user_id: userId,
      session_id: session.id,
      role: 'assistant',
      content: response.content,
      tool_calls: response.toolCalls || null,
    });
    await this.messageRepository.save(assistantMessage);

    // 更新会话
    session.message_count = history.length + 2;
    session.last_message_at = new Date();
    await this.sessionRepository.save(session);

    return {
      session_id: session.id,
      content: response.content,
      usage: response.usage,
    };
  }

  async chatStream(userId: string, dto: ChatDto) {
    const { session_id, content } = dto;

    // 获取或创建会话
    let session: ChatSession;
    if (session_id) {
      session = await this.sessionRepository.findOne({
        where: { id: session_id, user_id: userId },
      });
      if (!session) {
        throw new NotFoundException('会话不存在');
      }
    } else {
      session = this.sessionRepository.create({
        id: uuidv4(),
        user_id: userId,
        title: content.substring(0, 50),
      });
      await this.sessionRepository.save(session);
    }

    // 保存用户消息
    const userMessage = this.messageRepository.create({
      id: uuidv4(),
      user_id: userId,
      session_id: session.id,
      role: 'user',
      content,
    });
    await this.messageRepository.save(userMessage);

    // 获取历史消息
    const history = await this.messageRepository.find({
      where: { session_id: session.id },
      order: { created_at: 'ASC' },
      take: 10,
    });

    // 构建消息数组
    const messages: Message[] = [
      { role: 'system', content: this.systemPrompt },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        tool_calls: m.tool_calls,
      })),
    ];

    // 调用 LLM 流式接口
    const provider = this.llmFactory.getProvider();
    const stream = provider.chatStream({ messages });

    // 收集完整回复
    let fullContent = '';
    let toolCalls: any[] = [];

    return {
      session_id: session.id,
      stream: this.createStreamResponse(stream, async (chunk) => {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
        }
        if (chunk.type === 'tool_call' && chunk.toolCalls) {
          toolCalls = chunk.toolCalls;
        }
        if (chunk.type === 'done') {
          // 保存 AI 回复
          const assistantMessage = this.messageRepository.create({
            id: uuidv4(),
            user_id: userId,
            session_id: session.id,
            role: 'assistant',
            content: fullContent,
            tool_calls: toolCalls.length > 0 ? toolCalls : null,
          });
          await this.messageRepository.save(assistantMessage);

          // 更新会话
          session.message_count = history.length + 2;
          session.last_message_at = new Date();
          await this.sessionRepository.save(session);
        }
      }),
    };
  }

  private async createStreamResponse(
    stream: AsyncIterable<any>,
    onChunk: (chunk: any) => Promise<void>,
  ) {
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];

    for await (const chunk of stream) {
      await onChunk(chunk);
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      chunks.push(encoder.encode(data));
    }

    return chunks;
  }

  async getSessions(userId: string) {
    return this.sessionRepository.find({
      where: { user_id: userId },
      order: { last_message_at: 'DESC' },
    });
  }

  async getMessages(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    return this.messageRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
    });
  }

  async deleteSession(userId: string, sessionId: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, user_id: userId },
    });

    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    await this.messageRepository.delete({ session_id: sessionId });
    await this.sessionRepository.remove(session);

    return { success: true };
  }
}
