#!/usr/bin/env bash
# =============================================================================
# Langfuse Monitor — 一键构建 & 拉起脚本
#
# 镜像策略：
#   [需要本地构建] langfuse-web    ./web/Dockerfile    含汉化/定制代码
#   [需要本地构建] langfuse-worker ./worker/Dockerfile 含定制代码
#   [直接拉取]     postgres:17     PostgreSQL 官方镜像
#   [直接拉取]     redis:7         Redis 官方镜像
#   [直接拉取]     clickhouse/clickhouse-server  ClickHouse 官方镜像
#   [直接拉取]     cgr.dev/chainguard/minio      MinIO 官方镜像
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# --- 颜色 ---
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; N='\033[0m'
info()    { echo -e "${B}[INFO]${N}  $*"; }
ok()      { echo -e "${G}[ OK ]${N}  $*"; }
warn()    { echo -e "${Y}[WARN]${N}  $*"; }
error()   { echo -e "${R}[ERR ]${N}  $*" >&2; }
section() { echo -e "\n${B}━━━ $* ${N}"; }

image_exists() {
  docker image inspect "$1" >/dev/null 2>&1
}

use_local_or_pull() {
  local image_ref="$1"

  if image_exists "$image_ref"; then
    ok "优先使用本地镜像: ${image_ref}"
    return 0
  fi

  info "本地未找到镜像，开始拉取: ${image_ref}"

  if docker pull "$image_ref"; then
    ok "镜像拉取完成: ${image_ref}"
    return 0
  fi

  error "拉取失败且本地不存在镜像: ${image_ref}"
  return 1
}

# --- 默认参数 ---
NO_CACHE=""
SKIP_BUILD=false
SKIP_START=false
BUILD_ONLY=false
IMAGE_TAG="latest"
REGISTRY=""            # 例: registry.cn-hangzhou.aliyuncs.com/your-ns
PUSH=false
CN_MIRROR=false
ALPINE_MIRROR="${ALPINE_MIRROR:-}"
NPM_REGISTRY="${NPM_REGISTRY:-}"
GITHUB_RELEASE_MIRROR="${GITHUB_RELEASE_MIRROR:-}"

usage() {
  cat <<EOF
用法: $0 [选项]

选项:
  --no-cache          构建时不使用缓存（首次/强制全量构建）
  --skip-build        跳过构建步骤，直接用已有镜像启动服务
  --skip-start        仅构建镜像，不启动服务
  --build-only        等同于 --skip-start
  --tag TAG           镜像标签，默认 latest
  --registry REG      镜像仓库前缀，构建后打 tag 并可 --push
                      例: --registry registry.cn-hangzhou.aliyuncs.com/myns
  --cn                启用国内加速源（Alpine、npm/pnpm、GitHub Release）
  --push              构建后推送镜像到仓库（需先 docker login）
  -h, --help          显示本帮助

环境变量覆盖:
  ALPINE_MIRROR           Alpine 源，例: https://mirrors.aliyun.com/alpine
  NPM_REGISTRY            npm/pnpm 源，例: https://registry.npmmirror.com
  GITHUB_RELEASE_MIRROR   GitHub 发布代理前缀，例: https://mirror.ghproxy.com
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache)    NO_CACHE="--no-cache"; shift ;;
    --skip-build)  SKIP_BUILD=true; shift ;;
    --skip-start)  SKIP_START=true; shift ;;
    --build-only)  SKIP_START=true; shift ;;
    --tag)         IMAGE_TAG="$2"; shift 2 ;;
    --registry)    REGISTRY="$2"; shift 2 ;;
    --cn)          CN_MIRROR=true; shift ;;
    --push)        PUSH=true; shift ;;
    -h|--help)     usage; exit 0 ;;
    *) error "未知参数: $1"; usage; exit 1 ;;
  esac
done

if [[ "$CN_MIRROR" == "true" ]]; then
  ALPINE_MIRROR="${ALPINE_MIRROR:-https://mirrors.aliyun.com/alpine}"
  NPM_REGISTRY="${NPM_REGISTRY:-https://registry.npmmirror.com}"
  GITHUB_RELEASE_MIRROR="${GITHUB_RELEASE_MIRROR:-https://mirror.ghproxy.com}"
fi

