import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Order } from '../orders/order.entity';
import { Wishlist } from '../wishlists/wishlist.entity';
import { AiAvatar } from '../ai/ai-avatar.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  openid: string;

  @Column({ length: 50, nullable: true, unique: true })
  username: string;

  @Column({ length: 50, nullable: true })
  nickname: string;

  @Column({ type: 'text', nullable: true })
  avatar_url: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'text', nullable: true })
  password_hash: string;

  @Column({ length: 20, default: 'customer' })
  role: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => AiAvatar, aiAvatar => aiAvatar.user)
  aiAvatars: AiAvatar[];
}
