# 测试用例

## 自动化测试

| 编号 | 场景 | 步骤 | 预期 | 自动化位置 |
| --- | --- | --- | --- | --- |
| UT-B01 | 合法未来预约 | 输入真实未来日期、合法节次和人数 | 返回规范化数据，无错误 | `booking-rules.test.mjs` |
| UT-B02 | 非法日期 | `date=not-a-date` | 返回日期格式错误 | `booking-rules.test.mjs` |
| UT-B03 | 非法节次 | `segment=99` | 返回节次错误 | `booking-rules.test.mjs` |
| UT-B04 | 非法时长 | `duration=-5` | 返回时长错误 | `booking-rules.test.mjs` |
| UT-B05 | 非法人数 | `people=0` | 返回人数错误 | `booking-rules.test.mjs` |
| UT-B06 | 过去日期 | 预约昨天 | 返回过去日期错误 | `booking-rules.test.mjs` |
| UT-B07 | 已开始节次 | 当天 09:00 预约第一节 | 返回已经开始错误 | `booking-rules.test.mjs` |
| UT-B08 | 课程冲突 | 预约课程占用节次 | 返回 409 | `booking-rules.test.mjs` |
| UT-B09 | 跨节课程冲突 | 时长覆盖课程节次 | 返回 409 | `booking-rules.test.mjs` |
| UT-B10 | 预约重叠 | 同时段已有有效预约 | 返回 409 | `booking-rules.test.mjs` |
| UT-B11 | 取消记录不占位 | 已有记录状态为 cancelled | 不产生冲突 | `booking-rules.test.mjs` |
| UT-B12 | 管理员改约自忽略 | 改约请求与原记录重叠 | 忽略自身后允许 | `booking-rules.test.mjs` |
| UT-A01 | 他人预约状态 | 同一时段他人已预约 | 返回 reserved | `booking-rules.test.mjs` |
| UT-A02 | 本人预约状态 | 同一时段本人已预约 | 返回 mine | `booking-rules.test.mjs` |
| UT-D01 | 设备合并更新 | 只修改温度和路灯 | 其他字段保留 | `devices.test.mjs` |
| UT-D02 | 非法设备参数 | 温度 40、VGA 源 | 拒绝 | `devices.test.mjs` |
| UT-D03 | 场景预设 | 上课/节能场景 | 输出确定状态 | `devices.test.mjs` |
| UT-AI01 | 助手上下文 | 构造有效预约和设备状态 | 上下文包含预约人、房间状态、设备状态 | `admin-assistant.test.mjs` |
| UT-AI02 | 指定教室问答 | 询问“205 教室状态” | 返回真实预约和设备信息 | `admin-assistant.test.mjs` |
| UT-AI03 | 空闲教室问答 | 询问“还有哪些空闲教室” | 返回空闲统计或明确无空闲 | `admin-assistant.test.mjs` |
| UT-AI04 | Agent 准备操作 | 生成预约和取消动作 | 只返回待确认动作，不修改数据 | `admin-assistant.test.mjs` |
| UT-RT01 | 实时事件总线 | 发布并订阅 `db:changed` | 收到完整事件，取消订阅后不再接收 | `realtime.test.mjs` |

## 端到端冒烟测试

`npm run smoke` 会启动构建后的 Next.js 服务，并使用独立临时数据目录。

| 编号 | 场景 | 预期 |
| --- | --- | --- |
| E2E-01 | 请求已删除的旧演示接口 | 全部返回 404 |
| E2E-02 | 注册新学生 | 200，返回学生会话 |
| E2E-03 | 查询指定日期/节次可用性 | 200，返回房间数组 |
| E2E-04 | 提交非法日期、节次、时长和人数 | 400 |
| E2E-05 | 正常预约 | 201，返回预约 UUID |
| E2E-06 | 同时段再次预约 | 409 |
| E2E-07 | 刷新可用性 | 目标房间为 mine |
| E2E-08 | 查询本人通知 | 200 |
| E2E-09 | 请求密码重置 | 返回测试令牌 |
| E2E-10 | 使用令牌重置密码 | 200 |
| E2E-11 | 新密码重新登录 | 200 |
| E2E-12 | 取消预约 | 200 |
| E2E-13 | 再次刷新可用性 | 目标房间恢复为 free |
| E2E-14 | 初始化管理员并登录 | 返回 `role=admin` |
| E2E-15 | 管理员调用信息助手 | 返回实时数据回复并写入助手日志 |
| E2E-16 | 建立 SSE 实时连接 | 返回 `text/event-stream` 和连接事件 |
| E2E-17 | 助手预约确认 | 生成动作并由管理员确认后写入预约 |
| E2E-18 | 助手取消确认 | 生成取消动作并更新预约状态 |

## 浏览器人工验收

| 编号 | 场景 | 结果 |
| --- | --- | --- |
| UI-01 | 窄屏首页无横向溢出 | 通过，视口 319 px，`scrollWidth=319` |
| UI-02 | 窄屏平台总览无横向溢出 | 通过，`scrollWidth=309` |
| UI-03 | 浏览器控制台错误 | 通过，无 error |
| UI-04 | 数字孪生画布非空 | 通过，画布 400×645，截图区域包含 6849 种颜色 |
| UI-05 | 点击 3D 房间 | 通过，选中 3F-314 并显示详情 |
| UI-06 | UI 预约 | 通过，205 显示为我的预约 |
| UI-07 | UI 取消预约 | 通过，取消后记录消失并提示成功 |

## 建议答辩前回归命令

```bash
npm ci
npm run verify
npm audit
```
