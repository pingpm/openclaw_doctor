# OpenClaw Doctor 🦞

> 通过 HTTPS 实现远程 Shell 访问——把链接发给任意 AI 工具，即可远程诊断和修复任意电脑。

**OpenClaw Doctor** 在故障电脑上 10 秒内完成安装，自动创建 Cloudflare 隧道，通过安全的公网 URL 提供完整的 Shell 访问权限。无需 SSH、无需密码、无需配置防火墙。

---

## 产品截图

| 操作面板 | 审计日志 |
|---|---|
| ![操作面板](pannel.png) | ![审计日志](opreation_log.png) |

---

## 一键安装

**macOS / Linux：**
```bash
curl -sSL https://ocd.imdaxia.com/install.sh | bash
```

**Windows（PowerShell）：**
```powershell
irm https://ocd.imdaxia.com/install.ps1 | iex
```
> 如未安装 Node.js，脚本会自动下载便携版。建议以管理员身份运行 PowerShell。

约 15 秒后终端显示：

```
✅  OPENCLAW DOCTOR 已在线
─────────────────────────────────────────────────────────
🌐  公网地址 : https://orange-tiger.trycloudflare.com
🔐  访问令牌 : a3f9d2e1b4c7...
🔗  完整链接 : https://orange-tiger.trycloudflare.com/?token=a3f9...
─────────────────────────────────────────────────────────
→  将完整链接发给 AI 工具开始远程修复
→  在浏览器中打开公网地址查看可视化面板
→  停止服务: bash ~/.openclaw-doctor/install.sh stop
```

将**完整链接**发给任意 AI 工具（Kiro、Cursor、Claude、Trae、Antigravity 等），描述你的问题：

> "帮我修复 OpenClaw 无法启动的问题，远程链接：https://xxxx.trycloudflare.com/?token=..."

AI 读取内置操作指南后立即开始工作，无需额外说明。

### 给 AI 编程工具用户的提示

使用 AI 编程助手（Kiro、Cursor、Copilot 等）时，如果 AI 不知道如何操作远程电脑，告诉它**用 `curl` 获取操作帮助**：

> "我使用命令 `npm install -g openclaw@latest` 无法升级 openclaw，你可以使用 curl 获取这个链接的内容以获得如何操作这台电脑的使用帮助：https://xxxx.trycloudflare.com/?token=YOUR_TOKEN"

AI 会调用 `curl` 拉取 Markdown 操作指南，立刻知道该执行哪些命令。

---

## 停止 / 重启

**macOS / Linux：**
```bash
bash ~/.openclaw-doctor/install.sh stop
```

**Windows：**
```powershell
# 在安装时的 PowerShell 窗口中执行：
Stop-OCD

# 或重新运行安装命令（自动停止旧实例并以新 token 启动）：
irm https://ocd.imdaxia.com/install.ps1 | iex
```

重新执行安装命令会自动停止旧实例并以新 token 启动新实例。

---

## 功能特性

| 特性 | 说明 |
|------|------|
| 🌐 **无需 SSH** | 仅需 HTTPS 链接，无需用户名密码、无需开放端口 |
| 🔐 **令牌认证** | 每次会话生成 128 位随机令牌，随时重启更换 |
| 🩺 **健康面板** | 自动运行 `openclaw status`，可视化展示网关、Agent、会话状态 |
| ⚡ **完整 Shell** | 执行任意命令，权限与本地用户相同 |
| 🤖 **AI 开箱即用** | GET 请求返回 Markdown 操作指南，AI 立即开始工作 |
| 🚇 **Cloudflare 隧道** | 免费快速隧道，穿透 NAT/VPN/防火墙，零配置 |
| 📋 **操作审计** | 每条命令及返回结果记录时间戳和调用方，可随时审查 |
| 🌍 **中英双语** | 界面支持中英文切换，默认中文 |
| 🖥️ **Web 终端** | 内置浏览器终端，支持命令历史、彩色输出、全屏模式 |
| ⏳ **异步任务** | 长时间命令支持 `"async": true` + 轮询接口 |

---

## 工作原理

1. **安装** — 一条 `curl | bash` 命令安装 Node.js 依赖并在端口 `12222` 启动服务
2. **建隧道** — Cloudflare 快速隧道自动生成公网 HTTPS 地址
3. **分享** — 将完整链接（含 token）发给 AI 工具或在浏览器中打开

---

## API 接口

所有接口均需 `?token=TOKEN` 查询参数。

### 核心操作

```
# GET — 返回 AI 操作指南（不要带 User-Agent 请求头）
GET https://xxxx.trycloudflare.com/?token=TOKEN

# POST — 执行任意 Shell 命令
POST https://xxxx.trycloudflare.com/?token=TOKEN
Content-Type: application/json

{"cmd": "openclaw status"}
```

响应：
```json
{ "stdout": "...", "stderr": "...", "code": 0 }
```

POST 可选字段：`"cwd"`、`"timeout"`（毫秒）、`"async": true`

### 其他接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/status` | 运行 `openclaw status` 并返回输出 |
| `GET` | `/audit` | 完整审计日志（最新在前） |
| `DELETE` | `/audit` | 清空审计日志 |
| `GET` | `/info` | 会话信息（token、隧道地址、端口） |
| `POST` | `/restart` | 重新生成 token，旧链接立即失效 |
| `GET` | `/task/:id` | 轮询异步任务结果 |

---

## 安全说明

- Token 每次会话随机生成（128 位熵）
- 隧道地址是临时的，每次重启都会变化
- **完整链接（含 token）拥有完整 Shell 权限，请勿发给陌生人**
- 操作完成后请停止服务或使用 `/restart` 更换 token
- 所有操作记录在 `~/.openclaw-doctor/audit.log`，可随时审查

---

## 项目结构

```
openclaw_doctor/
├── server.js          # Express 服务器 + Cloudflare 隧道
├── install.sh         # 一键安装脚本（支持 stop/update）
├── package.json
├── public/
│   ├── index.html     # 仪表盘 UI（双语、Web 终端、审计日志）
│   └── AI-GUIDE.md    # GET 请求返回给 AI 的操作指南
└── website/
    ├── index.html     # 官网（英文）
    └── index.zh.html  # 官网（中文）
```

---

## 手动启动

```bash
git clone https://github.com/yourname/openclaw-doctor
cd openclaw-doctor
npm install
PORT=12222 TOKEN=mysecrettoken node server.js
```

---

## 许可证

MIT · [English README](./README.md)
