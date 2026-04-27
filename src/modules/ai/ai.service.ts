import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiAvatar } from './ai-avatar.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AiService {
  constructor(
    @InjectRepository(AiAvatar)
    private aiAvatarsRepository: Repository<AiAvatar>,
  ) {}

  /**
   * 获取用户AI头像
   * @param userId 用户ID
   */
  async getUserAvatar(userId: string) {
    return this.aiAvatarsRepository.findOne({
      where: { user_id: userId },
    });
  }

  /**
   * 更新用户AI头像
   * @param userId 用户ID
   * @param avatarUrl 头像URL
   */
  async updateAvatar(userId: string, avatarUrl: string) {
    let avatar = await this.aiAvatarsRepository.findOne({
      where: { user_id: userId },
    });

    if (avatar) {
      avatar.avatar_url = avatarUrl;
    } else {
      avatar = this.aiAvatarsRepository.create({
        id: uuidv4(),
        user_id: userId,
        avatar_url: avatarUrl,
      });
    }

    return this.aiAvatarsRepository.save(avatar);
  }

  /**
   * AI对话（模拟）
   * @param message 用户消息
   */
  async chat(message: string) {
    // 这里可以集成真实的AI服务
    // 目前返回模拟响应
    const responses = [
      '您好！我是您的私厨助手，有什么可以帮您的吗？',
      '今天推荐您尝试我们的招牌菜——北京烤鸭，皮酥肉嫩，非常美味！',
      '如果您想吃清淡一点的，可以试试我们的凉拌黄瓜，清爽开胃。',
      '需要我帮您推荐适合家庭聚餐的菜品吗？',
      '我们的蛋挞非常受欢迎，外皮酥脆，内馅香滑，要不要来一份？',
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      reply: randomResponse,
      timestamp: new Date().toISOString(),
    };
  }
}