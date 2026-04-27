import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用CORS
  app.enableCors();

  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // API前缀
  app.setGlobalPrefix('api');

  // Swagger文档
  const config = new DocumentBuilder()
    .setTitle('家庭私厨API')
    .setDescription('家庭私厨小程序后端接口文档')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 服务启动成功: http://localhost:${port}`);
  console.log(`📚 API文档: http://localhost:${port}/docs`);
}

bootstrap();
