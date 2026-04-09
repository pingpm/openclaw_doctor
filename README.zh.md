# OpenClaw Doctor 🦞

> OpenClaw 坏了？一條命令，10 秒搞定。

**OpenClaw Doctor** 是专为 [OpenClaw](https://openclaw.ai) AI 智能体设计的远程诊断与修复工具。每次 OpenClaw 版本更新后出现配置错误、服务崩溃等问题时，只需在故障机器上运行一条命令，即可获得一个公网访问地址——无需 SSH，无需用户名密码，另一个 AI 或协作者通过这个地址即可远程操控修复。

---

## 快速安装

```bash
curl -sSL https://ocd.imdaxia.com/install.sh | bash
```

约 15 秒后你会看到：

```
╔═════════════════════════════════════════════════════════╗
║       ✅  OPENCLAW DOCTOR 已在线                        ║
╠═════════════════════════════════════════════════════════╣
║  🌐 公网地址 : https://amber-sunset.trycloudflare.com   ║
║  🔐 访问令牌 : a3f9d2e1b4c7...                          ║
║  🔗 完整链接 : https://amber-sunset.trycloudflare.com/?token=... ║
╚═════════════════════════════════════════════════════════╝
```

将**完整链接**发给另一个 AI 智能体，或在浏览器中打开。

---

## 工作原理

1. **启动本地服务** — 在端口 `12222`（可通过 `OCD_PORT` 环境变量修改）启动一个受 Token 保护的 Express 服务。
2. **Cloudflare 内网穿透** — 自动下载并启动 `cloudflared`，创建一个免费的公网 HTTPS 隧道，穿透 NAT 和防火墙，无需任何账号或路由器配置。
3. **共享链接 + Token** — 将终端中打印的完整链接分享给 AI 或协作者，即可获得远程终端访问权限。

---

## API 接口

所有受保护的接口需要在请求头中携带 `x-doctor-token: <token>`，或在 URL 中附加 `?token=<token>` 查询参数。

| 方法 | 路径 | 是否需要认证 | 说明 |
|------|------|-------------|------|
| `GET`  | `/api/ping` | ❌ | 存活检测 |
| `GET`  | `/api/status` | ✅ | 执行 `openclaw status` |
| `POST` | `/api/exec` | ✅ | 执行任意 Shell 命令 |
| `GET`  | `/api/files/read` | ✅ | 读取文件内容 |
| `POST` | `/api/files/write` | ✅ | 写入 / 创建文件 |
| `GET`  | `/api/files/list` | ✅ | 列出目录内容 |

### 执行命令示例

```bash
# 执行 Shell 命令
curl -X POST https://YOUR-TUNNEL-URL/api/exec \
  -H "x-doctor-token: YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd": "openclaw status"}'

# 响应
{
  "stdout": "...",
  "stderr": "",
  "code": 0
}
```

```bash
# 读取配置文件
curl "https://YOUR-TUNNEL-URL/api/files/read?filePath=/path/to/config.json" \
  -H "x-doctor-token: YOUR-TOKEN"

# 写入修复后的配置
curl -X POST https://YOUR-TUNNEL-URL/api/files/write \
  -H "x-doctor-token: YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"filePath": "/path/to/config.json", "content": "{...}"}'
```

---

## 项目结构

```
openclaw_doctor/
├── server.js               # 核心服务（Express + Cloudflare 隧道）
├── install.sh              # 一键安装脚本
├── package.json
├── README.md               # 英文说明
├── README.zh.md            # 中文说明（本文件）
├── .gitignore
├── public/
│   └── index.html          # 远程诊断控制台（部署在被控端）
└── website/
    ├── index.html          # 官网（英文，部署到 ocd.imdaxia.com）
    └── index.zh.html       # 官网（中文）
```

---

## 手动启动

```bash
git clone https://github.com/yourname/openclaw-doctor
cd openclaw-doctor
npm install
OCD_PORT=12222 TOKEN=你的自定义token node server.js
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `OCD_PORT` | `12222` | 本地服务端口 |
| `TOKEN` | 随机生成 | 访问令牌（每次启动随机生成，也可手动指定） |

---

## 安全说明

- 每次启动自动生成 128 位随机 Token，无法猜测
- 隧道 URL 是临时的，每次重启都会变化
- 该工具提供**完整 Shell 访问权限**，请只将链接分享给可信任的 AI 或人员
- 建议在本地防火墙层面屏蔽 `12222` 端口，通过隧道访问即可

---

## License

MIT

---

[English README](./README.md)
