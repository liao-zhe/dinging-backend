# AI Agent 提示词与调用流程

本文档说明后端 AI 助手的提示词来源、上下文构造、Function Calling 工具调用、流式返回，以及前端如何消费结果。

## 相关文件

- `src/modules/ai/ai.controller.ts`：HTTP 入口，包含普通聊天、流式聊天、会话、偏好、图片分析接口。
- `src/modules/ai/ai.service.ts`：会话管理、系统提示词构造、历史上下文拼装、消息落库。
- `src/modules/ai/ai-agent.service.ts`：Agent 两轮调用流程，负责让模型决定是否调用工具，并把工具结果再交给模型生成最终回复。
- `src/modules/ai/ai-tools.service.ts`：Function Calling 工具定义和工具执行逻辑。
- `src/modules/ai/providers/*`：LLM provider 适配层，目前支持 OpenAI 和 Anthropic。
- `src/modules/ai/user-preference.service.ts`：用户偏好读取、格式化、从用户消息中做简单规则提取。
- 前端：`dinging-fronted/src/pages/ai-chat/index.tsx` 负责发送流式请求和渲染文本、菜品卡片。

## 总体流程

```text
前端发送消息
  -> POST /api/ai/chat 或 /api/ai/chat/stream
  -> JwtAuthGuard 校验用户
  -> AiService 创建/读取会话
  -> 保存 user 消息
  -> 从用户消息中提取偏好并更新 user_preferences
  -> 构造 system prompt + 历史上下文
  -> AiAgentService 调用模型
      -> 第一轮：带 tools，让模型判断是否需要工具
      -> 如果没有 tool_calls：直接返回模型文本
      -> 如果有 tool_calls：后端执行工具
      -> 第二轮：把 assistant tool_calls + tool 结果追加进 messages
      -> 模型基于真实工具结果生成最终回复
  -> 保存 assistant 消息
  -> 返回文本和可渲染菜品列表
```

## 入口接口

### 普通聊天

`POST /api/ai/chat`

请求体由 `ChatDto` 定义：

```json
{
  "session_id": "可选，已有会话 UUID",
  "content": "用户输入"
}
```

处理位置：`AiController.chat()` -> `AiService.chat()`。

返回主要字段：

```json
{
  "session_id": "会话 ID",
  "content": "AI 最终回复",
  "dishes": ["AI 回复中提到过的菜品列表，可选"]
}
```

### 流式聊天

`POST /api/ai/chat/stream`

处理位置：`AiController.chatStream()` -> `AiService.chatStream()`。

响应是 SSE：

```text
Content-Type: text/event-stream; charset=utf-8
X-Session-Id: 当前会话 ID
```

流式 chunk 格式：

```json
{ "type": "tool_call", "toolCalls": [] }
{ "type": "text", "content": "分片文本" }
{ "type": "dishes", "dishes": [] }
{ "type": "done" }
```

前端通过 `Taro.request({ enableChunked: true })` 和 `onChunkReceived` 读取分片。

## 系统提示词

系统提示词在 `AiService.buildSystemPrompt(userId)` 中构造。

目前核心内容包括：

- 角色：`哲哲私厨` 的菜品助手，名字叫 `小厨`。
- 职责：推荐菜品、回答菜品问题、搭配菜单、结合收藏和历史订单给建议。
- 工具说明：列出 6 个工具。
- 回复规范：语气亲切自然，推荐必须基于真实数据，不提价格，按人数给搭配建议。
- 限制：只讨论菜品相关话题，不处理订单操作，不透露价格成本，不确定时建议联系客户。
- 用户偏好：如果数据库里有偏好，会追加到 `## 用户偏好` 段落。

偏好文本来自：

```text
UserPreferenceService.getPreference(userId)
  -> UserPreferenceService.formatPreferenceText(preference)
```

当前偏好提取是规则匹配，不是模型抽取。用户发消息后，`AiService.chat()` / `chatStream()` 会调用：

```text
extractPreferenceFromMessage(content)
```

如果识别到“不吃辣、清淡、素食、人数”等关键词，就更新用户偏好。

## 上下文构造

上下文由 `AiService.getContextMessages(sessionId, userId)` 生成：

