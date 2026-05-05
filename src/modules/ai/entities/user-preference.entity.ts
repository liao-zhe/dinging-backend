import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryColumn({ length: 36 })
  id: string;

  @Column({ length: 36 })
  user_id: string;

  @Column({ type: 'text', nullable: true })
  dietary_restrictions: string; // 饮食限制（如：素食、不吃辣）

  @Column({ type: 'text', nullable: true })
  favorite_cuisines: string; // 喜爱的菜系

  @Column({ type: 'text', nullable: true })
  allergies: string; // 过敏源

  @Column({ type: 'text', nullable: true })
  taste_preferences: string; // 口味偏好（如：清淡、重口）

  @Column({ type: 'int', default: 0 })
  typical_people_count: number; // 通常用餐人数

  @Column({ type: 'text', nullable: true })
  notes: string; // 其他备注

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
