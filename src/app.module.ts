import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from './modules/ai/ai.module';
import { AuthModule } from './modules/auth/auth.module';
import { DishesModule } from './modules/dishes/dishes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UploadModule } from './modules/upload/upload.module';
import { UsersModule } from './modules/users/users.module';
import { WishlistsModule } from './modules/wishlists/wishlists.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST', '127.0.0.1'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get('DB_USERNAME', 'root'),
        password: configService.get('DB_PASSWORD', 'root123'),
        database: configService.get('DB_DATABASE', 'homechef'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        logging: true,
      }),
    }),
    AuthModule,
    UsersModule,
    DishesModule,
    OrdersModule,
    WishlistsModule,
    AiModule,
    UploadModule,
  ],
})
export class AppModule {}
