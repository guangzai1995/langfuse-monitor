#!/usr/bin/env bash
# =============================================================================
# 九思 AI 监控平台（Langfuse）启动脚本
# =============================================================================
# 说明：
#   本项目源码位于当前目录，但运行时依赖 /opt/langfuse 中已编译好的
#   node_modules。Web / Worker 进程从 /opt/langfuse 启动，日志写入 /tmp。
#   该脚本运行在开发容器内，只负责检查外部基础服务并启动进程，
#   不负责启动或停止 Docker / Compose 基础设施。
#
# 依赖基础服务：
#   PostgreSQL  localhost:5432
#   Redis       localhost:6379  密码：myredissecret
#   ClickHouse  localhost:8123/9000
#   MinIO       localhost:9090 / 9091
#
# 用法：
#   ./start.sh                     # 检查基础服务并启动 Web + Worker
#   ./start.sh web                 # 检查基础服务并启动 Web
#   ./start.sh worker              # 检查基础服务并启动 Worker
#   ./start.sh infra               # 仅检查基础服务状态
#   ./start.sh stop                # 停止 Web + Worker
#   ./start.sh status              # 查看运行状态
#   ./start.sh logs                # 实时查看 Web 日志
#   ./start.sh logs worker         # 实时查看 Worker 日志
#   ./start.sh logs postgres       # 显示 PostgreSQL 连接提示
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$SCRIPT_DIR"
LANGFUSE_DIR="/opt/langfuse"
WEB_LOG="/tmp/langfuse-dev.log"
WORKER_LOG="/tmp/langfuse-worker.log"
WEB_PID_FILE="/tmp/langfuse-web.pid"
WORKER_PID_FILE="/tmp/langfuse-worker.pid"

# ── 颜色 ──────────────────────────────────────────────────────────────────
CYAN="\033[96m"
GREEN="\033[92m"
YELLOW="\033[93m"
RED="\033[91m"
BOLD="\033[1m"
RESET="\033[0m"

info()    { echo -e "${CYAN}[INFO]${RESET}  $*"; }
success() { echo -e "${GREEN}[OK]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[WARN]${RESET}  $*"; }
error()   { echo -e "${RED}[ERROR]${RESET} $*"; }

require_command() {
    local cmd="$1"
    local message="$2"

    command -v "$cmd" >/dev/null 2>&1 || {
        error "$message"
        exit 1
    }
}

usage() {
    cat <<'EOF'
用法: ./start.sh {all|web|worker|infra|stop [app|infra|all]|status|logs [web|worker|postgres|redis|clickhouse|minio]}

说明：
  all         检查/启动基础服务并启动 Web + Worker
  web         检查/启动基础服务并启动 Web
  worker      检查/启动基础服务并启动 Worker
  infra       启动所有基础服务（PostgreSQL/Redis/ClickHouse/MinIO）
  stop        停止 Web + Worker（默认）
  stop infra  停止所有基础服务
  stop all    停止 Web + Worker + 所有基础服务
  status      查看当前状态
  logs        查看日志
EOF
}

run_with_timeout() {
    local seconds="$1"
    shift

    if command -v timeout >/dev/null 2>&1; then
        timeout "${seconds}s" "$@"
    else
        "$@"
    fi
}

postgres_ready() {
    command -v pg_isready >/dev/null 2>&1 && pg_isready -h 127.0.0.1 -p 5432 -U postgres -t 2 -q 2>/dev/null
}

redis_ready() {
    command -v redis-cli >/dev/null 2>&1 && run_with_timeout 2 redis-cli -h 127.0.0.1 -p 6379 -a myredissecret ping 2>/dev/null | grep -q PONG
}

clickhouse_ready() {
    command -v curl >/dev/null 2>&1 && curl --connect-timeout 2 --max-time 3 -sf http://127.0.0.1:8123/ping 2>/dev/null | grep -q "Ok"
}

minio_ready() {
    command -v curl >/dev/null 2>&1 && curl --connect-timeout 2 --max-time 3 -sf http://127.0.0.1:9090/minio/health/live >/dev/null 2>&1
}

