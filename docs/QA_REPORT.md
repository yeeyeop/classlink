# 质量验证报告

验证日期：2026-09-10

## 依赖安全

- Next.js：`16.3.4`
- `npm audit`：0 vulnerabilities
- 原项目使用 `next@14.2.35`，审计发现 Windows 自托管 RCE、SSRF、DoS 和缓存污染等公开漏洞；本次已升级到修复版本。

## 自动化结果

```text
npm test
17 tests passed
0 failed

npm run lint
0 errors
0 warnings

npm run build
Compiled successfully
19 routes generated

npm run smoke
Smoke test passed:
auth, realtime, validation, conflict, availability,
notifications, password reset, delete, admin, assistant.
```

## 浏览器验收

- 窄屏首页：视口宽度 319 px，页面宽度 319 px，无横向溢出。
- 窄屏平台：视口宽度 319 px，可见内容宽度 309 px，无横向溢出。
- 控制台：无 error。
- 3D 画布：400×645 像素，测试截图区域检测到 6849 种颜色，确认场景非空。
- 3D 拾取：点击房间后选中 `3F · 314`，详情面板正常显示。
- UI 预约：预约 205 教室后状态和提示正常。
- UI 取消：取消后预约记录消失，可用性恢复。

## 未覆盖风险

- 未接入真实空调、灯光、投影和摄像头硬件。
- 多实例部署下的分布式并发未在当前 JSON 实现中覆盖。
- 密码重置只实现投递网关接口，实际邮件取决于部署环境配置。
- 当前浏览器验收为窄屏视口；答辩前建议在 1920×1080 大屏再走一次演示脚本。
