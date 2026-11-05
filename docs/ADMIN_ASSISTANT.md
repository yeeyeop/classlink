# 管理员教室信息助手

## 功能

主页面右侧提供可拉出的“教室信息助手”窗口。管理员可以选择日期和节次，然后询问：

- 当前或指定日期有多少空闲教室。
- 某个教室是否被预约、是否上课、设施和容量。
- 当前时段有哪些课程。
- 哪些教室已有预约，预约人是谁。
- 已持久化的空调、灯光和投影状态。

助手回答始终基于后端实时数据。即使没有接入大模型，也会使用本地规则查询真实数据并返回答案。

## API

### 提交问题

`POST /api/admin/assistant`

请求：

```json
{
  "date": "2026-09-11",
  "segment": 2,
  "messages": [
    {
      "role": "user",
      "content": "查看 205 教室状态"
    }
  ]
}
```

响应：

```json
{
  "reply": "2F 205 · 智慧教室 · 已被预约...",
  "provider": "local",
  "model": "rule-based-live-data",
  "warning": null,
  "contextSummary": {
    "total": 46,
    "free": 5,
    "class": 2,
    "reserved": 1
  },
  "generatedAt": "2026-09-10T00:00:00.000Z"
}
```

### 查询助手日志

`GET /api/admin/assistant?limit=8`

返回当前管理员最近的提问、回复、模型提供方和时间。

## 接入外部模型

优先支持 DeepSeek：

```env
DEEPSEEK_API_KEY=your-api-key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT_MS=30000
```

DeepSeek 的提示词、工具和 Agent 循环说明见 [DeepSeek 教室预约 Agent](DEEPSEEK_AGENT.md)。

也可以使用通用 OpenAI 兼容接口：

在 `.env.local` 中配置：

```env
CLASSROOM_ASSISTANT_API_URL=https://your-model.example/v1/chat/completions
CLASSROOM_ASSISTANT_API_KEY=your-api-key
CLASSROOM_ASSISTANT_MODEL=your-model-name
CLASSROOM_ASSISTANT_TIMEOUT_MS=20000
```

服务端会发送 OpenAI 兼容请求：

```json
{
  "model": "your-model-name",
  "temperature": 0.2,
  "messages": [
    { "role": "system", "content": "管理员助手约束" },
    { "role": "system", "content": "实时教室 JSON 上下文" },
    { "role": "user", "content": "查看 205 教室状态" }
  ]
}
```

接口需要返回以下任一格式：

```json
{
  "choices": [
    {
      "message": {
        "content": "模型回复"
      }
    }
  ]
}
```

或：

```json
{
  "reply": "模型回复",
  "model": "模型名称"
}
```

如果外部模型超时或返回格式错误，服务端会自动回退到实时数据规则回答，并在响应中返回 `warning`。