```text
[
  { role: "system", content: systemPrompt },
  ...历史消息
]
```

历史消息来自 `chat_messages` 表，按 `created_at ASC` 排序。

当前限制：

- `MAX_CONTEXT_MESSAGES = 20`
- 如果历史消息超过 20 条，只保留最近 20 条。
- `SUMMARY_THRESHOLD = 15` 目前定义了但没有实际使用，也就是说还没有真正做长对话摘要。

注意：数据库实体 `ChatMessage.role` 只允许 `user | assistant | system`，工具消息不会长期保存。保存 assistant 消息时只保存最终回复和 `tool_calls`。

## Agent 两轮调用

核心在 `AiAgentService.runAgent()`。

### 第一轮：让模型决定是否调用工具

```text
provider.chat({
  messages,
  tools: toolsService.getToolDefinitions()
})
```

provider 由 `LLMProviderFactory` 根据环境变量选择：

- `LLM_PROVIDER=openai` 默认
- `LLM_PROVIDER=anthropic`

OpenAI 默认模型：

```text
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

Anthropic 默认模型：

```text
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_BASE_URL=https://api.anthropic.com
```

如果第一轮没有 `toolCalls`，Agent 直接返回模型文本。

### 执行工具

如果模型返回 `toolCalls`：

1. 遍历每个 tool call。
2. 解析 `toolCall.function.arguments`。
3. 调用 `AiToolsService.executeTool(functionName, args, userId)`。
4. 把工具结果组装成 role 为 `tool` 的消息。
5. 如果工具结果是菜品或推荐结果，收集到 `allDishes`。

工具返回会被包装为：

```json
{
  "tool_call_id": "call_xxx",
  "role": "tool",
  "content": "{\"success\":true,\"type\":\"dish\",\"data\":[]}"
}
```

### 第二轮：基于工具结果生成最终回复

第二轮 messages：

```text
原始 messages
  + assistant 消息，包含第一轮 tool_calls
  + tool 结果消息
```

然后再次调用：

```text
provider.chat({ messages: updatedMessages })
```

最终返回：

```json
{
  "content": "最终自然语言回复",
  "toolCalls": "第一轮工具调用记录",
  "dishes": "最终回复中提到过的菜品，最多 6 个"
}
```

`dishes` 的筛选逻辑：

1. 从工具结果中收集 `type === dish` 或 `type === recommendation` 的数据。
2. 按 `dish.id` 去重。
3. 只保留最终回复文本里出现过 `dish.name` 的菜品。
4. 最多返回 6 个。

这样前端只展示 AI 真的提到的菜品卡片，避免工具查出来但回复没说的菜也被展示。

## 可用工具

工具定义在 `AiToolsService.getToolDefinitions()`。

### search_dishes

按关键词或分类搜索菜品。

参数：

- `keyword`
- `category_id`
- `limit`

返回字段包含：

- `id`
- `name`
- `description`
- `category`
- `image_url`
- `tag`

### get_dish_detail

获取指定菜品详情。

参数：

- `dish_id`

### get_all_categories

获取所有菜品分类。

无参数。

### get_user_wishlist

获取当前用户收藏菜品。

无参数。

当前实现没有传 `userId` 给 `WishlistsService.getUserWishlists()`，需要确认该 service 是否内部能识别当前用户；否则可能取不到正确用户收藏。

### get_recent_orders

获取用户最近订单。

参数：

- `limit`

这个工具会使用 `userId` 调 `OrdersService.getUserOrders(userId)`。

### recommend_dishes

按人数、偏好、餐次推荐菜品。

参数：

- `people_count`
- `preferences`
- `meal_type`

当前推荐逻辑是规则式：

1. 获取所有菜品。
2. 如果有偏好，按 name、description、tag 做关键词匹配。
3. 按分类分组。
4. 每个分类取前 1-2 个。
5. 根据人数限制返回数量，默认返回 4 个。

## 流式 Agent 流程

`AiAgentService.runAgentStream()` 与普通流程基本一致，但第一轮和第二轮都使用 `provider.chatStream()`。

流程：

1. 第一轮流式请求，累计 `responseContent`。
2. 如果模型输出 `tool_call`，先向前端 yield：

   ```json
   { "type": "tool_call", "toolCalls": [] }
   ```

3. 执行工具。
4. 构造 `updatedMessages`。
5. 第二轮流式请求。
6. 第二轮每收到文本就 yield：

   ```json
   { "type": "text", "content": "..." }
   ```

7. 第二轮完成后，根据最终完整文本筛选菜品，然后 yield：

   ```json
   { "type": "dishes", "dishes": [] }
   { "type": "done" }
   ```

注意：如果第一轮没有工具调用，当前实现会在第一轮结束后一次性把 `responseContent` yield 给前端，而不是边生成边返回。这是因为第一轮要先判断是否有工具调用。

## 前端消费流程

前端在 `pages/ai-chat/index.tsx` 中：

1. 用户发送消息后，先本地插入 user 消息和一个空 assistant 消息。
2. 请求 `/ai/chat/stream`。
3. `onChunkReceived` 读取 ArrayBuffer。
4. `parseSseBuffer()` 按 `data:` 行解析 JSON。
5. 收到 `text`：追加到 assistant 内容。
6. 收到 `dishes`：过滤出回复内容中提到的菜品，挂到 assistant 消息。
7. 收到 `done`：最终刷新一次。

前端还有 `removeToolCallMarkup()`，用于清理某些模型可能直接吐出来的工具调用标记。

## 图片分析流程

图片分析走独立接口，不经过 `AiAgentService`：

```text
POST /api/ai/analyze-image
  -> AiController.analyzeImage()
  -> 直接取 provider
  -> messages 中手动构造 system + user(image_url)
  -> provider.chat()
