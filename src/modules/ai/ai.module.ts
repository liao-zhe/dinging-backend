import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiAgentService } from './ai-agent.service';
import { AiToolsService } from './ai-tools.service';
import { UserPreferenceService } from './user-preference.service';
import { ChatSession } from './entities/chat-session.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { UserPreference } from './entities/user-preference.entity';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { LLMProviderFactory } from './providers/llm-provider.factory';
import { AuthModule } from '../auth/auth.module';
import { DishesModule } from '../dishes/dishes.module';
import { WishlistsModule } from '../wishlists/wishlists.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([ChatSession, ChatMessage, UserPreference]),
    DishesModule,
    WishlistsModule,
    OrdersModule,
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiAgentService,
    AiToolsService,
    UserPreferenceService,
    OpenAIProvider,
    AnthropicProvider,
    LLMProviderFactory,
  ],
  exports: [AiService],
})
export class AiModule {}
