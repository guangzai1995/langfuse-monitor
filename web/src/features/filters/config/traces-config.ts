import { tracesTableCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";

export const traceFilterConfig: FilterConfig = {
  tableName: "traces",

  columnDefinitions: tracesTableCols,

  defaultExpanded: ["environment", "name"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: "环境",
    },
    {
      type: "categorical" as const,
      column: "name",
      label: "链路名称",
    },
    {
      type: "string" as const,
      column: "id",
      label: "链路 ID",
    },
    {
      type: "categorical" as const,
      column: "userId",
      label: "用户 ID",
    },
    {
      type: "categorical" as const,
      column: "sessionId",
      label: "会话 ID",
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: "元数据",
    },
    {
      type: "string" as const,
      column: "version",
      label: "版本",
    },
    {
      type: "string" as const,
      column: "release",
      label: "发布版本",
    },
    {
      type: "boolean" as const,
      column: "bookmarked",
      label: "已收藏",
      trueLabel: "已收藏",
      falseLabel: "未收藏",
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: "评论数量",
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: "评论内容",
    },
    {
      type: "categorical" as const,
      column: "tags",
      label: "标签",
    },
    {
      type: "categorical" as const,
      column: "level",
      label: "级别",
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: "延迟",
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: "输入 Tokens",
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: "输出 Tokens",
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: "总 Tokens",
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: "输入成本",
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: "输出成本",
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: "总成本",
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: "分类评分",
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: "数值评分",
    },
  ],
};
