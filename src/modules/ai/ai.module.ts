import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { AiAvatar } from './ai-avatar.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiAvatar])],
  providers: [AiService],
  controllers: [AiController],
  exports: [AiService],
})
export class AiModule {}