#!/usr/bin/env python3
"""
九思 AI 监控平台 —— Langfuse 链路追踪接入演示脚本
=====================================================

功能：
  向本地 Langfuse 实例发送 Trace / Span / Generation 数据，
  演示如何将 langfuse-monitor 后端 LLM 调用接入可观测性平台。

快速开始：
  1. 确保 Langfuse 服务运行：http://localhost:3000
  2. 在浏览器中打开 http://localhost:3000 → 注册 / 登录
     默认账户：admin@jiusi.dev / Jiusi2024!
  3. 运行本脚本：
       cd /work/development-code/langfuse-monitor
       python3 scripts/langfuse_demo.py

高级用法：
  # 使用自定义 API Key（在 Web UI Settings → API Keys 创建）
  LANGFUSE_PUBLIC_KEY=pk-lf-xxx LANGFUSE_SECRET_KEY=sk-lf-xxx python3 scripts/langfuse_demo.py

  # 实际接入 OpenAI（需要 OPENAI_API_KEY 环境变量）
  python3 scripts/langfuse_demo.py --real-llm
"""

import os
import sys
import time
import uuid
import argparse
from datetime import datetime

# ── 配置（优先读取环境变量，否则使用预置演示 key）──────────────────────────
LANGFUSE_HOST       = os.environ.get("LANGFUSE_HOST",       "http://localhost:3000")
LANGFUSE_PUBLIC_KEY = os.environ.get("LANGFUSE_PUBLIC_KEY", "pk-lf-jiusidemo-11111111111111")
LANGFUSE_SECRET_KEY = os.environ.get("LANGFUSE_SECRET_KEY", "sk-lf-jiusidemo-11111111111111")

# ── 颜色输出工具 ──────────────────────────────────────────────────────────
CYAN  = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD  = "\033[1m"


def title(msg: str) -> None:
    print(f"\n{BOLD}{CYAN}{'─' * 55}{RESET}")
    print(f"{BOLD}{CYAN}  {msg}{RESET}")
    print(f"{BOLD}{CYAN}{'─' * 55}{RESET}")


def ok(msg: str) -> None:
    print(f"  {GREEN}✓{RESET}  {msg}")


def info(msg: str) -> None:
    print(f"  {YELLOW}→{RESET}  {msg}")


# ═══════════════════════════════════════════════════════════════════════════
# 1. 初始化 Langfuse 客户端
# ═══════════════════════════════════════════════════════════════════════════
def init_client():
    title("初始化 Langfuse 客户端")

    try:
        from langfuse import Langfuse
    except ImportError:
        print("❌ 未找到 langfuse 包，请先安装：pip install langfuse")
        sys.exit(1)

    client = Langfuse(
        public_key=LANGFUSE_PUBLIC_KEY,
        secret_key=LANGFUSE_SECRET_KEY,
        host=LANGFUSE_HOST,
        timeout=30,
    )

    # 简单连通性检查
    try:
        client.auth_check()
        ok(f"连接成功：{LANGFUSE_HOST}")
    except Exception as e:
        print(f"\n❌ 无法连接 Langfuse：{e}")
        print(f"   请确认服务已启动，且 API Key 正确。")
        print(f"   Public Key : {LANGFUSE_PUBLIC_KEY}")
        print(f"   Secret Key : {LANGFUSE_SECRET_KEY[:12]}...")
        sys.exit(1)

    return client