# 镜像名（有 REGISTRY 则加前缀）
web_image="${REGISTRY:+${REGISTRY}/}langfuse-monitor-web:${IMAGE_TAG}"
worker_image="${REGISTRY:+${REGISTRY}/}langfuse-monitor-worker:${IMAGE_TAG}"

# ─────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Langfuse Monitor — 一键构建 & 拉起      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ─────────────────────────────────────────────
# 前置检查
# ─────────────────────────────────────────────
section "前置检查"

command -v docker &>/dev/null || { error "未找到 docker，请先安装 Docker Engine"; exit 1; }

if docker compose version &>/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "未找到 docker compose，请安装 Docker Compose v2"
  exit 1
fi
ok "Docker Compose: $COMPOSE"

if [[ -n "$ALPINE_MIRROR" || -n "$NPM_REGISTRY" || -n "$GITHUB_RELEASE_MIRROR" ]]; then
  info "构建加速配置:"
  [[ -n "$ALPINE_MIRROR" ]] && info "  ALPINE_MIRROR=$ALPINE_MIRROR"
  [[ -n "$NPM_REGISTRY" ]] && info "  NPM_REGISTRY=$NPM_REGISTRY"
  [[ -n "$GITHUB_RELEASE_MIRROR" ]] && info "  GITHUB_RELEASE_MIRROR=$GITHUB_RELEASE_MIRROR"
fi

# 确认 compose 文件存在
[[ -f docker-compose.build.yml ]] || { error "未找到 docker-compose.build.yml"; exit 1; }

# ─────────────────────────────────────────────
# Step 1 — 拉取基础设施镜像
# ─────────────────────────────────────────────
section "Step 1/4 — 拉取基础设施镜像（官方镜像，无需构建）"
POSTGRES_IMAGE="docker.io/postgres:${POSTGRES_VERSION:-17}"
REDIS_IMAGE="docker.io/redis:7"
CLICKHOUSE_IMAGE="docker.io/clickhouse/clickhouse-server"
MINIO_IMAGE="cgr.dev/chainguard/minio"

echo "  ▸ ${CLICKHOUSE_IMAGE}   ClickHouse 分析数据库"
echo "  ▸ ${POSTGRES_IMAGE}                    PostgreSQL 主数据库"
echo "  ▸ ${REDIS_IMAGE}                        Redis 缓存/队列"
echo "  ▸ ${MINIO_IMAGE}       MinIO 对象存储"
echo ""

use_local_or_pull "$CLICKHOUSE_IMAGE"
use_local_or_pull "$POSTGRES_IMAGE"
use_local_or_pull "$REDIS_IMAGE"
use_local_or_pull "$MINIO_IMAGE"
ok "基础设施镜像就绪"

# ─────────────────────────────────────────────
# Step 2 — 构建自定义镜像
# ─────────────────────────────────────────────
section "Step 2/4 — 构建自定义镜像（含汉化/定制代码）"

if [[ "$SKIP_BUILD" == "true" ]]; then
  warn "已设置 --skip-build，跳过构建，使用本地已有镜像"
else
  echo "  ▸ langfuse-monitor-web    使用 ./web/Dockerfile"
  echo "  ▸ langfuse-monitor-worker 使用 ./worker/Dockerfile"
  echo ""

  # 构建 web
  info "构建 ${web_image} ..."
  info "（首次构建约 5~15 分钟，含 pnpm install + Next.js build）"
  docker build $NO_CACHE \
    -f web/Dockerfile \
    -t "$web_image" \
    ${ALPINE_MIRROR:+--build-arg ALPINE_MIRROR=$ALPINE_MIRROR} \
    ${NPM_REGISTRY:+--build-arg NPM_REGISTRY=$NPM_REGISTRY} \
    ${GITHUB_RELEASE_MIRROR:+--build-arg GITHUB_RELEASE_MIRROR=$GITHUB_RELEASE_MIRROR} \
    --label "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "build.repo=langfuse-monitor" \
    .
  ok "web 镜像构建完成: ${web_image}"

  # 构建 worker
  info "构建 ${worker_image} ..."
  docker build $NO_CACHE \
    -f worker/Dockerfile \
    -t "$worker_image" \
    ${ALPINE_MIRROR:+--build-arg ALPINE_MIRROR=$ALPINE_MIRROR} \
    ${NPM_REGISTRY:+--build-arg NPM_REGISTRY=$NPM_REGISTRY} \
    --label "build.date=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --label "build.repo=langfuse-monitor" \
    .
  ok "worker 镜像构建完成: ${worker_image}"

  # ── 可选：推送到镜像仓库 ──
  if [[ "$PUSH" == "true" ]]; then
    if [[ -z "$REGISTRY" ]]; then
      warn "--push 需要同时指定 --registry，跳过推送"
    else
      section "推送镜像到仓库: $REGISTRY"
      docker push "$web_image"
      docker push "$worker_image"
      ok "镜像推送完成"
    fi
  fi
