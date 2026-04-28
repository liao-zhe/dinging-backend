import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UploadModule } from '../upload/upload.module';
import { DishesService } from './dishes.service';
import { DishesController } from './dishes.controller';
import { Dish } from './dish.entity';
import { Category } from './category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Dish, Category]), AuthModule, UploadModule],
  providers: [DishesService],
  controllers: [DishesController],
  exports: [DishesService],
})
export class DishesModule {}
