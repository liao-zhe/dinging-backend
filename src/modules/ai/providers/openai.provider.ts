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
export class OpenAIProvider implements LLMProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.baseUrl = this.configService.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    this.model = this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async chat(params: ChatParams): Promise<ChatResponse> {
    const body = this.buildRequestBody(params, false);
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenAI API error: ${response.status} - ${error}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      toolCalls: choice.message.tool_calls,
      usage: data.usage,
    };
  }

  async *chatStream(params: ChatParams): AsyncIterable<StreamChunk> {
    const body = this.buildRequestBody(params, true);

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`OpenAI API error: ${response.status} - ${error}`);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let currentToolCalls: any[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          yield { type: 'done' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices[0]?.delta;

          if (delta?.content) {
            yield { type: 'text', content: delta.content };
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const index = tc.index || 0;
              if (!currentToolCalls[index]) {
                currentToolCalls[index] = {
                  id: tc.id || '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              if (tc.id) currentToolCalls[index].id = tc.id;
              if (tc.function?.name) currentToolCalls[index].function.name += tc.function.name;
              if (tc.function?.arguments) currentToolCalls[index].function.arguments += tc.function.arguments;
            }
          }

          if (parsed.choices[0]?.finish_reason === 'tool_calls') {
            yield { type: 'tool_call', toolCalls: currentToolCalls };
            currentToolCalls = [];
          }

          if (parsed.choices[0]?.finish_reason === 'stop') {
            if (parsed.usage) {
              yield { type: 'done', usage: parsed.usage };
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse SSE data: ${data}`);
        }
      }
    }
  }

  private buildRequestBody(params: ChatParams, stream: boolean) {
    const messages = params.messages.map((m) => {
      const msg: any = { role: m.role, content: m.content };
      if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
      if (m.tool_calls) msg.tool_calls = m.tool_calls;
      return msg;
    });

    const body: any = {
      model: this.model,
      messages,
      temperature: params.temperature ?? 0.7,
      stream,
    };

    if (params.tools && params.tools.length > 0) {
      body.tools = params.tools;
    }

    if (params.maxTokens) {
      body.max_tokens = params.maxTokens;
    }

    return body;
  }
}
