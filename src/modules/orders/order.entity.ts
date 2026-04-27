import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  user_id: string;

  @Column({ length: 20, unique: true })
  order_no: string;

  @Column({ type: 'date' })
  order_date: Date;

  @Column({ length: 20 })
  meal_type: string;

  @Column({ type: 'int' })
  people_count: number;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, user => user.orders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  items: OrderItem[];
}
