import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { WishlistsService } from './wishlists.service';
import { WishlistsController } from './wishlists.controller';
import { DishesModule } from '../dishes/dishes.module';

@Module({
  imports: [DishesModule, AuthModule],
  providers: [WishlistsService],
  controllers: [WishlistsController],
  exports: [WishlistsService],
})
export class WishlistsModule {}