pid_is_running() {
    local pid_file="$1"

    [ -f "$pid_file" ] || return 1

    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    [ -n "$pid" ] || return 1

    kill -0 "$pid" 2>/dev/null
}

cleanup_stale_pid() {
    local pid_file="$1"

    if [ -f "$pid_file" ] && ! pid_is_running "$pid_file"; then
        rm -f "$pid_file"
    fi
}


# ── 检查基础服务 ─────────────────────────────────────────────────────────
check_deps() {
    local ok=true
    local quiet="${1:-false}"

    if [ "$quiet" != "true" ]; then
        info "检查基础服务..."
    fi

    if postgres_ready; then
        [ "$quiet" = "true" ] || success "PostgreSQL 已运行"
    else
        [ "$quiet" = "true" ] || warn "PostgreSQL 未运行（localhost:5432）"
        ok=false
    fi

    if redis_ready; then
        [ "$quiet" = "true" ] || success "Redis 已运行"
    else
        [ "$quiet" = "true" ] || warn "Redis 未响应（localhost:6379）"
        ok=false
    fi

    if clickhouse_ready; then
        [ "$quiet" = "true" ] || success "ClickHouse 已运行"
    else
        [ "$quiet" = "true" ] || warn "ClickHouse 未响应（localhost:8123）"
        ok=false
    fi

    if minio_ready; then
        [ "$quiet" = "true" ] || success "MinIO 已运行"
    else
        [ "$quiet" = "true" ] || warn "MinIO 未响应（localhost:9090）"
        ok=false
    fi

    $ok
}

ensure_infra() {
    if check_deps true; then
        info "基础服务已就绪"
        return
    fi

    start_infra

    if ! check_deps true; then
        check_deps false || true
        error "基础服务未能全部就绪，请检查上方日志"
        exit 1
    fi
}

ensure_runtime_dir() {
    local target="$1"
    local target_dir="$LANGFUSE_DIR/$target"

    [ -d "$target_dir" ] || {
        error "未找到运行目录：$target_dir"
        exit 1
    }
}

sync_runtime_dir() {
    local relative_dir="$1"
    local source_dir="$REPO_DIR/$relative_dir"
    local target_dir="$LANGFUSE_DIR/$relative_dir"

    [ -d "$source_dir" ] || return 0

    rm -rf "$target_dir"
    mkdir -p "$(dirname "$target_dir")"
    cp -a "$source_dir" "$target_dir"
}

sync_runtime_file() {
    local relative_file="$1"
    local source_file="$REPO_DIR/$relative_file"
    local target_file="$LANGFUSE_DIR/$relative_file"

    [ -f "$source_file" ] || return 0

    mkdir -p "$(dirname "$target_file")"
    cp -a "$source_file" "$target_file"
}

sync_runtime_sources() {
    info "同步工作区源码到运行目录..."

    sync_runtime_dir web/src
    sync_runtime_dir web/public
    sync_runtime_dir worker/src
    sync_runtime_dir packages/shared/src
    sync_runtime_dir packages/shared/prisma
    sync_runtime_dir packages/shared/clickhouse

    sync_runtime_file web/package.json
    sync_runtime_file web/next.config.mjs
    sync_runtime_file web/postcss.config.cjs
    sync_runtime_file web/tsconfig.json
    sync_runtime_file web/tsconfig.build.json
    sync_runtime_file worker/package.json
    sync_runtime_file worker/tsconfig.json
    sync_runtime_file packages/shared/package.json
    sync_runtime_file .env

    success "运行目录源码已同步"
}

