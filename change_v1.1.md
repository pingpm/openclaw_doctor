需要进行如下调整：
1. get请求链接时，打开一个网页，网页会展示当前电脑上openclaw的状态，可以用openclaw的小龙虾图标进行展示。
1.1 如果当前电脑没有安装openclaw，可以提示当前没有安装小龙虾，运行openclaw status命令，如果提示命令不存在，那就是没安装；
1.2 如果安装了，运行openclaw status，会提示：


```
ycgjdeMacBook-Pro% openclaw status

🦞 OpenClaw 2026.4.5 (3e72c03)
   Your terminal just grew claws—type something and let the bot pinch the busywork.

│
◇  
│
◇  
OpenClaw status

Overview
┌──────────────────────┬───────────────────────────────────────────────────────┐
│ Item                 │ Value                                                 │
├──────────────────────┼───────────────────────────────────────────────────────┤
│ Dashboard            │ http://127.0.0.1:18789/                               │
│ OS                   │ macos 15.7.3 (arm64) · node 25.2.1                    │
│ Tailscale            │ off                                                   │
│ Channel              │ stable (default)                                      │
│ Update               │ pnpm · npm latest unknown                             │
│ Gateway              │ local · ws://127.0.0.1:18789 (local loopback) ·       │
│                      │ reachable 54ms · auth token · ycgjdeMacBook-Pro.      │
│                      │ local (192.168.96.129) app 2026.4.5 macos 15.7.3      │
│ Gateway service      │ LaunchAgent installed · loaded · running (pid 32976)  │
│ Node service         │ LaunchAgent not installed                             │
│ Agents               │ 3 · 1 bootstrap file present · sessions 3 · default   │
│                      │ main active 18m ago                                   │
│ Memory               │ 0 files · 0 chunks · sources memory · plugin memory-  │
│                      │ core · vector unknown · fts ready · cache on (0)      │
│ Plugin compatibility │ none                                                  │
│ Probes               │ skipped (use --deep)                                  │
│ Events               │ none                                                  │
│ Tasks                │ none                                                  │
│ Heartbeat            │ 30m (main), disabled (marketing), disabled (material_ │
│                      │ helper)                                               │
│ Sessions             │ 3 active · default kimi-k2.5 (16k ctx) · 3 stores     │
└──────────────────────┴───────────────────────────────────────────────────────┘

Security audit
Summary: 0 critical · 5 warn · 1 info
  WARN Reverse proxy headers are not trusted
    gateway.bind is loopback and gateway.trustedProxies is empty. If you expose the Control UI through a reverse proxy, configure trusted proxies so local-client c…
    Fix: Set gateway.trustedProxies to your proxy IPs or keep the Control UI local-only.
  WARN Control UI insecure auth toggle enabled
    gateway.controlUi.allowInsecureAuth=true does not bypass secure context or device identity checks; only dangerouslyDisableDeviceAuth disables Control UI device…
    Fix: Disable it or switch to HTTPS (Tailscale Serve) or localhost.
  WARN Insecure or dangerous config flags enabled
    Detected 1 enabled flag(s): gateway.controlUi.allowInsecureAuth=true.
    Fix: Disable these flags when not actively debugging, or keep deployment scoped to trusted/local-only networks.
  WARN Some gateway.nodes.denyCommands entries are ineffective
    gateway.nodes.denyCommands uses exact node command-name matching only (for example `system.run`), not shell-text filtering inside a command payload. - Unknown …
    Fix: Use exact command names (for example: canvas.present, canvas.hide, canvas.navigate, canvas.eval, canvas.snapshot, canvas.a2ui.push, canvas.a2ui.pushJSONL, canvas.a2ui.reset). If you need broader restrictions, remove risky command IDs from allowCommands/default workflows and tighten tools.exec policy.
  WARN Potential multi-user setup detected (personal-assistant model warning)
    Heuristic signals indicate this gateway may be reachable by multiple users: - channels.feishu.groupPolicy="allowlist" with configured group targets Runtime/pro…
    Fix: If users may be mutually untrusted, split trust boundaries (separate gateways + credentials, ideally separate OS users/hosts). If you intentionally run shared-user access, set agents.defaults.sandbox.mode="all", keep tools.fs.workspaceOnly=true, deny runtime/fs/web tools unless required, and keep personal/private identities + credentials off that runtime.
Full report: openclaw security audit
Deep probe: openclaw security audit --deep

Channels
┌──────────┬─────────┬────────┬────────────────────────────────────────────────┐
│ Channel  │ Enabled │ State  │ Detail                                         │
├──────────┼─────────┼────────┼────────────────────────────────────────────────┤
│ Feishu   │ ON      │ OK     │ configured                                     │
└──────────┴─────────┴────────┴────────────────────────────────────────────────┘

Sessions
┌────────────┬────────┬─────────┬──────────────┬───────────────────────────────┐
│ Key        │ Kind   │ Age     │ Model        │ Tokens                        │
├────────────┼────────┼─────────┼──────────────┼───────────────────────────────┤
│ agent:main │ direct │ 18m ago │ kimi-k2.5    │ 33k/16k (208%) · 🗄️ 8% cached │
│ :main      │        │         │              │                               │
│ agent:main │ direct │ 46h ago │ kimi-k2.5    │ 31k/16k (196%)                │
│ :feishu:di │        │         │              │                               │
│ rect:ou_   │        │         │              │                               │
│ a23…       │        │         │              │                               │
│ agent:mate │ direct │ 9d ago  │ qwen3.5-plus │ unknown/16k (?%)              │
│ rial_      │        │         │              │                               │
│ helper:fei │        │         │              │                               │
│ shu:ma…    │        │         │              │                               │
└────────────┴────────┴─────────┴──────────────┴───────────────────────────────┘

FAQ: https://docs.openclaw.ai/faq
Troubleshooting: https://docs.openclaw.ai/troubleshooting

Next steps:
  Need to share?      openclaw status --all
  Need to debug live? openclaw logs --follow
  Need to test channels? openclaw status --deep


```
1.3 如果小龙虾无法启动，运行后hi展示一堆错误代码，无法启动，小龙虾一般会在进城中，端口为18789

