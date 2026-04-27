import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { DishesModule } from './modules/dishes/dishes.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WishlistsModule } from './modules/wishlists/wishlists.module';
import { AiModule } from './modules/ai/ai.module';
import { UploadModule } from './modules/upload/upload.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // 数据库连接
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
        synchronize: false, // 生产环境设为false
        logging: true,
      }),
    }),

    // 业务模块
    UsersModule,
    DishesModule,
    OrdersModule,
    WishlistsModule,
    AiModule,
    UploadModule,
  ],
})
export class AppModule {}
