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

read_dotenv_value() {
  local key="$1"
  local env_file="$SCRIPT_DIR/.env"

  [[ -f "$env_file" ]] || return 1

  awk -F= -v key="$key" '
    $0 ~ "^[[:space:]]*" key "=" {
      sub("^[[:space:]]*" key "=", "", $0)
      print $0
      exit
    }
  ' "$env_file"
}

trim_whitespace() {
  local value="$1"

  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

strip_optional_quotes() {
  local value="$1"

  if [[ "$value" =~ ^\".*\"$ ]]; then
    printf '%s' "${value:1:-1}"
    return
  fi

  if [[ "$value" =~ ^\'.*\'$ ]]; then
    printf '%s' "${value:1:-1}"
    return
  fi

  printf '%s' "$value"
}

load_from_dotenv_if_unset() {
  local key="$1"
  local raw_value
  local normalized_value

  if [[ -n "${!key:-}" ]]; then
    return 0
  fi

  raw_value="$(read_dotenv_value "$key" || true)"
  raw_value="$(trim_whitespace "$raw_value")"

  if [[ -z "$raw_value" ]]; then
    return 0
  fi

  normalized_value="$(strip_optional_quotes "$raw_value")"
  printf -v "$key" '%s' "$normalized_value"
}

image_exists() {
  docker image inspect "$1" >/dev/null 2>&1
}

is_port_in_use() {
  local port="$1"

  if command_exists ss; then
    ss -ltn "( sport = :$port )" | tail -n +2 | grep -q .
    return $?
  fi

  if command_exists lsof; then
    lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi

  return 1
}

warn_if_port_in_use() {
  local port="$1"
  local service_name="$2"

  if is_port_in_use "$port"; then
    warn "端口 $port 已被占用，${service_name} 可能启动失败"
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

detect_migrate_arch() {
  local machine_arch
  machine_arch="$(uname -m)"

  case "$machine_arch" in
    x86_64|amd64) echo "linux-amd64" ;;
    aarch64|arm64) echo "linux-arm64" ;;
    *)
      error "当前机器架构暂未适配 golang-migrate 预下载: $machine_arch"
      return 1
      ;;
  esac
}

download_to_file() {
  local url="$1"
  local output_file="$2"

  if command_exists curl; then
    curl -fL --connect-timeout 10 --max-time 180 "$url" -o "$output_file"
    return $?
  fi

  if command_exists wget; then
    wget -O "$output_file" "$url"
    return $?
  fi

  error "宿主机未安装 curl 或 wget，无法自动下载构建依赖"
  return 1
}

ensure_local_migrate_tarball() {
  local migrate_arch
  local cache_dir
  local cache_file
  local upstream_url
  local candidate_urls=()

  migrate_arch="$(detect_migrate_arch)" || return 1
  cache_dir="$SCRIPT_DIR/.docker-cache/migrate"
  cache_file="$cache_dir/migrate.$migrate_arch.tar.gz"
  upstream_url="https://github.com/golang-migrate/migrate/releases/download/v4.19.1/migrate.$migrate_arch.tar.gz"

  mkdir -p "$cache_dir"

  if [[ -f "$cache_file" ]]; then
    ok "优先使用本地 migrate 压缩包: $cache_file"
    return 0
  fi

  candidate_urls+=("$upstream_url")

  if [[ -n "$GITHUB_RELEASE_MIRROR" ]]; then
    candidate_urls+=("${GITHUB_RELEASE_MIRROR%/}/$upstream_url")
  fi

  candidate_urls+=("https://mirror.ghproxy.com/$upstream_url")

  for candidate_url in "${candidate_urls[@]}"; do
    info "预下载 migrate 压缩包: $candidate_url"
    if download_to_file "$candidate_url" "$cache_file.tmp"; then
      mv "$cache_file.tmp" "$cache_file"
      ok "已缓存 migrate 压缩包: $cache_file"
      return 0
    fi
    rm -f "$cache_file.tmp"
  done

  warn "自动下载 migrate 压缩包失败。你也可以手动放置文件后重试: $cache_file"
  return 0
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

resolve_storage_path() {
  local input_path="$1"
  local resolved_path

  if [[ "$input_path" != /* ]]; then
    input_path="$SCRIPT_DIR/$input_path"
  fi

  mkdir -p "$input_path"
  resolved_path="$(cd "$input_path" && pwd -P)"
  printf '%s' "$resolved_path"
}

docker_volume_exists() {
  docker volume inspect "$1" >/dev/null 2>&1
}

directory_is_empty() {
  local dir_path="$1"

  [[ ! -d "$dir_path" ]] && return 0
  [[ -z "$(find "$dir_path" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]
}

ensure_storage_directories() {
  mkdir -p \
    "$LANGFUSE_DATA_DIR/postgres" \
    "$LANGFUSE_DATA_DIR/redis" \
    "$LANGFUSE_DATA_DIR/minio" \
    "$LANGFUSE_DATA_DIR/clickhouse/data" \
    "$LANGFUSE_DATA_DIR/clickhouse/logs"

  chmod 700 "$LANGFUSE_DATA_DIR/postgres" 2>/dev/null || true
  chmod -R a+rwX "$LANGFUSE_DATA_DIR/redis" 2>/dev/null || true
  chmod -R a+rwX "$LANGFUSE_DATA_DIR/minio" 2>/dev/null || true
  chmod -R a+rwX "$LANGFUSE_DATA_DIR/clickhouse" 2>/dev/null || true
}

copy_named_volume_to_directory() {
  local volume_name="$1"
  local target_dir="$2"
  local label="$3"

  info "迁移 ${label}: ${volume_name} -> ${target_dir}"
  mkdir -p "$target_dir"

  docker run --rm \
    --entrypoint sh \
    -v "${volume_name}:/from" \
    -v "${target_dir}:/to" \
    "$POSTGRES_IMAGE" \
    -c 'set -eu; mkdir -p /to; cp -a /from/. /to/'

  ok "已完成 ${label} 迁移"
}

prepare_storage_permissions() {
  info "校准宿主机持久化目录权限"

  docker run --rm \
    --entrypoint sh \
    -v "${LANGFUSE_DATA_DIR}:/data" \
    "$POSTGRES_IMAGE" \
    -c '
      set -eu
      mkdir -p /data/minio /data/redis /data/clickhouse/data /data/clickhouse/logs
      chmod 0777 /data/minio /data/redis
      chown -R 101:101 /data/clickhouse/data /data/clickhouse/logs
    '

  ok "持久化目录权限已准备完成"
}

migrate_named_volume_if_needed() {
  local volume_name="$1"
  local target_dir="$2"
  local label="$3"

  if ! docker_volume_exists "$volume_name"; then
    return 0
  fi

  if directory_is_empty "$target_dir"; then
    copy_named_volume_to_directory "$volume_name" "$target_dir" "$label"
    return 0
  fi

  warn "检测到旧命名卷 ${volume_name}，但 ${target_dir} 已有内容；为避免覆盖，跳过自动迁移"
}

migrate_legacy_named_volumes() {
  local migration_required=false

  if docker_volume_exists "langfuse_postgres_data" && directory_is_empty "$LANGFUSE_DATA_DIR/postgres"; then
    migration_required=true
  fi
  if docker_volume_exists "langfuse_clickhouse_data" && directory_is_empty "$LANGFUSE_DATA_DIR/clickhouse/data"; then
    migration_required=true
  fi
  if docker_volume_exists "langfuse_clickhouse_logs" && directory_is_empty "$LANGFUSE_DATA_DIR/clickhouse/logs"; then
    migration_required=true
  fi
  if docker_volume_exists "langfuse_minio_data" && directory_is_empty "$LANGFUSE_DATA_DIR/minio"; then
    migration_required=true
  fi

  if [[ "$migration_required" != "true" ]]; then
    return 0
  fi

  section "迁移旧版命名卷数据"
  warn "检测到旧版 Docker 命名卷，准备迁移到宿主机目录: $LANGFUSE_DATA_DIR"
  warn "迁移过程中不会删除旧命名卷，确认新目录可正常启动后再自行清理"

  $COMPOSE -f docker-compose.build.yml down --remove-orphans >/dev/null 2>&1 || true

  migrate_named_volume_if_needed "langfuse_postgres_data" "$LANGFUSE_DATA_DIR/postgres" "PostgreSQL 数据"
  migrate_named_volume_if_needed "langfuse_clickhouse_data" "$LANGFUSE_DATA_DIR/clickhouse/data" "ClickHouse 数据"
  migrate_named_volume_if_needed "langfuse_clickhouse_logs" "$LANGFUSE_DATA_DIR/clickhouse/logs" "ClickHouse 日志"
  migrate_named_volume_if_needed "langfuse_minio_data" "$LANGFUSE_DATA_DIR/minio" "MinIO 数据"

  ensure_storage_directories
}

# --- 默认参数 ---
NO_CACHE=""
SKIP_BUILD=false
SKIP_START=false
BUILD_ONLY=false
DOWN_FIRST=false
IMAGE_TAG="latest"
REGISTRY=""            # 例: registry.cn-hangzhou.aliyuncs.com/your-ns
PUSH=false
CN_MIRROR=false
ALPINE_MIRROR="${ALPINE_MIRROR:-}"
NPM_REGISTRY="${NPM_REGISTRY:-}"
GITHUB_RELEASE_MIRROR="${GITHUB_RELEASE_MIRROR:-}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-http://10.86.0.32:4000}"
LANGFUSE_WEB_PORT="${LANGFUSE_WEB_PORT:-4000}"
LANGFUSE_WORKER_PORT="${LANGFUSE_WORKER_PORT:-4030}"
MINIO_API_PORT="${MINIO_API_PORT:-8090}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-8091}"
CLICKHOUSE_HTTP_PORT="${CLICKHOUSE_HTTP_PORT:-8123}"
CLICKHOUSE_NATIVE_PORT="${CLICKHOUSE_NATIVE_PORT:-9000}"
REDIS_HOST_PORT="${REDIS_HOST_PORT:-6379}"
POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT:-5432}"
LANGFUSE_DATA_DIR="${LANGFUSE_DATA_DIR:-.langfuse-data}"

for dotenv_key in \
  ALPINE_MIRROR \
  NPM_REGISTRY \
  GITHUB_RELEASE_MIRROR \
  PUBLIC_BASE_URL \
  LANGFUSE_WEB_PORT \
  LANGFUSE_WORKER_PORT \
  MINIO_API_PORT \
  MINIO_CONSOLE_PORT \
  CLICKHOUSE_HTTP_PORT \
  CLICKHOUSE_NATIVE_PORT \
  REDIS_HOST_PORT \
  POSTGRES_HOST_PORT \
  LANGFUSE_DATA_DIR \
  NEXTAUTH_URL; do
  load_from_dotenv_if_unset "$dotenv_key"
done

usage() {
  cat <<EOF
用法: $0 [选项]

选项:
  --no-cache          构建时不使用缓存（首次/强制全量构建）
  --skip-build        跳过构建步骤，直接用已有镜像启动服务
  --skip-start        仅构建镜像，不启动服务
  --build-only        等同于 --skip-start
  --down-first        启动前先停止并删除当前 compose 栈容器
  --tag TAG           镜像标签，默认 latest
  --registry REG      镜像仓库前缀，构建后打 tag 并可 --push
                      例: --registry registry.cn-hangzhou.aliyuncs.com/myns
  --cn                启用国内加速源（Alpine、npm/pnpm、GitHub Release）
  --push              构建后推送镜像到仓库（需先 docker login）
  -h, --help          显示本帮助

环境变量覆盖:
  LANGFUSE_WEB_PORT        Web 主机端口，默认 4000
  LANGFUSE_WORKER_PORT     Worker 主机端口，默认 4030
  MINIO_API_PORT           MinIO API 主机端口，默认 8090
  MINIO_CONSOLE_PORT       MinIO Console 主机端口，默认 8091
  CLICKHOUSE_HTTP_PORT     ClickHouse HTTP 主机端口，默认 8123
  CLICKHOUSE_NATIVE_PORT   ClickHouse Native 主机端口，默认 9000
  REDIS_HOST_PORT          Redis 主机端口，默认 6379
  POSTGRES_HOST_PORT       PostgreSQL 主机端口，默认 5432
  LANGFUSE_DATA_DIR        宿主机数据目录，默认 ./.langfuse-data
  ALPINE_MIRROR           Alpine 源，例: https://mirrors.aliyun.com/alpine
  NPM_REGISTRY            npm/pnpm 源，例: https://registry.npmmirror.com
  GITHUB_RELEASE_MIRROR   GitHub 发布代理前缀，例: https://mirror.ghproxy.com
  PUBLIC_BASE_URL         外部访问地址，未设置 NEXTAUTH_URL 时会自动用于登录/注册跳转
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-cache)    NO_CACHE="--no-cache"; shift ;;
    --skip-build)  SKIP_BUILD=true; shift ;;
    --skip-start)  SKIP_START=true; shift ;;
    --build-only)  SKIP_START=true; shift ;;
    --down-first)  DOWN_FIRST=true; shift ;;
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

LANGFUSE_DATA_DIR="$(resolve_storage_path "$LANGFUSE_DATA_DIR")"
ensure_storage_directories

if [[ "$DOWN_FIRST" == "true" ]]; then
  section "清理现有容器"
  info "停止并删除当前 compose 栈中的容器（保留宿主机数据目录）"
  $COMPOSE -f docker-compose.build.yml down --remove-orphans
fi

if [[ -z "${NEXTAUTH_URL:-}" ]]; then
  if [[ -n "$PUBLIC_BASE_URL" ]]; then
    export NEXTAUTH_URL="${PUBLIC_BASE_URL%/}"
  else
    export NEXTAUTH_URL="http://localhost:${LANGFUSE_WEB_PORT}"
  fi
fi

export LANGFUSE_WEB_PORT
export LANGFUSE_WORKER_PORT
export MINIO_API_PORT
export MINIO_CONSOLE_PORT
export CLICKHOUSE_HTTP_PORT
export CLICKHOUSE_NATIVE_PORT
export REDIS_HOST_PORT
export POSTGRES_HOST_PORT
export LANGFUSE_DATA_DIR

if [[ -n "$ALPINE_MIRROR" || -n "$NPM_REGISTRY" || -n "$GITHUB_RELEASE_MIRROR" ]]; then
  info "构建加速配置:"
  [[ -n "$ALPINE_MIRROR" ]] && info "  ALPINE_MIRROR=$ALPINE_MIRROR"
  [[ -n "$NPM_REGISTRY" ]] && info "  NPM_REGISTRY=$NPM_REGISTRY"
  [[ -n "$GITHUB_RELEASE_MIRROR" ]] && info "  GITHUB_RELEASE_MIRROR=$GITHUB_RELEASE_MIRROR"
fi

info "主机端口配置:"
info "  Web=$LANGFUSE_WEB_PORT Worker=$LANGFUSE_WORKER_PORT MinIO API=$MINIO_API_PORT MinIO Console=$MINIO_CONSOLE_PORT"
info "  ClickHouse HTTP=$CLICKHOUSE_HTTP_PORT ClickHouse Native=$CLICKHOUSE_NATIVE_PORT Redis=$REDIS_HOST_PORT Postgres=$POSTGRES_HOST_PORT"
info "  数据目录=$LANGFUSE_DATA_DIR"
info "  NEXTAUTH_URL=$NEXTAUTH_URL"

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

migrate_legacy_named_volumes
prepare_storage_permissions

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

  ensure_local_migrate_tarball

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

warn_if_port_in_use "$LANGFUSE_WEB_PORT" "langfuse-web"
warn_if_port_in_use "$LANGFUSE_WORKER_PORT" "langfuse-worker"
warn_if_port_in_use "$MINIO_API_PORT" "minio api"
warn_if_port_in_use "$MINIO_CONSOLE_PORT" "minio console"
warn_if_port_in_use "$CLICKHOUSE_HTTP_PORT" "clickhouse http"
warn_if_port_in_use "$CLICKHOUSE_NATIVE_PORT" "clickhouse native"
warn_if_port_in_use "$REDIS_HOST_PORT" "redis"
warn_if_port_in_use "$POSTGRES_HOST_PORT" "postgres"

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
info "等待 Web 服务就绪 (健康检查 http://localhost:${LANGFUSE_WEB_PORT}/api/public/health) ..."
MAX_WAIT=180
elapsed=0
until curl -sf "http://localhost:${LANGFUSE_WEB_PORT}/api/public/health" &>/dev/null; do
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
echo "║  Web UI  →  ${NEXTAUTH_URL}         ║"
echo "║  Worker  →  http://localhost:${LANGFUSE_WORKER_PORT}/api/health ║"
echo "║  MinIO   →  http://localhost:${MINIO_API_PORT}         ║"
echo "║  数据目录 →  ${LANGFUSE_DATA_DIR} ║"
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
