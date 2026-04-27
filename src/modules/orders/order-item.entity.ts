import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { Dish } from '../dishes/dish.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  order_id: string;

  @Column({ length: 36 })
  dish_id: string;

  @Column({ length: 100 })
  dish_name: string;

  @Column({ type: 'text', nullable: true })
  dish_image: string;

  @Column({ type: 'int' })
  quantity: number;

  @ManyToOne(() => Order, order => order.items)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => Dish)
  @JoinColumn({ name: 'dish_id' })
  dish: Dish;
}
