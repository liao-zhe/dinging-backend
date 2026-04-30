import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LLMProvider,
  ChatParams,
  ChatResponse,
  StreamChunk,
  Message,
  Tool,
} from './llm-provider.interface';

@Injectable()
export class AnthropicProvider implements LLMProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    this.baseUrl = this.configService.get<string>('ANTHROPIC_BASE_URL', 'https://api.anthropic.com');
    this.model = this.configService.get<string>('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022');
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const body = this.buildRequestBody(params, false);

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Anthropic API error: ${response.status} - ${error}`);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('');

    const toolCalls = data.content
      .filter((c: any) => c.type === 'tool_use')
      .map((c: any) => ({
        id: c.id,
        type: 'function' as const,
        function: {
          name: c.name,
          arguments: JSON.stringify(c.input),
        },
      }));

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        prompt_tokens: data.usage?.input_tokens || 0,
        completion_tokens: data.usage?.output_tokens || 0,
        total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  }

  async *chatStream(params: ChatParams): AsyncIterable<StreamChunk> {
    const body = this.buildRequestBody(params, true);

    const response = await fetch(`${this.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`Anthropic API error: ${response.status} - ${error}`);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCall: any = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();

        try {
          const parsed = JSON.parse(data);

          switch (parsed.type) {
            case 'content_block_start':
              if (parsed.content_block?.type === 'tool_use') {
                currentToolCall = {
                  id: parsed.content_block.id,
                  type: 'function',
                  function: {
                    name: parsed.content_block.name,
                    arguments: '',
                  },
                };
              }
              break;

            case 'content_block_delta':
              if (parsed.delta?.type === 'text_delta') {
                yield { type: 'text', content: parsed.delta.text };
              }
              if (parsed.delta?.type === 'input_json_delta') {
                if (currentToolCall) {
                  currentToolCall.function.arguments += parsed.delta.partial_json;
                }
              }
              break;

            case 'content_block_stop':
              if (currentToolCall) {
                yield { type: 'tool_call', toolCalls: [currentToolCall] };
                currentToolCall = null;
              }
              break;

            case 'message_delta':
              if (parsed.usage) {
                yield {
                  type: 'done',
                  usage: {
                    prompt_tokens: parsed.usage.input_tokens || 0,
                    completion_tokens: parsed.usage.output_tokens || 0,
                    total_tokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0),
                  },
                };
              }
              break;
          }
        } catch (e) {
          this.logger.warn(`Failed to parse SSE data: ${data}`);
        }
      }
    }
  }

  private buildRequestBody(params: ChatParams, stream: boolean) {
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const otherMessages = params.messages
      .filter((m) => m.role !== 'system')
      .map((m) => {
        const msg: any = { role: m.role, content: m.content };
        if (m.tool_call_id) {
          msg.role = 'user';
          msg.content = [
            {
              type: 'tool_result',
              tool_use_id: m.tool_call_id,
              content: m.content,
            },
          ];
        }
        if (m.tool_calls) {
          msg.role = 'assistant';
          msg.content = m.tool_calls.map((tc) => ({
            type: 'tool_use',
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments),
          }));
        }
        return msg;
      });

    const body: any = {
      model: this.model,
      messages: otherMessages,
      max_tokens: params.maxTokens || 4096,
      stream,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    return body;
  }
}
