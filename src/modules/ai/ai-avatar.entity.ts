import { Entity, PrimaryColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('ai_avatars')
export class AiAvatar {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36, unique: true })
  user_id: string;

  @Column({ type: 'text' })
  avatar_url: string;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.aiAvatars)
  @JoinColumn({ name: 'user_id' })
  user: User;
}