2. 页面上除了展示小龙虾状态，右上角有终端图标，点击终端图标，可以打开web页面的终端；还需要展示当前访问连接、token、完整链接等信息；还需要展示停止服务、重新开启服务按钮，重新开启时会重新生成token

3. 页面上还需要编写AI如何使用此接口，或者告诉AI读取哪个文件可以知道使用方法，类似于一个skills，要详细告诉AI如何操作，避免产生歧义，引导AI能阅读，避免AI以为是普通页面，漏掉了使用方法

4. 小龙虾 的svg图标我从官网上复制的。
```
<svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" data-astro-cid-j7pv25f6=""> <!-- Lobster Claw Silhouette --> <path d="M60 10 C30 10 15 35 15 55 C15 75 30 95 45 100 L45 110 L55 110 L55 100 C55 100 60 102 65 100 L65 110 L75 110 L75 100 C90 95 105 75 105 55 C105 35 90 10 60 10Z" fill="url(#lobster-gradient)" class="claw-body" data-astro-cid-j7pv25f6=""></path> <!-- Left Claw --> <path d="M20 45 C5 40 0 50 5 60 C10 70 20 65 25 55 C28 48 25 45 20 45Z" fill="url(#lobster-gradient)" class="claw-left" data-astro-cid-j7pv25f6=""></path> <!-- Right Claw --> <path d="M100 45 C115 40 120 50 115 60 C110 70 100 65 95 55 C92 48 95 45 100 45Z" fill="url(#lobster-gradient)" class="claw-right" data-astro-cid-j7pv25f6=""></path> <!-- Antenna --> <path d="M45 15 Q35 5 30 8" stroke="var(--coral-bright)" stroke-width="2" stroke-linecap="round" class="antenna" data-astro-cid-j7pv25f6=""></path> <path d="M75 15 Q85 5 90 8" stroke="var(--coral-bright)" stroke-width="2" stroke-linecap="round" class="antenna" data-astro-cid-j7pv25f6=""></path> <!-- Eyes --> <circle cx="45" cy="35" r="6" fill="#050810" class="eye" data-astro-cid-j7pv25f6=""></circle> <circle cx="75" cy="35" r="6" fill="#050810" class="eye" data-astro-cid-j7pv25f6=""></circle> <circle cx="46" cy="34" r="2" fill="#00e5cc" class="eye-glow" data-astro-cid-j7pv25f6=""></circle> <circle cx="76" cy="34" r="2" fill="#00e5cc" class="eye-glow" data-astro-cid-j7pv25f6=""></circle> <defs data-astro-cid-j7pv25f6=""> <linearGradient id="lobster-gradient" x1="0%" y1="0%" x2="100%" y2="100%" data-astro-cid-j7pv25f6=""> <stop offset="0%" stop-color="var(--logo-gradient-start)" data-astro-cid-j7pv25f6=""></stop> <stop offset="100%" stop-color="var(--logo-gradient-end)" data-astro-cid-j7pv25f6=""></stop> </linearGradient> </defs> </svg>
```
5. openclaw常用命令，你可以作为参考，当前电脑上已经安装了openclaw，如果你需要查看具体命令返回的内容，可以直接运行
启动 Gateway	：openclaw gateway start
停止 Gateway	：openclaw gateway stop
重启 Gateway	：openclaw gateway restart
查看运行状态	：openclaw gateway status
前台运行（调试）：	openclaw gateway run
强制前台运行：	openclaw gateway run --force
指定端口启动	：openclaw gateway --port 18789
安装开机自启：	openclaw gateway install
卸载开机自启	：openclaw gateway uninstall
打开控制面板	：openclaw dashboard
终端交互模式	：openclaw tui
openclaw config get all          # 全部配置
openclaw config get gateway       # 网关配置
openclaw config get agents       # 智能体配置
openclaw config file             # 查看配置文件路径
openclaw config validate         # 验证配置是否合法
查看已配置模型	openclaw models list
查看模型运行状态	openclaw models status
扫描可关联的模型	openclaw models scan
探测模型可用性	openclaw models probe
设置默认模型	openclaw models set default "minimax/MiniMax-M2.7"
设置默认图像模型	openclaw models set-image "doubao-seedream-4-0-250828"
管理模型别名	openclaw models aliases
管理认证信息	openclaw models auth
管理备用模型列表	openclaw models fallbacks
查看最近日志	openclaw logs
实时跟踪日志	openclaw logs --follow
只看错误日志	openclaw logs --error
指定条数	openclaw logs --limit 100
纯文本输出	openclaw logs --plain
输出 JSON	openclaw logs --json
本地时间戳	openclaw logs --local-time
执行健康检查	openclaw doctor
自动修复问题	openclaw doctor --fix
强制修复（慎用）	openclaw doctor --force
生成网关 Token	openclaw doctor --generate-gateway-token
扫描系统服务	openclaw doctor --scan

6. 在操控远程电脑时，我希望能够通过子任务的形式执行命令，这样执行时间过长时，可以查看命令执行状态（或者你有更好的办法，或者你觉得没有必要这样做，就不这样做


7. 总之想要的是简单操作，如果需要重构代码，你可以完全重构