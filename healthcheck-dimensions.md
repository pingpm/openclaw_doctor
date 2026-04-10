# OpenClaw 健康度评估系统 - 代码可执行版

> 所有判断标准均为代码可执行的客观标准，无模糊判断空间。
> 共 7 个维度，每个维度都有明确的检查命令、判定阈值和实现代码。

---

## 📊 综合评分计算

```bash
总分 = Σ(维度得分 × 权重) / 100

评级标准：
- 🟢 优秀 (90-100 分)
- 🟡 良好 (70-89 分)
- 🟠 一般 (50-69 分)
- 🔴 警告 (30-49 分)
- ❌ 危险 (<30 分)
```

---

## 1. Gateway 运行状态 (权重 20%)

**检查命令：** `openclaw gateway status`

**判定标准（客观）：**
| 返回值/输出 | 得分 |
|-------------|------|
| 包含 "running" 或 "started" 或 "active" | 100 |
| 包含 "stopped" 或 "inactive" 或 "dead" | 0 |
| 其他/报错/超时 | 50 |

**实现代码：**
```bash
check_gateway() {
  local output=$(openclaw gateway status 2>&1)
  local exit_code=$?
  
  if [ $exit_code -ne 0 ]; then
    echo 50
    return
  fi
  
  if echo "$output" | grep -qiE "running|started|active"; then
    echo 100
  elif echo "$output" | grep -qiE "stopped|inactive|dead"; then
    echo 0
  else
    echo 50
  fi
}
```

---

## 2. Channel 配置状态 (权重 15%)

**检查命令：** 
- `grep -c "provider:" ~/.openclaw/config.yaml`
- 或 `openclaw status --json | jq '.channels | length'`

**判定标准（客观）：**
| 渠道数量 | 得分 |
|----------|------|
| ≥2 | 100 |
| 1 | 70 |
| 0 或配置文件不存在 | 30 |

**实现代码：**
```bash
check_channel() {
  local config_file="$HOME/.openclaw/config.yaml"
  
  if [ ! -f "$config_file" ]; then
    echo 30
    return
  fi
  
  if command -v jq &> /dev/null; then
    local json_output=$(openclaw status --json 2>/dev/null)
    if [ -n "$json_output" ]; then
      local count=$(echo "$json_output" | jq '.channels | length' 2>/dev/null)
      if [ -n "$count" ] && [ "$count" -ge 0 ] 2>/dev/null; then
        [ "$count" -ge 2 ] && echo 100 && return
        [ "$count" -eq 1 ] && echo 70 && return
        echo 30
        return
      fi
    fi
  fi
  
  local count=$(grep -c "provider:" "$config_file" 2>/dev/null || echo 0)
  [ "$count" -ge 2 ] && echo 100 && return
  [ "$count" -eq 1 ] && echo 70 && return
  echo 30
}
```

---

## 3. 版本新鲜度 (权重 15%)

**检查命令：** 
- `openclaw update status | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" | head -1`
- `npm view openclaw version`

**判定标准（客观 - 语义化版本对比）：**
| 版本差 | 得分 |
|--------|------|
| current == latest | 100 |
| latest - current == 1 (小版本) | 80 |
| latest - current == 2-3 (小版本) | 60 |
| latest - current > 3 或 大版本落后 | 40 |
| 无法获取版本信息 | 50 |

**实现代码：**
```bash
check_version() {
  local current=$(openclaw update status 2>/dev/null | grep -oE "[0-9]+\.[0-9]+\.[0-9]+" | head -1)
  local latest=$(npm view openclaw version 2>/dev/null)
  
  [ -z "$current" ] || [ -z "$latest" ] && echo 50 && return
  [ "$current" = "$latest" ] && echo 100 && return
  
  local cur_major=$(echo "$current" | cut -d. -f1)
  local cur_minor=$(echo "$current" | cut -d. -f2)
  local lat_major=$(echo "$latest" | cut -d. -f1)
  local lat_minor=$(echo "$latest" | cut -d. -f2)
  
  [ "$cur_major" -lt "$lat_major" ] && echo 40 && return
  
  local minor_diff=$((lat_minor - cur_minor))
  [ "$minor_diff" -le 0 ] && echo 100 && return
  [ "$minor_diff" -eq 1 ] && echo 80 && return
  [ "$minor_diff" -le 3 ] && echo 60 && return
  echo 40
}
```

