import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Category } from './category.entity';

@Entity('dishes')
export class Dish {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  category_id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({ length: 50, nullable: true })
  tag: string;

  @Column({ type: 'tinyint', default: 1 })
  is_active: number;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Category, category => category.dishes)
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