# ═══════════════════════════════════════════════════════════════════════════
# 2. 演示：模拟多轮 Agent 对话链路（langfuse v4 API）
# ═══════════════════════════════════════════════════════════════════════════
def demo_agent_trace(client):
    title("Demo 1：Agent 多轮对话追踪")

    trace_id = None

    # 根 Span = Trace，以 "agent" 类型标记
    with client.start_as_current_observation(
        name="jiusi-agent-chat",
        as_type="agent",
        input={"user_message": "帮我分析最近一周的销售数据趋势"},
        metadata={
            "app":     "jiusi-claw",
            "user_id": "user-demo-001",
            "version": "1.0.0",
        },
    ):
        trace_id = client.get_current_trace_id()
        ok(f"Trace 已创建  id={trace_id}")
        info(f"查看：{LANGFUSE_HOST}/project/cmotzzjby00085d6nc0fcya1a/traces/{trace_id}")

        # ── 意图识别 Span ──────────────────────────────────────────
        with client.start_as_current_observation(
            name="intent-recognition",
            as_type="span",
            input={"user_message": "帮我分析最近一周的销售数据趋势"},
            metadata={"step": 1},
        ):
            # 内部 LLM Generation
            with client.start_as_current_observation(
                name="llm-intent-parse",
                as_type="generation",
                model="qwen2.5-72b-instruct",
                model_parameters={"temperature": 0.2, "max_tokens": 512},
                input=[
                    {"role": "system", "content": "你是一个意图识别专家，请提取用户意图和关键实体。"},
                    {"role": "user",   "content": "帮我分析最近一周的销售数据趋势"},
                ],
                output={
                    "role": "assistant",
                    "content": '{"intent":"data_analysis","entity":{"time_range":"last_7_days","target":"sales_trend"}}',
                },
                usage_details={"input": 85, "output": 42},
                metadata={"latency_ms": 312},
            ):
                time.sleep(0.1)
        ok("意图识别 Span 完成")

        # ── 工具调用 Span ──────────────────────────────────────────
        with client.start_as_current_observation(
            name="tool-call",
            as_type="tool",
            input={"tool": "sql_query", "query": "SELECT * FROM sales WHERE date >= NOW()-7"},
            output={"rows_returned": 152, "execution_time_ms": 45},
            metadata={"step": 2},
        ):
            time.sleep(0.05)
        ok("工具调用 Span 完成")

        # ── 响应生成 Span ──────────────────────────────────────────
        with client.start_as_current_observation(
            name="response-generation",
            as_type="generation",
            model="qwen2.5-72b-instruct",
            model_parameters={"temperature": 0.7, "max_tokens": 1024},
            input=[
                {"role": "system",    "content": "你是一个数据分析助手，请用简洁专业的语言回答用户问题。"},
                {"role": "user",      "content": "帮我分析最近一周的销售数据趋势"},
                {"role": "assistant", "content": "[已查询到 152 条销售记录]"},
            ],
            output={
                "role": "assistant",
                "content": "本周销售额较上周增长 8.3%，日均 ¥12.4 万，峰值在周三（¥18.2 万），建议关注工作日推广时机。",
            },
            usage_details={"input": 256, "output": 198},
            metadata={"latency_ms": 1248, "step": 3},
        ):
            pass
        ok("响应生成 Span 完成")

    # ── 打分（写在 trace context 外使用 trace_id）────────────────────
    if trace_id:
        client.create_score(
            trace_id=trace_id,
            name="user-feedback",
            value=0.9,
            comment="回答准确，数据可视化建议有用",
            data_type="NUMERIC",
        )
        ok("用户评分已记录（0.9 / 1.0）")

    return trace_id


# ═══════════════════════════════════════════════════════════════════════════
# 3. 演示：提示词模板追踪
# ═══════════════════════════════════════════════════════════════════════════
def demo_prompt_trace(client):
    title("Demo 2：提示词模板 + 版本追踪")

    # 创建提示词模板
    try:
        prompt = client.create_prompt(
            name="jiusi-intent-classifier",
            prompt="你是一个意图分类器。请将用户输入分类为以下类别之一：\n{{categories}}\n\n用户输入：{{user_input}}\n\n请直接返回类别名称。",
            labels=["production"],
            config={"model": "qwen2.5-7b", "temperature": 0.1},
        )
        ok(f"提示词模板已创建：{prompt.name} v{prompt.version}")
    except Exception:
        prompt = client.get_prompt("jiusi-intent-classifier")
        ok(f"提示词模板已存在：{prompt.name} v{prompt.version}")

    trace_id = None

    with client.start_as_current_observation(
        name="jiusi-intent-classification",
        as_type="chain",
        input={"user_input": "我想设置一个每天早上9点发送日报的提醒"},
        metadata={"user_id": "user-demo-002"},
    ):
        trace_id = client.get_current_trace_id()

        with client.start_as_current_observation(
            name="intent-classify",
            as_type="generation",
            model="qwen2.5-7b",
            prompt=prompt,
            input=[
                {
                    "role": "user",
                    "content": prompt.compile(
                        categories="data_analysis, report_generation, alert_config, help",
                        user_input="我想设置一个每天早上9点发送日报的提醒",
                    ),
                }
            ],
            output={"role": "assistant", "content": "alert_config"},
            usage_details={"input": 64, "output": 5},
        ):
            pass

    ok("提示词追踪完成，可在 Prompt Management 查看版本历史")
    return trace_id


