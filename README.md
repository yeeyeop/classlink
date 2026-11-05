# CLASSLINK 专享楼 A 座空教室预约平台

面向北京邮电大学海南校区专享楼 A 座的全栈教室预约系统。项目使用 Next.js App Router、React 与 Three.js 实现注册登录、角色鉴权、实时可用性、预约冲突检测、管理员运营、通知闭环和设备中控持久化。

当前工程已从原 `next@14.2.35` 升级到 `next@16.3.4`，`npm audit` 为 0 个已知漏洞。

## 核心能力

- 学生注册、登录、退出、会话校验和真实密码重置令牌流程。
- 管理员与普通用户共用登录表单，不再存在独立或匿名管理员入口。
- 公开查询某日期、某节次的全量教室占用状态，不泄露其他用户姓名和联系方式。
- 预约、取消、管理调整、通知和设备写入后通过 SSE 实时推送，页面自动刷新，无需管理员或学生手动刷新。
- 服务端统一校验日期格式、过去时段、节次范围、时长、人数、课程冲突和预约重叠。
- 管理员可筛选全部预约、调整时间、调整教室、取消、恢复预约，并可管理账号与发送通知。
- 学生通知中心会展示管理员通知、未读数量和已读状态，形成完整数据闭环。
- 主页面右侧提供可拉出的教室信息助手，支持 DeepSeek Agent 查询实时占用、课程、预约和设备信息。
- 助手可以准备预约或取消操作，但必须经过管理员在界面上确认后，服务端才执行并重新校验冲突。
- 设备中控支持空调、照明、投影和场景模式，状态写入 JSON 数据库，刷新页面后仍保留。
- 三维楼宇数字孪生直接读取后端可用性数据，房间颜色对应空闲、上课、他人预约、我的预约和维护状态，点击房间可查看详情并预约。
- JSON 数据库采用进程内队列和临时文件原子替换；损坏文件会备份，优先从 `.data/db.backup.json` 恢复，不再静默清库。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 18、Next.js 16 App Router、Tailwind CSS |
| 图标 | Lucide React |
| 3D | Three.js、three-stdlib |
| 后端 | Next.js Route Handlers |
| 鉴权 | HttpOnly Cookie、scrypt 密码哈希、服务端角色校验 |
| 数据 | 本地 JSON、原子写入、进程内写锁、备份恢复 |
| 质量 | Node Test Runner、ESLint、生产构建、HTTP 冒烟测试 |

## 快速运行

```bash
npm install
cp .env.example .env.local
npm run dev
```

Windows PowerShell 可使用：

```powershell
Copy-Item .env.example .env.local
npm run dev
```

打开 `http://localhost:3000`。

管理员与普通用户使用同一个登录表单，不再提供独立入口。交付版数据库已初始化管理员账号，详细说明见 [管理员账号](docs/ADMIN_ACCOUNT.md)。

## 局域网访问

同一专享楼局域网内的其他设备需要访问时，先双击 `允许局域网访问.cmd` 创建 TCP 3000 的本地子网防火墙规则，然后运行：

```bash
npm run dev:lan
```

终端会输出类似 `http://192.168.1.4:3000` 的 Network 地址。把该地址分享给同一局域网内的设备。局域网分享必须使用生产构建 `npm run start:lan`；`npm run dev:lan` 只用于开发调试。

更换 Wi-Fi 或第二天连接到新的局域网后，双击 `获取分享链接.cmd`。脚本会读取当天 IP、显示新的分享地址并复制到剪贴板。

局域网 HTTP 演示需要在 `.env.local` 中保持 `COOKIE_SECURE=false`，否则生产模式下的 Secure Cookie 可能导致无法登录。详细说明见 [局域网访问说明](docs/LAN_ACCESS.md)。

## 常用脚本

```bash
npm run dev       # 开发服务器
npm run dev:lan   # 监听 0.0.0.0 的局域网开发服务器
npm run lan:share # 显示并复制当前局域网的分享链接
npm run test      # 业务规则与设备状态单元测试
npm run lint      # ESLint，要求 0 warning
npm run build     # Next.js 生产构建
npm run start:lan # 监听 0.0.0.0 的局域网生产服务器
npm run smoke     # 启动生产服务并执行真实 HTTP 冒烟测试
npm run verify    # 依次执行 test、lint、build、smoke
```

分享给其他人前先运行 `npm run build`，然后运行 `npm run start:lan`。开发模式下 Next.js 的 HMR WebSocket 在局域网 IP 下可能握手失败，表现为页面能打开但按钮不响应。

`smoke` 使用临时 `DATA_DIR`，不会污染正常 `.data/db.json`。测试覆盖旧演示接口已删除、注册、可用性、非法预约、冲突、通知查询、密码重置、取消预约和管理员初始化登录。

## 预约规则

