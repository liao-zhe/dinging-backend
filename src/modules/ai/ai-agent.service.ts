import { Injectable, Logger } from '@nestjs/common';
import { AiToolsService } from './ai-tools.service';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { Message, ToolCall } from './providers/llm-provider.interface';

export interface AgentResult {
  content: string;
  toolCalls?: ToolCall[];
  dishes?: any[];  // 推荐的菜品列表
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly toolsService: AiToolsService,
    private readonly llmFactory: LLMProviderFactory,
  ) {}

  private collectDishesFromToolResult(result: any, target: any[]) {
    if (!result.success || !result.data) {
      return;
    }

    if (Array.isArray(result.data)) {
      if (result.type === 'dish' || result.type === 'recommendation') {
        target.push(...result.data);
      }
      return;
    }

    if (result.data.id && (result.type === 'dish' || result.type === 'recommendation')) {
      target.push(result.data);
    }
  }

  private filterMentionedDishes(content: string, dishes: any[]) {
    if (!dishes.length) {
      return undefined;
    }

    const uniqueDishes = dishes.filter(
      (dish, index, list) => list.findIndex((item) => item.id === dish.id) === index,
    );
    const mentionedDishes = uniqueDishes.filter(
      (dish) => dish.name && content.includes(dish.name),
    );

    return mentionedDishes.length > 0 ? mentionedDishes.slice(0, 6) : undefined;
  }

  private removeToolCallMarkup(content: string): string {
    return content
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, '')
      .replace(/<tool_call>[\s\S]*$/g, '')
      .replace(/<\/?tool_call>/g, '')
      .replace(/\{\s*["']name["']\s*:\s*["'][^"']+["']\s*,\s*["']arguments["']\s*:\s*\{[\s\S]*?\}\s*\}/g, '')
      .trim();
  }

  // 执行 Agent 调用（带 Function Calling）
  async runAgent(
    messages: Message[],
    userId?: string,
  ): Promise<AgentResult> {
    const provider = this.llmFactory.getProvider();
    const tools = this.toolsService.getToolDefinitions();

    // 第一次调用 LLM
    const response = await provider.chat({
      messages,
      tools,
    });

    // 如果没有工具调用，直接返回文本
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        content: this.removeToolCallMarkup(response.content),
      };
    }

    this.logger.log(`Agent received ${response.toolCalls.length} tool calls`);

    // 执行工具调用
    const toolResults: any[] = [];
    const allDishes: any[] = [];

    for (const toolCall of response.toolCalls) {
      const functionName = toolCall.function.name;
      let args: Record<string, any> = {};

      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        this.logger.warn(`Failed to parse tool arguments: ${toolCall.function.arguments}`);
      }

      const result = await this.toolsService.executeTool(functionName, args, userId);

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(result),
      });

      // 收集菜品数据
      this.collectDishesFromToolResult(result, allDishes);
    }

    // 将工具调用和结果添加到消息历史
    const updatedMessages: Message[] = [
      ...messages,
      {
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.toolCalls,
      },
      ...toolResults,
    ];

    // 第二次调用 LLM，获取最终回复
    const finalResponse = await provider.chat({
      messages: updatedMessages,
    });
    const finalContent = this.removeToolCallMarkup(finalResponse.content);

    return {
      content: finalContent,
      toolCalls: response.toolCalls,
      dishes: this.filterMentionedDishes(finalContent, allDishes),
    };
  }

  // 流式执行 Agent 调用
  async *runAgentStream(
    messages: Message[],
    userId?: string,
  ): AsyncIterable<{
    type: 'text' | 'tool_call' | 'dishes' | 'done';
    content?: string;
    toolCalls?: ToolCall[];
    dishes?: any[];
  }> {
    const provider = this.llmFactory.getProvider();
    const tools = this.toolsService.getToolDefinitions();

    // 第一次调用 LLM（流式）
    let responseContent = '';
    let toolCalls: ToolCall[] = [];

    const stream = provider.chatStream({
      messages,
      tools,
    });

    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.content) {
        responseContent += chunk.content;
      }
      if (chunk.type === 'tool_call' && chunk.toolCalls) {
        toolCalls = chunk.toolCalls;
        yield { type: 'tool_call', toolCalls };
      }
    }

    // 如果没有工具调用，直接完成
    if (toolCalls.length === 0) {
      const cleanContent = this.removeToolCallMarkup(responseContent);
      if (cleanContent) {
        yield { type: 'text', content: cleanContent };
      }
      yield { type: 'done' };
      return;
    }

    this.logger.log(`Agent stream received ${toolCalls.length} tool calls`);

    // 执行工具调用
    const toolResults: any[] = [];
    const allDishes: any[] = [];

    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      let args: Record<string, any> = {};

      try {
        args = JSON.parse(toolCall.function.arguments || '{}');
      } catch (e) {
        this.logger.warn(`Failed to parse tool arguments: ${toolCall.function.arguments}`);
      }

      const result = await this.toolsService.executeTool(functionName, args, userId);

      toolResults.push({
        tool_call_id: toolCall.id,
        role: 'tool',
        content: JSON.stringify(result),
      });

      // 收集菜品数据
      this.collectDishesFromToolResult(result, allDishes);
    }

    // 返回菜品数据
    // 将工具调用和结果添加到消息历史
    const updatedMessages: Message[] = [
      ...messages,
      {
        role: 'assistant',
        content: responseContent || '',
        tool_calls: toolCalls,
      },
      ...toolResults,
    ];

    // 第二次调用 LLM（流式），获取最终回复
    const finalStream = provider.chatStream({
      messages: updatedMessages,
    });

    let finalContent = '';
    for await (const chunk of finalStream) {
      if (chunk.type === 'text' && chunk.content) {
        finalContent += chunk.content;
        yield { type: 'text', content: chunk.content };
      }
    }

    const cleanFinalContent = this.removeToolCallMarkup(finalContent);
    const mentionedDishes = this.filterMentionedDishes(cleanFinalContent, allDishes);
    if (mentionedDishes?.length) {
      yield { type: 'dishes', dishes: mentionedDishes };
    }

    yield { type: 'done' };
  }
}