fi

# ─────────────────────────────────────────────
# Step 3 — 生成 compose override（映射本地构建的镜像名）
# ─────────────────────────────────────────────
OVERRIDE_FILE="$(mktemp /tmp/langfuse-override-XXXXXX.yml)"
trap 'rm -f "$OVERRIDE_FILE"' EXIT

cat > "$OVERRIDE_FILE" <<OVERRIDE_EOF
# 自动生成的 override 文件 —— 将 build 指令替换为本地构建的镜像
services:
  langfuse-web:
    image: ${web_image}
  langfuse-worker:
    image: ${worker_image}
OVERRIDE_EOF

# ─────────────────────────────────────────────
# Step 4 — 启动所有服务
# ─────────────────────────────────────────────
section "Step 3/4 — 准备就绪，服务清单"
echo "  [构建镜像]  langfuse-web     → ${web_image}"
echo "  [构建镜像]  langfuse-worker  → ${worker_image}"
echo "  [直接拉取]  postgres"
echo "  [直接拉取]  redis"
echo "  [直接拉取]  clickhouse"
echo "  [直接拉取]  minio"

if [[ "$SKIP_START" == "true" ]]; then
  warn "已设置 --skip-start / --build-only，跳过启动服务"
  echo ""
  info "手动启动命令:"
  echo "  $COMPOSE -f docker-compose.build.yml -f <override.yml> up -d --no-build"
  exit 0
fi

section "Step 4/4 — 启动所有服务"

# 如跳过构建（--skip-build），直接用 build 指令让 compose 决定是否重建
if [[ "$SKIP_BUILD" == "true" ]]; then
  if ! image_exists "$web_image" || ! image_exists "$worker_image"; then
    error "已设置 --skip-build，但本地未找到 ${web_image} 或 ${worker_image}"
    error "请先执行一次: $0"
    exit 1
  fi

  $COMPOSE -f docker-compose.build.yml -f "$OVERRIDE_FILE" up -d --remove-orphans --no-build
else
  # 使用 override 指定本地已构建的镜像，避免 compose 重复构建
  $COMPOSE -f docker-compose.build.yml -f "$OVERRIDE_FILE" up -d --remove-orphans --no-build
fi

# ─────────────────────────────────────────────
# 等待 web 健康检查
# ─────────────────────────────────────────────
echo ""
info "等待 Web 服务就绪 (健康检查 http://localhost:3000/api/public/health) ..."
MAX_WAIT=180
elapsed=0
until curl -sf "http://localhost:3000/api/public/health" &>/dev/null; do
  if (( elapsed >= MAX_WAIT )); then
    error "超时 ${MAX_WAIT}s，Web 服务仍未就绪，请检查日志："
    error "  $COMPOSE -f docker-compose.build.yml logs --tail=50 langfuse-web"
    exit 1
  fi
  echo -n "."
  sleep 5
  (( elapsed += 5 ))
done

# ─────────────────────────────────────────────
# 成功输出
# ─────────────────────────────────────────────
echo ""
ok "所有服务已成功启动！"
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║  访问地址                                  ║"
echo "║  Web UI  →  http://localhost:3000         ║"
echo "║  Worker  →  http://localhost:3030/api/health ║"
echo "║  MinIO   →  http://localhost:9090         ║"
echo "╠══════════════════════════════════════════╣"
echo "║  默认账号                                  ║"
echo "║  邮箱:  demo@langfuse.com                 ║"
echo "║  密码:  password                          ║"
echo "╠══════════════════════════════════════════╣"
echo "║  常用管理命令                               ║"
echo "║  查看日志:  docker compose -f docker-compose.build.yml logs -f  ║"
echo "║  停止服务:  docker compose -f docker-compose.build.yml down     ║"
echo "║  重启Web:   docker compose -f docker-compose.build.yml restart langfuse-web ║"
echo "╚══════════════════════════════════════════╝"