---

## 4. Cron 任务配置 (权重 15%)

**检查命令：** `openclaw cron list`

**判定标准（客观）：**
| 任务数量 | 得分 |
|----------|------|
| ≥3 | 100 |
| 1-2 | 70 |
| 0 | 50 |

**实现代码：**
```bash
check_cron() {
  local output=$(openclaw cron list 2>/dev/null)
  
  echo "$output" | grep -qiE "no jobs|empty|not found" && echo 50 && return
  
  local count=$(echo "$output" | grep -c "jobId" 2>/dev/null || echo 0)
  [ "$count" -ge 3 ] && echo 100 && return
  [ "$count" -ge 1 ] && echo 70 && return
  echo 50
}
```

---

## 5. 技能/插件丰富度 (权重 15%)

**检查命令：** `find ~/.openclaw/skills ~/.openclaw/extensions -name "SKILL.md" | wc -l`

**判定标准（客观）：**
| 技能数量 | 得分 |
|----------|------|
| ≥10 | 100 |
| 5-9 | 80 |
| 2-4 | 60 |
| 0-1 | 40 |

**实现代码：**
```bash
check_skills() {
  local count=$(find ~/.openclaw/skills ~/.openclaw/extensions -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
  
  ! [[ "$count" =~ ^[0-9]+$ ]] && echo 40 && return
  [ "$count" -ge 10 ] && echo 100 && return
  [ "$count" -ge 5 ] && echo 80 && return
  [ "$count" -ge 2 ] && echo 60 && return
  echo 40
}
```

---

## 6. 网络连通性 (权重 15%)

**检查命令：** 
```bash
curl -s -o /dev/null -w "%{http_code}" "https://open.feishu.cn" --max-time 5
curl -s -o /dev/null -w "%{http_code}" "https://registry.npmjs.org" --max-time 5
curl -s -o /dev/null -w "%{http_code}" "https://wttr.in" --max-time 5
```

**判定标准（客观 - HTTP 状态码）：**
| 成功数量 | 得分 |
|----------|------|
| 3/3 (HTTP < 400) | 100 |
| 2/3 | 60 |
| 0-1/3 | 0 |

**实现代码：**
```bash
check_network() {
  local success=0
  
  local code1=$(curl -s -o /dev/null -w "%{http_code}" "https://open.feishu.cn" --max-time 5 2>/dev/null)
  [ "$code1" -lt 400 ] 2>/dev/null && success=$((success + 1))
  
  local code2=$(curl -s -o /dev/null -w "%{http_code}" "https://registry.npmjs.org" --max-time 5 2>/dev/null)
  [ "$code2" -lt 400 ] 2>/dev/null && success=$((success + 1))
  
  local code3=$(curl -s -o /dev/null -w "%{http_code}" "https://wttr.in" --max-time 5 2>/dev/null)
  [ "$code3" -lt 400 ] 2>/dev/null && success=$((success + 1))
  
  [ "$success" -eq 3 ] && echo 100 && return
  [ "$success" -eq 2 ] && echo 60 && return
  echo 0
}
```

---

## 7. 备份状态 (权重 10%)

**检查命令：** 
- `find ~/.openclaw/backups -type f -mtime -7 | wc -l`
- 或 `tmutil status` (macOS)

**判定标准（客观 - 时间计算）：**
| 备份情况 | 得分 |
|----------|------|
| 备份目录存在且 7 天内有文件 | 100 |
| 备份目录存在但>7 天无新备份 | 60 |
| 无备份目录但 Time Machine 开启 | 60 |
| 无任何备份 | 30 |