# ── 启动基础服务 ──────────────────────────────────────────────────────────
start_infra() {
    info "正在启动基础服务..."

    # ── PostgreSQL ──────────────────────────────────────────────────────
    if postgres_ready; then
        success "PostgreSQL 已在运行"
    else
        info "启动 PostgreSQL..."
        LC_ALL=C service postgresql start >/dev/null 2>&1 || true
        local pg_i=0
        while ! pg_isready -h 127.0.0.1 -p 5432 -q 2>/dev/null && [ $pg_i -lt 15 ]; do
            sleep 1; pg_i=$((pg_i + 1))
        done
        # 确保 postgres 用户密码与 DATABASE_URL 一致（利用 peer 认证）
        su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD 'postgres';\"" >/dev/null 2>&1 || true
        postgres_ready && success "PostgreSQL 启动成功" || warn "PostgreSQL 启动异常，请检查 /var/log/postgresql/"
    fi

    # ── PostgreSQL 迁移 ─────────────────────────────────────────────────
    info "运行 Prisma 数据库迁移..."
    (cd "$LANGFUSE_DIR/packages/shared" && \
        /opt/langfuse/node_modules/.bin/dotenv -e ../../.env -- \
        npx prisma migrate deploy 2>&1 | grep -E 'Applied|already|Prisma|error' | head -5) \
        && success "Prisma 迁移完成" || warn "Prisma 迁移出现警告"

    # ── Redis ───────────────────────────────────────────────────────────
    if redis_ready; then
        success "Redis 已在运行"
    else
        info "启动 Redis..."
        redis-server \
            --daemonize yes \
            --requirepass myredissecret \
            --maxmemory-policy noeviction \
            --bind 127.0.0.1 \
            --logfile /tmp/redis.log \
            >/dev/null 2>&1
        sleep 1
        redis_ready && success "Redis 启动成功" || warn "Redis 启动异常，请检查 /tmp/redis.log"
    fi

    # ── ClickHouse ──────────────────────────────────────────────────────
    if clickhouse_ready; then
        success "ClickHouse 已在运行"
    else
        info "启动 ClickHouse..."
        nohup clickhouse server \
            --config-file=/etc/clickhouse-server/config.xml \
            > /tmp/clickhouse.log 2>&1 &
        echo $! > /tmp/clickhouse.pid
        local ch_i=0
        echo -n "  等待 ClickHouse 就绪"
        while ! clickhouse_ready && [ $ch_i -lt 30 ]; do
            sleep 1; ch_i=$((ch_i + 1)); echo -n "."
        done
        echo ""
        clickhouse_ready && success "ClickHouse 启动成功" || warn "ClickHouse 启动异常，请检查 /tmp/clickhouse.log"
    fi

    # ── ClickHouse 迁移 ─────────────────────────────────────────────────
    info "运行 ClickHouse 迁移（标准 + 开发表）..."
    migrate \
        -database "clickhouse://clickhouse:clickhouse@localhost:9000/default?x-multi-statement=true" \
        -path "$LANGFUSE_DIR/packages/shared/clickhouse/migrations/unclustered" \
        up >/dev/null 2>&1 && success "ClickHouse 标准迁移完成" || warn "ClickHouse 迁移出现警告（可忽略已存在）"
    CLICKHOUSE_MIGRATION_URL="clickhouse://localhost:9000" \
    CLICKHOUSE_USER="clickhouse" \
    CLICKHOUSE_PASSWORD="clickhouse" \
    bash "$LANGFUSE_DIR/packages/shared/clickhouse/scripts/dev-tables.sh" >/dev/null 2>&1 \
        && success "ClickHouse 开发表就绪" || warn "dev-tables 脚本出现警告"

    # ── MinIO ───────────────────────────────────────────────────────────
    if minio_ready; then
        success "MinIO 已在运行"
    else
        info "启动 MinIO..."
        mkdir -p /tmp/minio-data/langfuse
        MINIO_ROOT_USER=minio \
        MINIO_ROOT_PASSWORD=miniosecret \
        nohup minio server \
            --address ":9090" \
            --console-address ":9091" \
            /tmp/minio-data \
            > /tmp/minio.log 2>&1 &
        echo $! > /tmp/minio.pid
        sleep 2
        minio_ready && success "MinIO 启动成功" || warn "MinIO 启动异常，请检查 /tmp/minio.log"
    fi
}