# ═══════════════════════════════════════════════════════════════════════════
# 4. 演示：真实 OpenAI 调用（可选）
# ═══════════════════════════════════════════════════════════════════════════
def demo_real_llm(client):
    title("Demo 3：真实 LLM 调用（OpenAI）")

    try:
        import openai as _openai
    except ImportError:
        print("  ❌ 需要安装 openai：pip install openai")
        return

    openai_key = os.environ.get("OPENAI_API_KEY") or os.environ.get("OPENAI_KEY")
    if not openai_key:
        print("  ❌ 未设置 OPENAI_API_KEY，跳过真实 LLM 演示")
        return

    try:
        with client.start_as_current_observation(
            name="openai-real-call",
            as_type="generation",
            model="gpt-4o-mini",
            input=[
                {"role": "system", "content": "你是九思 AI 助手，请简洁回答问题。"},
                {"role": "user",   "content": "用一句话介绍 LLM 可观测性的意义。"},
            ],
        ):
            oc = _openai.OpenAI(api_key=openai_key)
            resp = oc.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "你是九思 AI 助手，请简洁回答问题。"},
                    {"role": "user",   "content": "用一句话介绍 LLM 可观测性的意义。"},
                ],
                max_tokens=100,
            )
            answer = resp.choices[0].message.content
            client.update_current_generation(
                output={"role": "assistant", "content": answer},
                usage_details={
                    "input": resp.usage.prompt_tokens,
                    "output": resp.usage.completion_tokens,
                },
            )
        ok(f"OpenAI 响应：{answer}")
        ok("调用已记录到 Langfuse")
    except Exception as e:
        print(f"  ⚠️  真实 LLM 调用失败：{e}")


# ═══════════════════════════════════════════════════════════════════════════
# 5. 演示：jiusi-claw 后端接入代码片段说明
# ═══════════════════════════════════════════════════════════════════════════
def show_integration_guide():
    title("如何将 jiusi-claw 后端接入 Langfuse")
    print("""
  在 backend/app/core/config.py（或 .env）中添加：

    LANGFUSE_PUBLIC_KEY = "pk-lf-jiusidemo-11111111111111"
    LANGFUSE_SECRET_KEY = "sk-lf-jiusidemo-11111111111111"
    LANGFUSE_HOST       = "http://localhost:3000"

  在 LLM 调用处（如 backend/app/rag/llm_provider.py）添加：

    from langfuse import Langfuse
    from langfuse.openai import openai   # 自动拦截所有 openai 调用

    langfuse = Langfuse()  # 自动读取环境变量

    # 或手动追踪：
    with langfuse.trace(name="rag-query", user_id=user_id) as trace:
        span = trace.span(name="retrieval", input={"query": query})
        docs = retriever.get_relevant_documents(query)
        span.end(output={"doc_count": len(docs)})

        generation = trace.generation(
            name="llm-synthesis",
            model=model_name,
            input=messages,
            output=response,
            usage={"input": in_tokens, "output": out_tokens},
        )
        generation.end()
""")


# ═══════════════════════════════════════════════════════════════════════════
# 入口
# ═══════════════════════════════════════════════════════════════════════════
def main():
    parser = argparse.ArgumentParser(description="Langfuse 接入演示")
    parser.add_argument("--real-llm", action="store_true", help="启用真实 OpenAI 调用演示")
    args = parser.parse_args()

    print(f"\n{BOLD}九思 AI 监控平台 · Langfuse 接入演示{RESET}")
    print(f"  Host      : {LANGFUSE_HOST}")
    print(f"  PublicKey : {LANGFUSE_PUBLIC_KEY}")
    print(f"  SecretKey : {LANGFUSE_SECRET_KEY[:12]}...")
    print(f"  时间      : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    client = init_client()

    trace_id_1 = demo_agent_trace(client)
    trace_id_2 = demo_prompt_trace(client)

    if args.real_llm:
        demo_real_llm(client)

    # 确保所有数据已发送
    title("刷新数据缓冲区")
    client.flush()
    ok("所有 Trace 数据已成功发送到 Langfuse")

    show_integration_guide()

    title("完成 🎉")
    print(f"\n  在浏览器中查看追踪数据：")
    print(f"  {CYAN}{LANGFUSE_HOST}{RESET}")
    print(f"\n  直接跳转到追踪记录：")
    print(f"  {CYAN}{LANGFUSE_HOST}/project/cmotzzjby00085d6nc0fcya1a/traces/{trace_id_1}{RESET}")
    print(f"  {CYAN}{LANGFUSE_HOST}/project/cmotzzjby00085d6nc0fcya1a/traces/{trace_id_2}{RESET}\n")


if __name__ == "__main__":
    main()