1. 日期必须为真实存在的 `YYYY-MM-DD`，不能早于当天。
2. 起始节次必须为 1 至 6，时长必须为 1 至 4 个节次，且不能跨出开放范围。
3. 当天已经开始的节次不可预约。
4. 人数必须为正整数，且不能超过教室容量；未配置容量时上限为 200。
5. 预约不能覆盖课程安排，也不能与其他有效预约重叠。
6. 冲突检测同时在校验逻辑、学生预约接口、管理员改约接口中复用，页面判断只用于即时反馈。

## API

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | 匿名 | 注册学生账号 |
| POST | `/api/auth/login` | 匿名 | 登录 |
| POST | `/api/auth/logout` | 登录 | 注销会话 |
| GET | `/api/auth/me` | 匿名/登录 | 获取当前会话 |
| POST | `/api/auth/recover` | 匿名 | 生成密码重置令牌并投递 |
| POST | `/api/auth/reset` | 匿名 + 有效令牌 | 修改密码并注销旧会话 |
| GET | `/api/bookings` | 登录 | 获取本人预约 |
| POST | `/api/bookings` | 登录 | 创建预约 |
| DELETE | `/api/bookings?id=` | 登录 | 取消本人预约 |
| GET | `/api/bookings/availability` | 登录 | 获取日期和节次的脱敏全量可用性 |
| GET/PATCH/DELETE | `/api/admin/bookings` | 管理员 | 查询、调整、取消预约 |
| GET/DELETE | `/api/admin/users` | 管理员 | 查询账号、注销学生账号 |
| GET/POST | `/api/admin/notifications` | 管理员 | 查询或发送通知 |
| GET/POST | `/api/admin/assistant` | 管理员 | 查询助手日志、提交对话并返回教室信息 |
| POST | `/api/admin/assistant/actions` | 管理员 | 确认执行助手准备的预约或取消操作 |
| GET/PATCH | `/api/notifications` | 登录 | 查询未读通知、标记已读 |
| GET/PATCH | `/api/rooms/:roomId/devices` | 登录/管理员 | 查询或持久化设备状态 |
| GET | `/api/realtime` | 登录 | SSE 实时数据变更事件 |

## 数据模型

`.data/db.json` 包含：

- `users`：账号、角色、scrypt 盐和密码哈希。
- `sessions`：Cookie 令牌、用户 ID 和过期时间。
- `bookings`：房间、日期、节次、时长、用途、人数、状态和审计字段。
- `notifications`：接收者、标题、正文、已读时间和发送者。
- `passwordResets`：重置令牌哈希、有效期和使用状态。
- `devices`：每间教室空调、照明、投影和最近更新时间。
- `deviceLogs`：设备控制审计日志，最多保留最近 500 条。
- `assistantLogs`：管理员助手问答日志，最多保留最近 200 条。

## 性能策略

- 装饰性 GLB 背景默认开启并保持闲置加载；弱网演示可设置 `NEXT_PUBLIC_ENABLE_GLB_BACKDROP=false` 关闭约 40 MB 资源。
- 背景视频在浏览器空闲后加载，避免阻塞首屏交互。
- 三维数字孪生只使用程序化几何和状态数据，不依赖大型模型文件。
- 可用性和通知每 30 秒刷新，预约或管理操作后立即刷新。

## 项目文档

- [技术设计](docs/TECHNICAL_DESIGN.md)
- [管理员账号](docs/ADMIN_ACCOUNT.md)
- [教室信息助手](docs/ADMIN_ASSISTANT.md)
- [DeepSeek 教室预约 Agent](docs/DEEPSEEK_AGENT.md)
- [实时刷新机制](docs/REALTIME.md)
- [局域网访问](docs/LAN_ACCESS.md)
- [项目分工](docs/TEAM_DIVISION.md)
- [评分项对应表](docs/RUBRIC_ALIGNMENT.md)
- [测试用例](docs/TEST_CASES.md)
- [特色技术说明](docs/FEATURE_TECHNICAL_NOTE.md)
- [答辩提纲与讲稿](docs/DEFENSE_PRESENTATION.md)
- [个人职业规划](docs/PERSONAL_CAREER_PLAN.md)
- [Vibe Coding 六条日志](docs/vibe/README.md)
- [质量验证报告](docs/QA_REPORT.md)
- [答辩 PPT](deliverables/CLASSLINK-defense.pptx)

## 已知边界

- 本地 JSON 适合课程项目、单实例部署和答辩演示；多实例生产部署应迁移到 PostgreSQL 或 SQLite WAL。
- 视频源未配置时，系统会明确显示“未配置真实视频源”，不伪装成在线监控。
- 设备中控是可验证的软件闭环，不代表已接入真实楼宇硬件协议；接入 MQTT/Modbus 时保留当前 API 和审计模型即可替换执行层。