# ── 启动 Web ──────────────────────────────────────────────────────────────
start_web() {
    ensure_runtime_dir web
    sync_runtime_sources
    cleanup_stale_pid "$WEB_PID_FILE"

    if pid_is_running "$WEB_PID_FILE"; then
        warn "Langfuse Web 已在运行（PID: $(cat "$WEB_PID_FILE")）"
        return
    fi

    info "启动 Langfuse Web（Turbopack）..."
    cd "$LANGFUSE_DIR/web"
    nohup "$LANGFUSE_DIR/node_modules/.bin/dotenv" -e ../.env -- \
        node_modules/.bin/next dev --turbopack \
        > "$WEB_LOG" 2>&1 &
    echo $! > "$WEB_PID_FILE"
    success "Web 进程已启动（PID: $!），日志：$WEB_LOG"
    info "等待服务就绪..."

    for _ in $(seq 1 30); do
        sleep 2
        if curl -sf http://localhost:3000 >/dev/null 2>&1; then
            success "Langfuse Web 已就绪 → http://localhost:3000"
            return
        fi
        echo -n "."
    done

    echo ""
    warn "等待超时，请手动检查日志：tail -f $WEB_LOG"
}

# ── 启动 Worker ───────────────────────────────────────────────────────────
start_worker() {
    ensure_runtime_dir worker
    sync_runtime_sources
    cleanup_stale_pid "$WORKER_PID_FILE"

    if pid_is_running "$WORKER_PID_FILE"; then
        warn "Langfuse Worker 已在运行（PID: $(cat "$WORKER_PID_FILE")）"
        return
    fi

    info "启动 Langfuse Worker..."
    cd "$LANGFUSE_DIR/worker"
    nohup "$LANGFUSE_DIR/node_modules/.bin/dotenv" -e ../.env -- \
        node dist/index.js \
        > "$WORKER_LOG" 2>&1 &
    echo $! > "$WORKER_PID_FILE"
    success "Worker 进程已启动（PID: $!），日志：$WORKER_LOG"
}

# ── 停止服务 ──────────────────────────────────────────────────────────────
stop_services() {
    local name

    for name in web worker; do
        local pid_file="/tmp/langfuse-${name}.pid"
        local pid=""

        if [ -f "$pid_file" ]; then
            pid="$(cat "$pid_file")"
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                success "已停止 Langfuse ${name}（PID: $pid）"
            else
                warn "Langfuse ${name} 进程不存在（PID: $pid）"
            fi
            rm -f "$pid_file"
        else
            info "Langfuse ${name} 未运行"
        fi
    done
}

# ── 停止基础服务 ──────────────────────────────────────────────────────────
stop_infra() {
    info "正在停止基础服务..."

    # ClickHouse
    if [ -f /tmp/clickhouse.pid ]; then
        local ch_pid
        ch_pid="$(cat /tmp/clickhouse.pid)"
        if kill -0 "$ch_pid" 2>/dev/null; then
            kill "$ch_pid"
            success "已停止 ClickHouse（PID: $ch_pid）"
        fi
        rm -f /tmp/clickhouse.pid
    else
        info "ClickHouse 未运行"
    fi

    # MinIO
    if [ -f /tmp/minio.pid ]; then
        local minio_pid
        minio_pid="$(cat /tmp/minio.pid)"
        if kill -0 "$minio_pid" 2>/dev/null; then
            kill "$minio_pid"
            success "已停止 MinIO（PID: $minio_pid）"
        fi
        rm -f /tmp/minio.pid
    else
        info "MinIO 未运行"
    fi

    # Redis
    if redis_ready; then
        redis-cli -h 127.0.0.1 -p 6379 -a myredissecret shutdown nosave >/dev/null 2>&1 || true
        success "已停止 Redis"
    else
        info "Redis 未运行"
    fi

    # PostgreSQL
    if postgres_ready; then
        LC_ALL=C service postgresql stop >/dev/null 2>&1 || true
        success "已停止 PostgreSQL"
    else
        info "PostgreSQL 未运行"
    fi
}

