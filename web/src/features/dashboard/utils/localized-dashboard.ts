const LANGFUSE_DASHBOARD_TRANSLATIONS: Record<
  string,
  { name: string; description: string }
> = {
  "Langfuse Latency Dashboard": {
    name: "Langfuse 延迟仪表盘",
    description: "监控链路与生成过程中的延迟指标，帮助你定位性能瓶颈。",
  },
  "Langfuse Usage Management": {
    name: "Langfuse 使用情况总览",
    description: "跟踪链路、观测和评分的使用指标，辅助资源分配与容量管理。",
  },
  "Langfuse Cost Dashboard": {
    name: "Langfuse 成本仪表盘",
    description: "查看你的 LLM 成本概览。",
  },
};

const LANGFUSE_WIDGET_NAME_TRANSLATIONS: Record<string, string> = {
  "P 95 Latency by Use Case": "按用例统计 P95 延迟",
  "P 95 Latency by Level (Observations)": "按级别统计 P95 延迟（Observation）",
  "Total costs": "总成本",
  "Top 20 Users by Cost": "成本最高的前 20 位用户",
  "Top 20 Use Cases (Observation) by Cost": "按成本统计的前 20 个用例（Observation）",
  "Top 20 Use Cases (Trace) by Cost": "按成本统计的前 20 个用例（Trace）",
  "Cost by Environment": "按环境统计成本",
  "Max Latency by User Id (Traces)": "按用户 ID 统计最大延迟（Trace）",
  "Avg Time To First Token by Prompt Name (Observations)": "按 Prompt 名称统计平均首 Token 时间（Observation）",
  "P 95 Time To First Token by Model": "按模型统计 P95 首 Token 时间",
  "P 95 Latency by Model": "按模型统计 P95 延迟",
  "Avg Output Tokens Per Second by Model": "按模型统计平均每秒输出 Token 数",
  "P 95 Cost per Trace": "每条 Trace 的 P95 成本",
  "P 95 Output Cost per Observation": "每条 Observation 的 P95 输出成本",
  "P 95 Input Cost per Observation": "每条 Observation 的 P95 输入成本",
  "Total Trace Count": "Trace 总数",
  "P 50 Cost per Trace": "每条 Trace 的 P50 成本",
  "P 99 Cost per Trace": "每条 Trace 的 P99 成本",
  "Cost by Model Name": "按模型名称统计成本",
  "Total Count Traces": "Trace 总数",
  "Total Count Observations": "Observation 总数",
  "Total Observation Count": "Observation 总数",
  "Total Score Count (numeric)": "数值型评分总数",
  "Total Score Count (categorical)": "分类评分总数",
  "Observation Count by Level": "按级别统计 Observation 数量",
  "Total Count Scores": "评分总数",
  "Scores by Name": "按名称统计评分",
  "Scores by Source": "按来源统计评分",
  "Average Score by Name": "按名称统计平均分",
  "Token usage by Model": "按模型统计 Token 用量",
  "Input Tokens by Model": "按模型统计输入 Token",
  "Output Tokens by Model": "按模型统计输出 Token",
  "Total Trace Count (over time)": "Trace 总数时间趋势",
  "Total Observation Count (over time)": "Observation 总数时间趋势",
  "Total Trace Count (by env)": "按环境统计 Trace 总数",
  "Total Observation Count (by env)": "按环境统计 Observation 总数",
};

