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
        content: response.content,
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
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          allDishes.push(...result.data);
        } else if (result.data.id) {
          allDishes.push(result.data);
        }
      }
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

    return {
      content: finalResponse.content,
      toolCalls: response.toolCalls,
      dishes: allDishes.length > 0 ? allDishes : undefined,
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
        yield { type: 'text', content: chunk.content };
      }
      if (chunk.type === 'tool_call' && chunk.toolCalls) {
        toolCalls = chunk.toolCalls;
        yield { type: 'tool_call', toolCalls };
      }
    }

    // 如果没有工具调用，直接完成
    if (toolCalls.length === 0) {
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
      if (result.success && result.data) {
        if (Array.isArray(result.data)) {
          allDishes.push(...result.data);
        } else if (result.data.id) {
          allDishes.push(result.data);
        }
      }
    }

    // 返回菜品数据
    if (allDishes.length > 0) {
      yield { type: 'dishes', dishes: allDishes };
    }

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

    for await (const chunk of finalStream) {
      if (chunk.type === 'text' && chunk.content) {
        yield { type: 'text', content: chunk.content };
      }
    }

    yield { type: 'done' };
  }
}
