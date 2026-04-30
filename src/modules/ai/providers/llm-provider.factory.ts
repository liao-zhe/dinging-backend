import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './openai.provider';
import { AnthropicProvider } from './anthropic.provider';
import { LLMProvider } from './llm-provider.interface';

@Injectable()
export class LLMProviderFactory {
  private readonly logger = new Logger(LLMProviderFactory.name);
  private readonly provider: LLMProvider;

  constructor(
    private configService: ConfigService,
    private openaiProvider: OpenAIProvider,
    private anthropicProvider: AnthropicProvider,
  ) {
    const providerName = this.configService.get<string>('LLM_PROVIDER', 'openai');
    this.logger.log(`Initializing LLM provider: ${providerName}`);

    switch (providerName) {
      case 'anthropic':
        this.provider = this.anthropicProvider;
        break;
      case 'openai':
      default:
        this.provider = this.openaiProvider;
        break;
    }
  }

  getProvider(): LLMProvider {
    return this.provider;
  }
}
