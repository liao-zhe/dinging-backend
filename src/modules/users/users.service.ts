import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
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
    await this.usersRepository.update(id, data);
    return this.findById(id);
  }

  async findOrCreate(openid: string, data: Partial<User> = {}): Promise<User> {
    let user = await this.findByOpenid(openid);
    if (!user) {
      user = await this.create({ openid, ...data });
    } else if (Object.keys(data).length > 0) {
      user = await this.update(user.id, data);
    }
    return user;
  }
}
