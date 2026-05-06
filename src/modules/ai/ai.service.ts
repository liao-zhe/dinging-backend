import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { Message } from './providers/llm-provider.interface';
import { ChatDto } from './dto/chat.dto';
import { AiAgentService } from './ai-agent.service';
import { UserPreferenceService } from './user-preference.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly MAX_CONTEXT_MESSAGES = 20; // 最大上下文消息数
  private readonly SUMMARY_THRESHOLD = 15; // 触发摘要的消息数阈值

  constructor(
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    private llmFactory: LLMProviderFactory,
    private agentService: AiAgentService,
    private preferenceService: UserPreferenceService,
  ) {}

  // 构建系统提示词（包含用户偏好）
  private async buildSystemPrompt(userId: string): Promise<string> {
    const preference = await this.preferenceService.getPreference(userId);
    const preferenceText = this.preferenceService.formatPreferenceText(preference);

    return `你是"哲哲私厨"的菜品助手，名叫小厨。

## 你的职责
- 根据用户需求推荐合适的菜品
- 回答关于菜品的问题（食材、口味、分量等）
- 帮用户搭配合理的菜单
- 基于用户收藏和历史订单给出个性化建议

## 工具使用
你有以下工具可以使用：
1. search_dishes - 搜索菜品
2. get_dish_detail - 获取菜品详情
3. get_all_categories - 获取所有分类
4. get_user_wishlist - 获取用户心愿单
5. get_recent_orders - 获取最近订单
6. recommend_dishes - 智能推荐菜品

当用户询问菜品相关问题时，优先使用工具获取真实数据，不要编造菜品信息。

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
- 遇到不确定的问题，建议用户联系客服

${preferenceText ? `\n## 用户偏好\n${preferenceText}\n请根据用户偏好提供个性化推荐。` : ''}`;
  }

  // 获取优化后的上下文消息
  private async getContextMessages(
    sessionId: string,
    userId: string,
  ): Promise<Message[]> {
    const systemPrompt = await this.buildSystemPrompt(userId);

    // 获取历史消息
    const history = await this.messageRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
    });

    // 如果消息数量超过阈值，进行截断（保留最近的消息）
    let messages = history;
    if (history.length > this.MAX_CONTEXT_MESSAGES) {
      messages = history.slice(-this.MAX_CONTEXT_MESSAGES);
    }

    return [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
        tool_calls: m.tool_calls,
      })),
    ];
  }

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

    // 尝试从消息中提取用户偏好
    const extractedPreferences = this.preferenceService.extractPreferenceFromMessage(content);
    if (extractedPreferences) {
      await this.preferenceService.upsertPreference(userId, extractedPreferences);
      this.logger.log(`Updated user preferences for ${userId}: ${JSON.stringify(extractedPreferences)}`);
    }

    // 获取上下文消息
    const messages = await this.getContextMessages(session.id, userId);

    // 使用 Agent 执行调用
    const agentResult = await this.agentService.runAgent(messages, userId);

    // 保存 AI 回复
    const assistantMessage = this.messageRepository.create({
      id: uuidv4(),
      user_id: userId,
      session_id: session.id,
      role: 'assistant',
      content: agentResult.content,
      tool_calls: agentResult.toolCalls || null,
    });
    await this.messageRepository.save(assistantMessage);

    // 更新会话
    const messageCount = await this.messageRepository.count({
      where: { session_id: session.id },
    });
    session.message_count = messageCount;
    session.last_message_at = new Date();
    await this.sessionRepository.save(session);

    return {
      session_id: session.id,
      content: agentResult.content,
      dishes: agentResult.dishes,
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

    // 尝试从消息中提取用户偏好
    const extractedPreferences = this.preferenceService.extractPreferenceFromMessage(content);
    if (extractedPreferences) {
      await this.preferenceService.upsertPreference(userId, extractedPreferences);
    }

    // 获取上下文消息
    const messages = await this.getContextMessages(session.id, userId);

    // 使用 Agent 流式执行
    let fullContent = '';
    let toolCalls: any[] = [];
    let dishes: any[] = [];

    return {
      session_id: session.id,
      stream: this.createAgentStreamResponse(
        this.agentService.runAgentStream(messages, userId),
        async (chunk) => {
          if (chunk.type === 'text' && chunk.content) {
            fullContent += chunk.content;
          }
          if (chunk.type === 'tool_call' && chunk.toolCalls) {
            toolCalls = chunk.toolCalls;
          }
          if (chunk.type === 'dishes' && chunk.dishes) {
            dishes = chunk.dishes;
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
            const messageCount = await this.messageRepository.count({
              where: { session_id: session.id },
            });
            session.message_count = messageCount;
            session.last_message_at = new Date();
            await this.sessionRepository.save(session);
          }
        },
      ),
      dishes,
    };
  }

  private async *createAgentStreamResponse(
    stream: AsyncIterable<any>,
    onChunk: (chunk: any) => Promise<void>,
  ): AsyncGenerator<Uint8Array> {
    const encoder = new TextEncoder();

    for await (const chunk of stream) {
      await onChunk(chunk);
      const data = `data: ${JSON.stringify(chunk)}\n\n`;
      yield encoder.encode(data);
    }
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
