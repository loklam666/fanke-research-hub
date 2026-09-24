#!/bin/bash
# GitHub 分批推送重试脚本：等待网络窗口，连通后自动完成全部推送
cd "C:/Users/loklam/WorkBuddy/2026-09-24-14-19-37/fanke-research-hub" || exit 1
export GIT_TERMINAL_PROMPT=0

push_retry() {
  local label="$1"
  for i in $(seq 1 12); do
    if git push >/tmp/push_log.txt 2>&1; then
      echo "[$(date +%H:%M:%S)] PUSH OK: $label"
      return 0
    fi
    echo "[$(date +%H:%M:%S)] push retry $i for $label: $(tail -1 /tmp/push_log.txt | cut -c1-80)"
    sleep 40
  done
  return 1
}

# 1. 推源码提交
push_retry "源码(logos.html/脚本/README)" || { echo "FINAL: FAILED at source commit"; exit 1; }

# 2. logo 分 3 批提交推送（每批约 1.5MB）
cd assets/logos
mapfile -t all < <(ls | grep -vE "^index\.json$" | sort)
cd ../..
total=${#all[@]}
n=3
per=$(( (total + n - 1) / n ))
names=("互联网/AI/游戏等" "硬件/汽车/国际科技等" "金融/咨询/快消/医药等")
for k in 0 1 2; do
  files=("${all[@]:k*per:per}")
  [ ${#files[@]} -eq 0 ] && continue
  git add -- "${files[@]/#/assets/logos/}"
  git -c user.name="loklam666" -c user.email="loklam666@users.noreply.github.com" commit -q -m "assets: 公司 logo 素材 第$((k+1))/$n 批（${names[$k]}）"
  push_retry "logo 第$((k+1))/$n 批" || { echo "FINAL: FAILED at logo batch $((k+1))"; exit 1; }
done

# 3. 索引文件
git add assets/logos/index.json assets/logos.js
git -c user.name="loklam666" -c user.email="loklam666@users.noreply.github.com" commit -q -m "assets: logo 索引 index.json + logos.js"
push_retry "logo 索引" || { echo "FINAL: FAILED at index"; exit 1; }

echo "FINAL: ALL_PUSHED"
git status -sb | head -1