**实现代码：**
```bash
check_backup() {
  local backup_dir="$HOME/.openclaw/backups"
  
  if [ -d "$backup_dir" ]; then
    local recent=$(find "$backup_dir" -type f -mtime -7 2>/dev/null | wc -l | tr -d ' ')
    local total=$(find "$backup_dir" -type f 2>/dev/null | wc -l | tr -d ' ')
    [ "$recent" -gt 0 ] 2>/dev/null && echo 100 && return
    [ "$total" -gt 0 ] 2>/dev/null && echo 60 && return
    echo 30
    return
  fi
  
  if command -v tmutil &> /dev/null; then
    local tm_status=$(tmutil status 2>/dev/null)
    echo "$tm_status" | grep -qiE "running|success" && echo 100 && return
    echo "$tm_status" | grep -qiE "configured|enabled" && echo 60 && return
  fi
  
  echo 30
}
```

---

## 🚀 完整可执行脚本

```bash
#!/bin/bash
# openclaw-health-check.sh
# OpenClaw 健康度检查脚本（代码可执行版）

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

declare -A WEIGHTS=(
  ["gateway"]=20
  ["channel"]=15
  ["version"]=15
  ["cron"]=15
  ["skills"]=15
  ["network"]=15
  ["backup"]=10
)

# 所有检查函数（见上文各维度）
# check_gateway, check_channel, check_version, check_cron, check_skills, check_network, check_backup

calculate_score() {
  local total=0
  local weight_sum=0
  
  for dim in "${!WEIGHTS[@]}"; do
    local score_func="check_$dim"
    local score=$($score_func)
    local weight=${WEIGHTS[$dim]}
    total=$((total + score * weight))
    weight_sum=$((weight_sum + weight))
  done
  
  echo $((total / weight_sum))
}

generate_report() {
  echo ""
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo -e "${GREEN}     OpenClaw 健康度检查报告${NC}"
  echo -e "${GREEN}════════════════════════════════════════${NC}"
  echo ""
  echo "检查时间：$(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "各维度得分："
  
  for dim in gateway channel version cron skills network backup; do
    local score_func="check_$dim"
    local score=$($score_func)
    local weight=${WEIGHTS[$dim]}
    printf "  %-10s: %3d/100 (权重 %2d%%)\n" "$dim" "$score" "$weight"
  done
  
  local final_score=$(calculate_score)
  
  echo ""
  echo "════════════════════════════════════════"
  echo -e "总分：${GREEN}$final_score / 100${NC}"
  
  if [ $final_score -ge 90 ]; then
    echo -e "评级：${GREEN}🟢 优秀${NC} - 系统健康，无需干预"
  elif [ $final_score -ge 70 ]; then
    echo -e "评级：${YELLOW}🟡 良好${NC} - 基本健康，建议优化"
  elif [ $final_score -ge 50 ]; then
    echo -e "评级：${YELLOW}🟠 一般${NC} - 需要关注，有改进空间"
  elif [ $final_score -ge 30 ]; then
    echo -e "评级：${RED}🔴 警告${NC} - 需要尽快处理"
  else
    echo -e "评级：${RED}❌ 危险${NC} - 系统异常，立即处理"
  fi
  echo "════════════════════════════════════════"
}

generate_report
```

---

## 📋 维度总结表

| 维度 | 权重 | 检查方法 | 判断依据 | 是否可代码化 |
|------|------|----------|----------|-------------|
| Gateway 状态 | 20% | `openclaw gateway status` | 输出文本匹配 | ✅ 是 |
| Channel 配置 | 15% | 配置文件 grep 或 JSON | 数量统计 | ✅ 是 |
| 版本新鲜度 | 15% | `openclaw update` + `npm view` | 语义化版本对比 | ✅ 是 |
| Cron 任务 | 15% | `openclaw cron list` | 数量统计 | ✅ 是 |
| 技能丰富度 | 15% | `find SKILL.md` | 数量统计 | ✅ 是 |
| 网络连通性 | 15% | `curl` 测试 API | HTTP 状态码 | ✅ 是 |
| 备份状态 | 10% | `find -mtime` 或 `tmutil` | 时间计算/状态匹配 | ✅ 是 |

**删除的维度：**
- ❌ 资源使用健康度 - CPU/内存阈值因机器性能差异无法统一标准

---

*最后更新：2026-04-10*
*作者：二龙虾 🦞*
