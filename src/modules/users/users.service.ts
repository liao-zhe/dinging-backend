import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findByOpenid(openid: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { openid } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const nextData = { ...data };
    if (Object.prototype.hasOwnProperty.call(nextData, 'phone')) {
      nextData.phone = this.normalizePhone(nextData.phone);
    }

    await this.usersRepository.update(id, nextData);
    return this.findById(id);
  }

  async findOrCreate(openid: string, data: Partial<User> = {}): Promise<User> {
    const normalizedPhone = this.normalizePhone(data.phone);
    const nextData: Partial<User> = {
      ...data,
      phone: normalizedPhone,
    };

    let user = await this.findByOpenid(openid);
    if (!user) {
      user = await this.create({ openid, ...nextData });
    } else if (Object.keys(nextData).some((key) => nextData[key] !== undefined)) {
      user = await this.update(user.id, nextData);
    }

    return user;
  }

  private normalizePhone(phone?: string): string | null {
    if (!phone) {
      return null;
    }

    const digits = phone.replace(/\D/g, '');
    return digits || null;
  }
}
