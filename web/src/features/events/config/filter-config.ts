import { eventsTableCols } from "@langfuse/shared";
import type { FilterConfig } from "@/src/features/filters/lib/filter-config";
import type { ColumnToBackendKeyMap } from "@/src/features/filters/lib/filter-transform";
import { renderFilterIcon } from "@/src/components/ItemBadge";

// Helper function to get column name from eventsTableCols by ID
export const getEventsColumnName = (id: string): string => {
  const column = eventsTableCols.find((col) => col.id === id);
  if (!column) {
    throw new Error(`Column ${id} not found in eventsTableCols`);
  }
  return column?.name;
};

/**
 * Maps frontend column IDs to backend-expected column IDs for events table
 * Events table uses different naming conventions than observations table
 */
export const OBSERVATION_EVENTS_COLUMN_TO_BACKEND_KEY: ColumnToBackendKeyMap = {
  // No mapping needed currently - events table column names align with UI
};

export const observationEventsFilterConfig: FilterConfig = {
  tableName: "observations-events",

  columnDefinitions: eventsTableCols,

  defaultExpanded: ["environment", "name", "hasParentObservation", "type"],

  facets: [
    {
      type: "categorical" as const,
      column: "environment",
      label: "环境",
    },
    {
      type: "categorical" as const,
      column: "type",
      label: "类型",
      renderIcon: renderFilterIcon,
    },
    {
      type: "boolean" as const,
      column: "hasParentObservation",
      label: "根节点 Observation",
      tooltip:
        "根节点 Observation 是一条 Trace 中最顶层的 Observation。它没有父 Observation ID。筛选为“是”即可只查看根节点。",
      invertValue: true, // "True" = hasParentObservation=false (is root)
    },
    {
      type: "categorical" as const,
      column: "traceName",
      label: "链路名称",
    },
    {
      type: "categorical" as const,
      column: "name",
      label: "名称",
    },
    {
      type: "categorical" as const,
      column: "level",
      label: "级别",
    },
    {
      type: "positionInTrace" as const,
      column: "positionInTrace",
      label: getEventsColumnName("positionInTrace"),
      mutuallyExclusiveWith: [
        "score_categories",
        "scores_avg",
        "trace_score_categories",
        "trace_scores_avg",
      ],
    },
    {
      type: "categorical" as const,
      column: "providedModelName",
      label: "提供的模型名称",
    },
    {
      type: "categorical" as const,
      column: "modelId",
      label: "模型 ID",
    },
    {
      type: "categorical" as const,
      column: "promptName",
      label: "Prompt 名称",
    },
    {
      type: "categorical" as const,
      column: "traceTags",
      label: "链路标签",
    },
    {
      type: "stringKeyValue" as const,
      column: "metadata",
      label: "元数据",
    },
    {
      type: "categorical" as const,
      column: "version",
      label: "版本",
    },
    {
      type: "string" as const,
      column: "statusMessage",
      label: "状态消息",
    },
    {
      type: "string" as const,
      column: "traceId",
      label: "链路 ID",
    },
    {
      type: "categorical" as const,
      column: "sessionId",
      label: "会话 ID",
    },
    {
      type: "categorical" as const,
      column: "userId",
      label: getEventsColumnName("userId"),
    },
    {
      type: "categorical" as const,
      column: "experimentDatasetId",
      label: getEventsColumnName("experimentDatasetId"),
    },
    {
      type: "categorical" as const,
      column: "experimentId",
      label: getEventsColumnName("experimentId"),
    },
    {
      type: "categorical" as const,
      column: "experimentName",
      label: getEventsColumnName("experimentName"),
    },
    {
      type: "numeric" as const,
      column: "latency",
      label: getEventsColumnName("latency"),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "timeToFirstToken",
      label: getEventsColumnName("timeToFirstToken"),
      min: 0,
      max: 60,
      unit: "s",
    },
    {
      type: "numeric" as const,
      column: "inputTokens",
      label: getEventsColumnName("inputTokens"),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "outputTokens",
      label: getEventsColumnName("outputTokens"),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "totalTokens",
      label: getEventsColumnName("totalTokens"),
      min: 0,
      max: 1000000,
    },
    {
      type: "numeric" as const,
      column: "inputCost",
      label: getEventsColumnName("inputCost"),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "outputCost",
      label: getEventsColumnName("outputCost"),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "numeric" as const,
      column: "totalCost",
      label: getEventsColumnName("totalCost"),
      min: 0,
      max: 100,
      unit: "$",
    },
    {
      type: "categorical" as const,
      column: "toolNames",
      label: "Tool Names (Available)",
    },
    {
      type: "categorical" as const,
      column: "calledToolNames",
      label: "Tool Names (Called)",
    },
    {
      type: "numeric" as const,
      column: "toolDefinitions",
      label: "Available Tools",
      min: 0,
      max: 25,
    },
    {
      type: "numeric" as const,
      column: "toolCalls",
      label: "Tool Calls",
      min: 0,
      max: 25,
    },
    {
      type: "keyValue" as const,
      column: "score_categories",
      label: "Categorical Scores",
    },
    {
      type: "numericKeyValue" as const,
      column: "scores_avg",
      label: "Numeric Scores",
    },
    {
      type: "keyValue" as const,
      column: "trace_score_categories",
      label: "Trace Categorical Scores",
    },
    {
      type: "numericKeyValue" as const,
      column: "trace_scores_avg",
      label: "Trace Numeric Scores",
    },
    {
      type: "numeric" as const,
      column: "commentCount",
      label: "Comment Count",
      min: 0,
      max: 100,
    },
    {
      type: "string" as const,
      column: "commentContent",
      label: "Comment Content",
    },
  ],
};
