import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Dish } from './dish.entity';

@Entity('categories')
export class Category {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Dish, dish => dish.category)
  dishes: Dish[];
}