# ── 状态查看 ──────────────────────────────────────────────────────────────
show_status() {
    local name

    echo -e "\n${BOLD}── Langfuse 服务状态 ─────────────────────────────${RESET}"
    for name in web worker; do
        local pid_file="/tmp/langfuse-${name}.pid"
        cleanup_stale_pid "$pid_file"
        if pid_is_running "$pid_file"; then
            echo -e "  ${GREEN}●${RESET} langfuse-${name}  运行中  (PID: $(cat "$pid_file"))"
        else
            echo -e "  ${RED}○${RESET} langfuse-${name}  未运行"
        fi
    done

    echo ""
    echo -e "${BOLD}── 基础设施检查 ───────────────────────────────────${RESET}"
    if check_deps true; then
        echo -e "  ${GREEN}●${RESET} PostgreSQL / Redis / ClickHouse / MinIO 已就绪"
    else
        echo -e "  ${YELLOW}○${RESET} 基础设施未完全就绪"
    fi

    echo ""
    echo -e "${BOLD}── 端口监听 ───────────────────────────────────────${RESET}"
    if command -v ss >/dev/null 2>&1; then
        ss -tlnp 2>/dev/null | grep -E ':(3000|3030|5432|6379|8123|9000|9090|9091)\s' || echo "  （无相关端口）"
    else
        echo "  当前环境缺少 ss，无法显示监听端口"
    fi

    echo ""
    echo -e "${BOLD}── 访问地址 ───────────────────────────────────────${RESET}"
    echo "  Web UI:       http://localhost:3000"
    echo "  PostgreSQL:   localhost:5432"
    echo "  Redis:        localhost:6379"
    echo "  ClickHouse:   http://localhost:8123"
    echo "  MinIO API:    http://localhost:9090"
    echo "  MinIO 控制台:  http://localhost:9091"
    echo "  默认账户:     admin@jiusi.dev / Jiusi2024!"
    echo ""
}

# ── 主入口 ────────────────────────────────────────────────────────────────
CMD="${1:-all}"

case "$CMD" in
    all)
        ensure_infra
        start_web
        start_worker
        show_status
        ;;
    web)
        ensure_infra
        start_web
        ;;
    worker)
        ensure_infra
        start_worker
        ;;
    infra)
        start_infra
        show_status
        ;;
    stop)
        STOP_TARGET="${2:-app}"
        case "$STOP_TARGET" in
            all)
                stop_services
                stop_infra
                ;;
            infra)
                stop_infra
                ;;
            *)
                stop_services
                ;;
        esac
        ;;
    status)
        show_status
        ;;
    logs)
        TARGET="${2:-web}"
        case "$TARGET" in
            web)
                [ -f "$WEB_LOG" ] || {
                    error "Web 日志不存在：$WEB_LOG"
                    exit 1
                }
                tail -f "$WEB_LOG"
                ;;
            worker)
                [ -f "$WORKER_LOG" ] || {
                    error "Worker 日志不存在：$WORKER_LOG"
                    exit 1
                }
                tail -f "$WORKER_LOG"
                ;;
            postgres)
                log_dir="/var/log/postgresql"
                log_file=$(ls -t "$log_dir"/*.log 2>/dev/null | head -1)
                [ -n "$log_file" ] || { error "PostgreSQL 日志不存在：$log_dir"; exit 1; }
                tail -f "$log_file"
                ;;
            redis)
                [ -f /tmp/redis.log ] || { error "Redis 日志不存在：/tmp/redis.log"; exit 1; }
                tail -f /tmp/redis.log
                ;;
            clickhouse)
                [ -f /tmp/clickhouse.log ] || { error "ClickHouse 日志不存在：/tmp/clickhouse.log"; exit 1; }
                tail -f /tmp/clickhouse.log
                ;;
            minio)
                [ -f /tmp/minio.log ] || { error "MinIO 日志不存在：/tmp/minio.log"; exit 1; }
                tail -f /tmp/minio.log
                ;;
            *)
                usage
                exit 1
                ;;
        esac
        ;;
    *)
        usage
        exit 1
        ;;
esac
