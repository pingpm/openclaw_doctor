# OpenClaw Doctor - 健康检测方案

> 用于远程诊断 OpenClaw 安装状态和健康度的完整方案

---

## 📋 目录

- [快速检测](#快速检测)
- [完整健康检查](#完整健康检查)
- [JSON 输出（API 集成）](#json 输出 api 集成)
- [健康度判断矩阵](#健康度判断矩阵)
- [一键检测命令](#一键检测命令)
- [示例输出](#示例输出)

---

## 🎯 快速检测

适用于快速扫描，5 秒内完成。

### 检测命令

```bash
openclaw --version && openclaw health
```

### 判断逻辑

| 结果 | 含义 |
|------|------|
| 输出版本 + health 返回 OK | ✅ 健康 |
| 有版本但 health 失败 | ⚠️ 部分功能异常 |
| 命令找不到 | ❌ 未安装 |

---

## 🔍 完整健康检查

适用于深度诊断，推荐用于 Doctor 详细检测模式。

### 检测脚本

```bash
#!/bin/bash
# openclaw-doctor 健康检测脚本

check_openclaw() {
    local score=0
    local total=5
    local issues=()
    
    # 1. 命令检查 (权重 20%)
    if command -v openclaw >/dev/null 2>&1; then
        version=$(openclaw --version 2>&1)
        echo "✅ 命令：$version"
        ((score++))
    else
        echo "❌ 命令：未找到"
        issues+=("openclaw 命令不在 PATH 中")
    fi
    
    # 2. Node 版本 (权重 20%)
    if command -v node >/dev/null 2>&1; then
        node_ver=$(node -v)
        if [[ $(node -v | cut -d. -f1 | tr -d 'v') -ge 22 ]]; then
            echo "✅ Node: $node_ver"
            ((score++))
        else
            echo "❌ Node: $node_ver (需要 >= 22.14.0)"
            issues+=("Node 版本过低")
        fi
    else
        echo "❌ Node: 未安装"
        issues+=("Node.js 未安装")
    fi
    
    # 3. Gateway 健康 (权重 30%)
    gateway_health=$(curl -s http://127.0.0.1:18789/health 2>/dev/null)
    if [ -n "$gateway_health" ]; then
        echo "✅ Gateway: 运行中"
        echo "$gateway_health"
        ((score++))
    else
        echo "❌ Gateway: 未运行或端口错误"
        issues+=("Gateway 未启动")
    fi
    
    # 4. 配置文件 (权重 15%)
    if [ -f "$HOME/.openclaw/config.json" ]; then
        echo "✅ 配置文件：存在"
        ((score++))
    else
        echo "⚠️  配置文件：缺失"
        issues+=("配置文件缺失")
    fi
    
    # 5. openclaw status (权重 15%)
    status_output=$(openclaw status 2>&1)
    if echo "$status_output" | grep -q "Gateway"; then
        echo "✅ status: 正常"
        ((score++))
    else
        echo "❌ status: 异常"
        issues+=("openclaw status 失败")
    fi
    
    # 计算健康度
    health_pct=$((score * 100 / total))
    echo ""
    echo "=== 健康报告 ==="
    echo "得分：$score/$total ($health_pct%)"
    
    if [ ${#issues[@]} -gt 0 ]; then
        echo "问题："
        for issue in "${issues[@]}"; do
            echo "  - $issue"
        done
    fi
    
    # 返回健康等级
    if [ $health_pct -ge 80 ]; then
        echo "等级：HEALTHY ✅"
        return 0
    elif [ $health_pct -ge 50 ]; then
        echo "等级：DEGRADED ⚠️"
        return 1
    else
        echo "等级：CRITICAL ❌"
        return 2
    fi
}

check_openclaw
```

---

## 📡 JSON 输出（API 集成）

适用于 openclaw-doctor API 集成，方便前端解析。

### 检测命令

```bash
check_cmd='
OPENCLAW_HEALTH=$(openclaw --version 2>&1 | head -1)
NODE_VER=$(node -v 2>/dev/null || echo "MISSING")
GATEWAY=$(curl -s http://127.0.0.1:18789/health 2>/dev/null || echo "DOWN")
CONFIG="MISSING"
[ -f ~/.openclaw/config.json ] && CONFIG="OK"
STATUS="UNKNOWN"
openclaw status >/dev/null 2>&1 && STATUS="OK"

cat <<EOF
{
  "installed": $(command -v openclaw >/dev/null 2>&1 && echo "true" || echo "false"),
  "version": "$OPENCLAW_HEALTH",
  "node": "$NODE_VER",
  "gateway": $(echo "$GATEWAY" | grep -q "ok" && echo "UP" || echo "DOWN"),
  "config": "$CONFIG",
  "status": "$STATUS",
  "timestamp": "$(date -Iseconds)"
}
EOF
'
```

### 通过 Doctor API 执行

```bash
curl -s "https://YOUR-URL.trycloudflare.com/?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"cmd\":\"bash -c \\\"$check_cmd\\\"\"}"
```

---

## 📊 健康度判断矩阵

| 检测项 | 权重 | 健康 ✅ | 警告 ⚠️ | 故障 ❌ |
|--------|------|--------|--------|--------|
| `openclaw --version` | 20% | 输出版本 | - | 命令不存在 |
| `node -v >= 22.14.0` | 20% | >= 22.14.0 | 22.0-22.13 | < 22 或无 |
| Gateway `/health` | 30% | 返回 200 OK | - | 连接失败 |
| 配置文件存在 | 15% | config.json 存在 | - | 缺失 |
| `openclaw status` | 15% | 正常输出 | 有警告 | 报错 |

### 健康等级

| 等级 | 分数 | 含义 |
|------|------|------|
| **HEALTHY** | 80-100% | 可正常使用 |
| **DEGRADED** | 50-79% | 部分功能异常 |
| **CRITICAL** | 0-49% | 无法使用 |

---

## 🚀 一键检测命令

### 简洁版（快速扫描）

```bash
curl -s "YOUR_DOCTOR_URL/?token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"openclaw --version && openclaw health && echo HEALTHY || echo UNHEALTHY"}'
```

### 完整版（深度诊断）

```bash
curl -s "YOUR_DOCTOR_URL/?token=TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cmd":"bash -c \"openclaw --version; node -v; curl -s http://127.0.0.1:18789/health; openclaw status\""}'
```

---

## 📝 示例输出

### 健康状态（HEALTHY）

```json
{
  "health_score": 100,
  "level": "HEALTHY",
  "checks": {
    "command": {"status": "OK", "value": "OpenClaw 2026.4.9"},
    "node": {"status": "OK", "value": "v22.22.2"},
    "gateway": {"status": "UP", "value": "ok"},
    "config": {"status": "OK", "value": "found"},
    "status": {"status": "OK", "value": "normal"}
  },
  "issues": [],
  "recommendations": [],
  "timestamp": "2026-04-10T17:23:00+08:00"
}
```

### 降级状态（DEGRADED）

```json
{
  "health_score": 60,
  "level": "DEGRADED",
  "checks": {
    "command": {"status": "OK", "value": "OpenClaw 2026.4.9"},
    "node": {"status": "OK", "value": "v22.22.2"},
    "gateway": {"status": "DOWN", "value": "connection failed"},
    "config": {"status": "OK", "value": "found"},
    "status": {"status": "OK", "value": "normal"}
  },
  "issues": ["Gateway 未启动"],
  "recommendations": ["运行 openclaw gateway 启动服务"],
  "timestamp": "2026-04-10T17:23:00+08:00"
}
```

### 严重状态（CRITICAL）

```json
{
  "health_score": 0,
  "level": "CRITICAL",
  "checks": {
    "command": {"status": "MISSING", "value": "command not found"},
    "node": {"status": "MISSING", "value": "command not found"},
    "gateway": {"status": "DOWN", "value": "connection failed"},
    "config": {"status": "MISSING", "value": "not found"},
    "status": {"status": "UNKNOWN", "value": "command not found"}
  },
  "issues": ["openclaw 命令不在 PATH 中", "Node.js 未安装", "Gateway 未启动", "配置文件缺失"],
  "recommendations": ["安装 Node.js >= 22.14.0", "运行 npm install -g openclaw"],
  "timestamp": "2026-04-10T17:23:00+08:00"
}
```

---

## 💡 最佳实践

### 1. 分级检测策略

```
用户访问 Doctor → 快速检测（5 秒）
                ↓
          用户点击"详细" → 完整检测（30 秒）
                ↓
          发现问题 → 显示修复建议
```

### 2. 修复建议映射

| 问题 | 修复命令 |
|------|---------|
| Node 版本过低 | `nvm install 22 && nvm use 22 && nvm alias default 22` |
| Gateway 未启动 | `openclaw gateway` |
| 命令不存在 | `npm install -g openclaw` |
| 配置文件缺失 | `openclaw configure` |

### 3. 跨平台兼容

```bash
# Linux/macOS
command -v openclaw >/dev/null 2>&1

# Windows PowerShell
Get-Command openclaw -ErrorAction SilentlyContinue

# Windows CMD
where openclaw >nul 2>&1
```

---

## 🔧 扩展建议

1. **添加 Channel 检测** - 检查已配置的 channel 状态
2. **添加技能检测** - 扫描已安装的技能列表
3. **添加 Cron 检测** - 检查定时任务是否正常
4. **添加日志分析** - 扫描最近错误日志
5. **自动修复模式** - 一键执行修复命令

---

**文档版本：** 1.0  
**最后更新：** 2026-04-10  
**适用版本：** OpenClaw 2026.4.9+