const LANGFUSE_WIDGET_DESCRIPTION_TRANSLATIONS: Record<string, string> = {
  "P95 latency metrics segmented by trace name": "按 trace.name 维度统计的 P95 延迟指标。",
  "P95 latency metrics for observations segmented by level": "按级别维度统计的 Observation P95 延迟指标。",
  "Total cost across all use cases": "所有用例的总成本。",
  "Aggregated model cost (observation.totalCost) by trace.userId": "按 trace.userId 聚合 observation.totalCost 成本。",
  "Aggregated model cost (observation.totalCost) by observation.name": "按 observation.name 聚合 observation.totalCost 成本。",
  "Aggregated model cost (observation.totalCost) by trace.name": "按 trace.name 聚合 observation.totalCost 成本。",
  "Total cost broken down by trace.environment": "按 trace.environment 维度拆分的总成本。",
  "Maximum latency for the top 50 users by trace userId": "按 trace.userId 统计前 50 位用户的最大延迟。",
  "Average time to first token segmented by prompt name": "按 prompt 名称维度统计的平均首 Token 时间。",
  "P95 time to first token metrics segmented by model": "按模型维度统计的 P95 首 Token 时间指标。",
  "P95 latency metrics for observations segmented by model": "按模型维度统计的 Observation P95 延迟指标。",
  "Average output tokens per second segmented by model": "按模型维度统计的平均每秒输出 Token 数。",
  "95th percentile of cost for each trace": "每条 Trace 成本的 95 分位值。",
  "95th percentile of output cost for each observation (llm call)": "每条 Observation（LLM 调用）输出成本的 95 分位值。",
  "95th percentile of input cost for each observation (llm call)": "每条 Observation（LLM 调用）输入成本的 95 分位值。",
  "Total count of traces across all environments": "所有环境中的 Trace 总数。",
  "95th percentile of total cost per trace": "每条 Trace 总成本的 P95 分位值。",
  "50th percentile of total cost per trace": "每条 Trace 总成本的 P50 分位值。",
  "99th percentile of total cost per trace": "每条 Trace 总成本的 P99 分位值。",
  "Total cost broken down by model name": "按模型名称拆分的总成本。",
  "Shows the count of Traces": "显示 Trace 的总数量。",
  "Shows the count of Observations": "显示 Observation 的总数量。",
  "Total count of observations across all environments": "所有环境中的 Observation 总数。",
  "Total count of numeric scores across all environments": "所有环境中的数值型评分总数。",
  "Total count of categorical scores across all environments": "所有环境中的分类评分总数。",
  "Shows the count of Observations by level": "按级别显示 Observation 的数量。",
  "Shows the count of scores": "显示评分总数。",
  "Shows the count of scores by name": "按名称显示评分数量。",
  "Shows the count of scores by source": "按来源显示评分数量。",
  "Shows the average score by name": "按名称显示平均分。",
  "Total token usage broken down by model": "按模型拆分的 Token 总用量。",
  "Input token usage broken down by model": "按模型拆分的输入 Token 用量。",
  "Output token usage broken down by model": "按模型拆分的输出 Token 用量。",
  "Trend of trace count over time": "Trace 数量随时间变化的趋势。",
  "Trend of observation count over time": "Observation 数量随时间变化的趋势。",
  "Trend of numeric score count over time": "数值型评分数量随时间变化的趋势。",
  "Trend of categorical score count over time": "分类评分数量随时间变化的趋势。",
  "Distribution of trace count across different environments": "不同环境下的 Trace 数量分布。",
  "Distribution of observation count across different environments": "不同环境下的 Observation 数量分布。",
};

export const getLocalizedDashboardName = ({
  owner,
  name,
}: {
  owner?: string | null;
  name?: string | null;
}) => {
  if (!name) return name ?? "";
  if (owner !== "LANGFUSE") return name;
  return LANGFUSE_DASHBOARD_TRANSLATIONS[name]?.name ?? name;
};

export const getLocalizedDashboardDescription = ({
  owner,
  name,
  description,
}: {
  owner?: string | null;
  name?: string | null;
  description?: string | null;
}) => {
  if (!description) return description ?? "";
  if (owner !== "LANGFUSE") return description;
  return LANGFUSE_DASHBOARD_TRANSLATIONS[name ?? ""]?.description ?? description;
};

export const getLocalizedDashboardWidgetName = ({
  owner,
  name,
}: {
  owner?: string | null;
  name?: string | null;
}) => {
  if (!name) return name ?? "";
  if (owner !== "LANGFUSE") return name;
  return LANGFUSE_WIDGET_NAME_TRANSLATIONS[name] ?? name;
};

export const getLocalizedDashboardWidgetDescription = ({
  owner,
  description,
}: {
  owner?: string | null;
  description?: string | null;
}) => {
  if (!description) return description ?? "";
  if (owner !== "LANGFUSE") return description;
  return LANGFUSE_WIDGET_DESCRIPTION_TRANSLATIONS[description] ?? description;
};