```

也就是说图片分析目前不使用菜品工具，不查数据库，只让模型看图做描述。

## 当前值得关注的问题

### 1. 长对话摘要未实现

`SUMMARY_THRESHOLD = 15` 已定义但没有使用。现在超过 20 条只截断，早期偏好或任务背景可能丢失。

建议：

- 真正实现摘要消息。
- 或把重要用户偏好结构化沉淀到 `user_preferences`，减少依赖历史消息。

### 2. 工具结果没有持久保存

数据库只保存 assistant 最终消息和 `tool_calls`，不保存 tool result。之后回放会话时，模型看不到当时工具返回过什么。

这对当前产品不一定是问题，但如果后续要“基于上次推荐继续调整”，上下文里可能缺少真实菜品数据。

### 3. `get_user_wishlist` 可能没有按用户过滤

`executeTool()` 接收了 `userId`，但 `getUserWishlist()` 没有传入 userId：

```text
this.wishlistsService.getUserWishlists()
```

需要确认 `WishlistsService` 的实现。如果它不是从请求上下文取用户，这里会有数据错误风险。

### 4. provider 缺少 API key 显式校验

OpenAI/Anthropic provider 构造时读取 API key，但没有在为空时提前报清楚的配置错误。实际调用时会变成上游 401 或更隐晦的错误。

### 5. Anthropic 与 OpenAI 的 tool message 格式差异要重点测试

Agent 内部统一用了 OpenAI 风格的 `tool_call_id` / `tool_calls`。Anthropic provider 里做了格式转换，后续如果改工具消息结构，要同时测两个 provider。

### 6. 非工具场景的流式体验不是真正逐字流式

第一轮如果没有工具调用，会等模型完整结束后再一次性返回 `responseContent`。如果希望闲聊类问题也逐字返回，需要设计“先流文本，若出现工具调用再切工具流程”的策略，但这会增加前端状态处理复杂度。

## 改提示词的位置

主要改这里：

```text
src/modules/ai/ai.service.ts
  -> buildSystemPrompt(userId)
```

工具名、工具描述、参数说明改这里：

```text
src/modules/ai/ai-tools.service.ts
  -> getToolDefinitions()
```

工具实际执行逻辑改这里：

```text
src/modules/ai/ai-tools.service.ts
  -> executeTool()
  -> private searchDishes/getDishDetail/...
```

模型选择和默认模型改这里：

```text
src/modules/ai/providers/llm-provider.factory.ts
src/modules/ai/providers/openai.provider.ts
src/modules/ai/providers/anthropic.provider.ts
```

对应环境变量：

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# 或
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```
