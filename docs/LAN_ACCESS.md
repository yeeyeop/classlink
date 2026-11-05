# CLASSLINK 局域网访问说明

## 目标

同一专享楼局域网内的其他电脑或手机，可以通过分享链接访问本机运行的 CLASSLINK。

当前电脑的无线网地址示例：

```text
http://192.168.1.4:3000
```

该地址会随本机连接的网络变化，分享前应重新运行 `npm run lan:info`。

## 第一次配置

在项目目录双击：

```text
允许局域网访问.cmd
```

Windows 会弹出管理员权限确认。该脚本只创建一条入站规则：

- 端口：TCP 3000
- 来源：本地子网 `LocalSubnet`
- 方向：入站
- 动作：允许

它不会把端口暴露到互联网。

## 启动局域网版

开发调试：

```bash
npm run dev:lan
```

正式分享：

```bash
npm run build
npm run start:lan
```

也可以直接双击项目根目录的 `启动局域网版.cmd`。如果尚未生成生产构建，脚本会先执行 `npm run build`。

不要把 `npm run dev:lan` 返回的地址用于答辩或多人访问。Next.js 开发模式的 HMR WebSocket 在局域网 IP 下可能握手失败，导致 HTML 可以显示，但 React 按钮不响应、视频不加载。

启动后终端会列出：

```text
Local:   http://localhost:3000
Host:    http://电脑名:3000
Network: http://192.168.1.4:3000
```

把 `Network` 地址发给同一局域网内的其他人。

也可以双击 `获取分享链接.cmd`。该脚本会根据当天实际连接的网络重新计算 IP，并把链接复制到剪贴板。

## 登录 Cookie 设置

局域网通常使用 HTTP。如果系统按生产模式运行，默认 `Secure Cookie` 会导致浏览器在 HTTP 下不保存登录会话。

项目支持显式配置：

```env
COOKIE_SECURE=false
```

适用场景：

- `http://192.168.x.x:3000`：设为 `false`
- 配置 HTTPS 域名：设为 `true` 或留空

`.env.example` 已为课程局域网演示设置 `COOKIE_SECURE=false`。

## 分享链接前检查

1. 两台设备连接同一 Wi-Fi 或同一局域网。
2. 服务使用 `npm run dev:lan` 或 `npm run start:lan` 启动。
3. 防火墙规则已创建。
4. 分享 `Network` 地址，不要分享 `localhost`。
5. 如果 IP 改变，重新运行 `npm run lan:info`。
6. 更换 Wi-Fi 后必须重新获取链接，不能继续使用旧网络的 IP。

## 边界

- 该方案适用于专享楼内部演示，不应直接暴露到公网。
- 校园网开启客户端隔离时，即使在同一网段也可能无法互访，需要联系网络管理员。
- 跨网段、跨互联网或 HTTPS 部署需要反向代理、域名和证书。
