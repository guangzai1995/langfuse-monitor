import { api } from "@/src/utils/api";
import { useMemo } from "react";
import {
  type FilterState,
  type SingleValueOption,
  type TimeFilter,
} from "@langfuse/shared";

const EVENT_TYPE_DISPLAY_MAP: Record<string, string> = {
  AGENT: "智能体",
  CHAIN: "链路步骤",
  EMBEDDING: "向量嵌入",
  EVALUATOR: "评测器",
  EVENT: "事件",
  GENERATION: "生成",
  GUARDRAIL: "护栏",
  RETRIEVER: "检索",
  SPAN: "跨度",
  TOOL: "工具",
};

const localizeEventTypeOptions = (options?: SingleValueOption[]) =>
  options?.map((option) => ({
    ...option,
    displayValue: EVENT_TYPE_DISPLAY_MAP[option.value] ?? option.value,
  }));

type UseEventsFilterOptionsParams = {
  projectId: string;
  oldFilterState: FilterState;
  hasParentObservation?: boolean;
};

export function useEventsFilterOptions({
  projectId,
  oldFilterState,
  hasParentObservation,
}: UseEventsFilterOptionsParams) {
  // Extract start time filters for filter options query
  const startTimeFilters = useMemo(() => {
    return oldFilterState.filter(
      (f) =>
        (f.column === "Start Time" || f.column === "startTime") &&
        f.type === "datetime",
    ) as TimeFilter[];
  }, [oldFilterState]);

  // Fetch filter options
  const filterOptions = api.events.filterOptions.useQuery(
    {
      projectId,
      startTimeFilter:
        startTimeFilters.length > 0 ? startTimeFilters : undefined,
      hasParentObservation,
    },
    {
      trpc: {
        context: {
          skipBatch: true,
        },
      },
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: Infinity,
      // Keep showing previous options while fetching new ones to avoid sidebar flicker
      // TODO: maybe remove b/c unnecessary?
      placeholderData: (prev) => prev,
    },
  );

  // Transform filter options for sidebar
  const newFilterOptions = useMemo(() => {
    const scoreCategories =
      filterOptions.data?.score_categories?.reduce(
        (acc, score) => {
          acc[score.label] = score.values;
          return acc;
        },
        {} as Record<string, string[]>,
      ) ?? undefined;

    const scoresNumeric = filterOptions.data?.scores_avg ?? undefined;
    const traceScoreCategories =
      filterOptions.data?.trace_score_categories?.reduce(
        (acc, score) => {
          acc[score.label] = score.values;
          return acc;
        },
        {} as Record<string, string[]>,
      ) ?? undefined;
    const traceScoresNumeric =
      filterOptions.data?.trace_scores_avg ?? undefined;

    return {
      environment: filterOptions.data?.environment ?? undefined,
      name: filterOptions.data?.name ?? undefined,
      type: localizeEventTypeOptions(filterOptions.data?.type),
      level: filterOptions.data?.level ?? undefined,
      providedModelName: filterOptions.data?.providedModelName ?? undefined,
      modelId: filterOptions.data?.modelId ?? undefined,
      promptName: filterOptions.data?.promptName ?? undefined,
      traceTags: filterOptions.data?.traceTags ?? undefined,
      traceName: filterOptions.data?.traceName ?? undefined,
      userId: filterOptions.data?.userId ?? undefined,
      sessionId: filterOptions.data?.sessionId ?? undefined,
      version: filterOptions.data?.version ?? undefined,
      experimentDatasetId: filterOptions.data?.experimentDatasetId ?? undefined,
      experimentId: filterOptions.data?.experimentId ?? undefined,
      experimentName: filterOptions.data?.experimentName ?? undefined,
      hasParentObservation:
        filterOptions.data?.hasParentObservation ?? undefined,
      toolNames: filterOptions.data?.toolNames ?? undefined,
      calledToolNames: filterOptions.data?.calledToolNames ?? undefined,
      toolDefinitions: [],
      toolCalls: [],
      latency: [],
      timeToFirstToken: [],
      tokensPerSecond: [],
      inputTokens: [],
      outputTokens: [],
      totalTokens: [],
      inputCost: [],
      outputCost: [],
      totalCost: [],
      score_categories: scoreCategories,
      scores_avg: scoresNumeric,
      trace_score_categories: traceScoreCategories,
      trace_scores_avg: traceScoresNumeric,
    };
  }, [filterOptions.data]);

  return {
    filterOptions: newFilterOptions,
    isFilterOptionsPending: filterOptions.isPending,
  };
}
