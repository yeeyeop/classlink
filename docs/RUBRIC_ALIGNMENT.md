# 评分项对应表

| 评分关注点 | 原风险 | 当前实现 | 验证证据 |
| --- | --- | --- | --- |
| 登录鉴权 | 基础链路成立 | scrypt、HttpOnly Cookie、会话过期、重置后旧会话失效 | `lib/auth.js`、冒烟测试 |
| 角色区分 | 基础链路成立 | 每个管理员接口二次校验 `role` | `app/api/admin/*` |
| 预约增删 | 基础链路成立 | 学生预约、取消，管理员取消和恢复 | `tests/booking-rules.test.mjs`、smoke |
| 冲突检测 | 仅检查房间时段重叠 | 同规则额外检查课程、日期、节次、时长、人数和过去时间 | `lib/booking-rules.js` |
| 实时可用状态 | 只显示本人预约 | 新增脱敏全量可用性接口，30 秒刷新和写后刷新 | `/api/bookings/availability`、浏览器交互 |
| 实时刷新机制 | 需要手动刷新才能看到变化 | 数据库写操作发布事件，前端通过 SSE 自动重取可用性、预约、通知和管理台数据 | `lib/realtime.js`、`/api/realtime` |
| 管理员入口安全 | 匿名可取得管理员会话 | 删除独立入口，正式管理员由初始化脚本创建，所有管理 API 二次校验角色 | `scripts/create-admin.mjs`、`app/api/admin/*` |
| 管理员完整管理 | 只能看最近一条 | 全量查询、筛选、改时间、改教室、取消、恢复、账号管理、通知 | `AdminConsole.jsx`、`/api/admin/bookings` |
| 通知闭环 | 学生无法查询 | 学生通知中心、未读数、已读状态 | `/api/notifications`、通知组件 |
| 管理员智能助手 | 教室信息查询依赖人工翻列表 | 主页面右侧抽屉接入 DeepSeek 领域 Agent，通过只读工具读取实时教室、预约、课程和设备数据 | `/api/admin/assistant`、`lib/admin-assistant.js`、`AdminAssistant.jsx` |
| 找回密码 | 假弹窗 | 真令牌、哈希存储、有效期、改密、会话失效 | recover/reset API、`lib/password-reset.js` |
| 3D 技术深度 | 装饰性动画 | 状态驱动的数字孪生，点击房间查看并预约 | `CampusDigitalTwin.jsx`、浏览器 3D 拾取验证 |
| 设备控制 | 内存状态刷新丢失 | 按房间写入 JSON，场景模式与审计日志 | `/api/rooms/:roomId/devices` |
| 假按钮风险 | 监控只有 LIVE 图标 | 配置真实视频源才显示画面，否则明确提示未接入 | `PlatformShelfView.jsx` |
| 工程稳定性 | 无测试、无 Lint、整文件覆盖 | 单元测试、ESLint、生产构建、HTTP 冒烟、原子写入和备份 | `package.json`、`lib/db.js` |
| 演示成本 | 约 49 MB 媒体可能拖慢首屏 | GLB 与视频均延迟到浏览器空闲后加载，并提供环境变量关闭开关，业务 3D 使用程序化几何 | `.env.example`、`VideoBackdrop.jsx` |
| 材料完整性 | 仅薄 README | 技术设计、分工、6 条 Vibe、测试用例、特色说明、职业规划、PPT | `docs/*`、`docs/vibe/*` |
