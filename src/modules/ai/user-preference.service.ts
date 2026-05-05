import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class UserPreferenceService {
  private readonly logger = new Logger(UserPreferenceService.name);

  constructor(
    @InjectRepository(UserPreference)
    private preferenceRepository: Repository<UserPreference>,
  ) {}

  // 获取用户偏好
  async getPreference(userId: string): Promise<UserPreference | null> {
    return this.preferenceRepository.findOne({
      where: { user_id: userId },
    });
  }

  // 创建或更新用户偏好
  async upsertPreference(
    userId: string,
    data: Partial<UserPreference>,
  ): Promise<UserPreference> {
    let preference = await this.getPreference(userId);

    if (preference) {
      // 更新现有偏好
      Object.assign(preference, data);
      preference.updated_at = new Date();
    } else {
      // 创建新偏好
      preference = this.preferenceRepository.create({
        id: uuidv4(),
        user_id: userId,
        ...data,
      });
    }

    return this.preferenceRepository.save(preference);
  }

  // 从对话中提取偏好信息
  extractPreferenceFromMessage(message: string): Partial<UserPreference> | null {
    const preferences: Partial<UserPreference> = {};
    let hasUpdate = false;

    // 检测饮食限制
    const vegetarianKeywords = ['素食', '吃素', '不吃肉', 'vegetarian'];
    const noSpicyKeywords = ['不吃辣', '不要辣', '清淡', 'no spicy'];
    const restrictions: string[] = [];

    for (const keyword of vegetarianKeywords) {
      if (message.includes(keyword)) {
        restrictions.push('素食');
        break;
      }
    }

    for (const keyword of noSpicyKeywords) {
      if (message.includes(keyword)) {
        restrictions.push('不吃辣');
        break;
      }
    }

    if (restrictions.length > 0) {
      preferences.dietary_restrictions = restrictions.join('、');
      hasUpdate = true;
    }

    // 检测口味偏好
    const tasteKeywords = ['清淡', '重口', '微辣', '中辣', '特辣', '酸甜', '咸鲜'];
    for (const taste of tasteKeywords) {
      if (message.includes(taste)) {
        preferences.taste_preferences = taste;
        hasUpdate = true;
        break;
      }
    }

    // 检测用餐人数
    const peopleMatch = message.match(/(\d+)\s*[个人人]/);
    if (peopleMatch) {
      preferences.typical_people_count = parseInt(peopleMatch[1]);
      hasUpdate = true;
    }

    return hasUpdate ? preferences : null;
  }

  // 格式化偏好为文本
  formatPreferenceText(preference: UserPreference | null): string {
    if (!preference) {
      return '';
    }

    const parts: string[] = [];

    if (preference.dietary_restrictions) {
      parts.push(`饮食限制：${preference.dietary_restrictions}`);
    }

    if (preference.taste_preferences) {
      parts.push(`口味偏好：${preference.taste_preferences}`);
    }

    if (preference.favorite_cuisines) {
      parts.push(`喜爱菜系：${preference.favorite_cuisines}`);
    }

    if (preference.allergies) {
      parts.push(`过敏源：${preference.allergies}`);
    }

    if (preference.typical_people_count > 0) {
      parts.push(`通常用餐人数：${preference.typical_people_count}人`);
    }

    if (preference.notes) {
      parts.push(`备注：${preference.notes}`);
    }

    return parts.length > 0 ? `用户偏好信息：\n${parts.join('\n')}` : '';
  }
}
