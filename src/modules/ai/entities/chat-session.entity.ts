import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('chat_sessions')
@Index('idx_user_id', ['user_id'])
@Index('idx_last_message', ['last_message_at'])
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  user_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'int', default: 0 })
  message_count: number;

  @Column({ type: 'timestamp', nullable: true })
  last_message_at: Date;

  @CreateDateColumn()
  created_at: Date;
}
