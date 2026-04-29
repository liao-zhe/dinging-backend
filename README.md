# 哲哲私厨 Backend

哲哲私厨小程序后端，基于 `NestJS + TypeScript + MySQL + TypeORM`。

当前项目已包含：

- 微信登录与 JWT 鉴权
- 用户信息管理
- 菜品与分类管理
- 订单创建、取消、查询、确认
- 心愿单管理
- 图片上传到 MinIO
- AI 头像相关接口
- Swagger 接口文档

## 技术栈

- `NestJS`
- `TypeScript`
- `TypeORM`
- `MySQL`
- `JWT`
- `MinIO`

## 目录结构

```text
src/
  modules/
    ai/
    auth/
    dishes/
    orders/
    upload/
    users/
    wishlists/
dist/
init-database.sql
.env.example
```

## 环境要求

- `Node.js` 18+
- `MySQL` 8.0+
- 可用的 `MinIO` 服务

## 安装依赖

```bash
npm install
```

## 环境变量

项目已提供 `.env.example`。

1. 复制一份为 `.env`
2. 按实际环境填写配置

主要配置项：

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `JWT_SECRET`
- `PORT`
- `NODE_ENV`
- `WECHAT_APPID`
- `WECHAT_SECRET`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `MINIO_PUBLIC_URL`

## 数据库初始化

先创建数据库，例如：

```sql
CREATE DATABASE homechef CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

然后执行初始化脚本：

```bash
mysql -u root -p homechef < init-database.sql
```

这个脚本会创建以下表：

- `users`
- `categories`
- `dishes`
- `orders`
- `order_items`
- `wishlists`
- `ai_avatars`

并插入默认分类与示例菜品数据。

## 启动项目

开发模式：

```bash
npm run start:dev
```

生产构建：

```bash
npm run build
npm run start:prod
```

默认启动端口：

```text
http://localhost:3000
```

## 接口文档

启动后可访问 Swagger：

```text
http://localhost:3000/docs
```

接口统一前缀为：

```text
/api
```

## 主要接口模块

认证：

- `POST /api/auth/login`
- `GET /api/auth/check`
- `POST /api/auth/logout`

用户：

- `GET /api/user/profile`
- `PUT /api/user/profile`

菜品：

- `GET /api/dishes/categories`
- `GET /api/dishes`
- `GET /api/dishes/:id`
- `GET /api/dishes/category/:categoryId`
- `GET /api/dishes/search`
- `POST /api/dishes`
- `PUT /api/dishes/:id`
- `DELETE /api/dishes/:id`

订单：

- `POST /api/orders`
- `GET /api/orders`
- `GET /api/orders/:id`
- `PUT /api/orders/:id/cancel`
- `DELETE /api/orders/:id`
- `GET /api/orders/admin/all`
- `PUT /api/orders/admin/:id/status`

心愿单：

- `GET /api/wishlists`
- `POST /api/wishlists`
- `PUT /api/wishlists/:id`
- `DELETE /api/wishlists/:id`
- `GET /api/wishlists/admin/all`

上传：

- `POST /api/upload/image`

AI：

- `GET /api/ai/avatar`
- `PUT /api/ai/avatar`
- `POST /api/ai/chat`

## 角色说明

当前支持两个角色：

- `chef`
- `customer`

角色以数据库 `users.role` 为准。前端只读取后端返回的 `role`，不参与角色判定。

其中“确认订单”等管理能力仅允许 `chef` 调用，普通用户调用会返回 `403 Forbidden`。

## 提交说明

当前仓库已忽略以下内容：

- `node_modules/`
- `dist/`
- `.env`
- `docs/`
- 日志和本地编辑器缓存

适合直接作为后端代码仓库提交。
