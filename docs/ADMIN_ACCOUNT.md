# 管理员账号

管理员入口与普通用户使用同一登录表单，不再提供独立管理员入口或匿名管理员接口。

## 已初始化账号

当前交付数据库包含以下管理员：

| 字段 | 值 |
| --- | --- |
| 姓名 | 平台管理员 |
| 学号 | `2026000001` |
| 密码 | `Admin@BUPT2026` |
| 校园邮箱 | `admin2026@bupt.cn` |
| 角色 | `admin` |

首次登录后应立即修改密码。若会公开源码或部署上线，请不要沿用本文中的初始密码。

## 重新初始化管理员

如果删除了 `.data` 或迁移到新机器，可执行：

```powershell
npm run admin:create -- --sid 2026000001 --email admin2026@bupt.cn --password Admin@BUPT2026 --name 平台管理员
```

脚本会：

- 创建或更新管理员账号。
- 密码使用随机盐和 scrypt 哈希。
- 清理旧版演示用户及其会话、预约和通知。
- 不把明文密码写入数据库。

也可以通过环境变量提供密码：

```powershell
$env:ADMIN_PASSWORD='Admin@BUPT2026'
npm run admin:create
```
