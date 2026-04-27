import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('wishlists')
export class Wishlist {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  user_id: string;

  @Column({ length: 100 })
  dish_name: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, user => user.wishlists)
  @JoinColumn({ name: 'user_id' })
  user: User;
}