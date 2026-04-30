import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([ChatSession, ChatMessage])],
  controllers: [AiController],
  providers: [
    AiService,
    OpenAIProvider,
    AnthropicProvider,
    LLMProviderFactory,
  ],
  exports: [AiService],
})
export class AiModule {}
