import { useRouter } from "next/router";
import { useMemo, useEffect, useRef } from "react";
import Page from "@/src/components/layouts/page";
import {
  getScoresTabs,
  SCORES_TABS,
} from "@/src/features/navigation/utils/scores-tabs";
import { useAnalyticsUrlState } from "@/src/features/score-analytics/lib/analytics-url-state";
import { type ScoreOption } from "@/src/features/score-analytics/components/charts/ScoreCombobox";
import { useDashboardDateRange } from "@/src/hooks/useDashboardDateRange";
import {
  toAbsoluteTimeRange,
  getOptimalInterval,
} from "@/src/utils/date-range-utils";
import { BarChart3, Loader2 } from "lucide-react";
import { api } from "@/src/utils/api";
import {
  ScoreAnalyticsProvider,
  type DataType,
} from "@/src/features/score-analytics/components/ScoreAnalyticsProvider";
import { ScoreAnalyticsHeader } from "@/src/features/score-analytics/components/ScoreAnalyticsHeader";
import { ScoreAnalyticsDashboard } from "@/src/features/score-analytics/components/ScoreAnalyticsDashboard";

/**
 * Score Analytics V2 - Refactored Architecture
 *
 * This page uses the new Provider + Hook + Smart Cards pattern:
 * - ScoreAnalyticsProvider: Fetches & transforms data once, exposes via Context
 * - ScoreAnalyticsHeader: Score selectors, filters, time range picker
 * - ScoreAnalyticsDashboard: 2x2 responsive grid with 4 smart cards
 * - Smart Cards: Self-contained components that consume Provider context
 *   - StatisticsCard: Summary metrics and comparison stats
 *   - TimelineChartCard: Time series trends
 *   - DistributionChartCard: Score distributions
 *   - HeatmapCard: Score comparison heatmaps
 *
 */
export default function ScoresAnalyticsV2Page() {
  const router = useRouter();
  const projectId = router.query.projectId as string;

  const urlStateHook = useAnalyticsUrlState();
  const { state: urlState, setScore2 } = urlStateHook;

  const { timeRange, setTimeRange } = useDashboardDateRange();

  // Fetch available scores from API
  const {
    data: scoresData,
    isLoading: scoresLoading,
    error: scoresError,
  } = api.scoreAnalytics.getScoreIdentifiers.useQuery(
    { projectId },
    { enabled: !!projectId },
  );

  // Transform API data to ScoreOption format and sort by dataType
  const scoreOptions: ScoreOption[] = useMemo(() => {
    if (!scoresData?.scores) return [];

    // Define sort order for data types
    const typeOrder: Record<string, number> = {
      BOOLEAN: 0,
      CATEGORICAL: 1,
      NUMERIC: 2,
    };

    return scoresData.scores
      .map((score) => ({
        value: score.value,
        name: score.name,
        dataType: score.dataType,
        source: score.source,
      }))
      .sort((a, b) => {
        // Sort by dataType first
        const typeA = typeOrder[a.dataType] ?? 999;
        const typeB = typeOrder[b.dataType] ?? 999;
        if (typeA !== typeB) return typeA - typeB;

        // Then by name alphabetically
        return a.name.localeCompare(b.name);
      });
  }, [scoresData]);

  // Parse selected scores to get their data types
  const score1DataType = useMemo(() => {
    if (!urlState.score1) return undefined;
    const selected = scoreOptions.find((opt) => opt.value === urlState.score1);
    return selected?.dataType;
  }, [urlState.score1, scoreOptions]);

  // Determine which score types are compatible with score1
  // Same-type pairing only: NUMERIC with NUMERIC, BOOLEAN with BOOLEAN, CATEGORICAL with CATEGORICAL
  const compatibleScore2DataTypes = useMemo(() => {
    if (!score1DataType) return undefined;

    // Only allow same-type pairing
    return [score1DataType];
  }, [score1DataType]);

  // Clear score2 when score1's dataType changes
  const prevScore1DataTypeRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    // Skip on initial render
    if (prevScore1DataTypeRef.current === undefined) {
      prevScore1DataTypeRef.current = score1DataType;
      return;
    }

    // If dataType has changed and there's a score2 selected, clear it
    if (prevScore1DataTypeRef.current !== score1DataType && urlState.score2) {
      setScore2(undefined);
    }

    prevScore1DataTypeRef.current = score1DataType;
  }, [score1DataType, urlState.score2, setScore2]);

  // Parse score identifiers (format: "name-dataType-source")
  const parsedScore1 = useMemo(() => {
    if (!urlState.score1) return undefined;
    const selected = scoreOptions.find((opt) => opt.value === urlState.score1);
    if (!selected) return undefined;
    return {
      name: selected.name,
      dataType: selected.dataType as DataType,
      source: selected.source,
    };
  }, [urlState.score1, scoreOptions]);

  const parsedScore2 = useMemo(() => {
    if (!urlState.score2) return undefined;
    const selected = scoreOptions.find((opt) => opt.value === urlState.score2);
    if (!selected) return undefined;
    return {
      name: selected.name,
      dataType: selected.dataType as DataType,
      source: selected.source,
    };
  }, [urlState.score2, scoreOptions]);

  // Convert time range to absolute dates
  const absoluteTimeRange = useMemo(
    () => toAbsoluteTimeRange(timeRange),
    [timeRange],
  );

  // Calculate optimal interval based on time range
  const interval = useMemo(() => {
    if (!absoluteTimeRange) return { count: 1, unit: "day" as const };
    return getOptimalInterval(absoluteTimeRange.from, absoluteTimeRange.to);
  }, [absoluteTimeRange]);

  // Determine query params for Provider
  const queryParams = useMemo(() => {
    if (
      !parsedScore1 ||
      !projectId ||
      !absoluteTimeRange?.from ||
      !absoluteTimeRange?.to
    ) {
      return undefined;
    }

    return {
      projectId,
      score1: parsedScore1,
      score2: parsedScore2,
      fromTimestamp: absoluteTimeRange.from,
      toTimestamp: absoluteTimeRange.to,
      interval,
      objectType: urlState.objectType,
    };
  }, [
    parsedScore1,
    parsedScore2,
    projectId,
    absoluteTimeRange,
    interval,
    urlState.objectType,
  ]);

  // UI state flags
  const hasError = !!scoresError;
  const hasNoScores =
    !scoresLoading && scoreOptions.length === 0 && !scoresError;
  const hasNoSelection = !hasError && !hasNoScores && !urlState.score1;

  return (
    <Page
      headerProps={{
        title: "评分分析",
        breadcrumb: [{ name: "评分", href: `/project/${projectId}/scores` }],
        help: {
          description:
            "评分用于评估 Trace 或观测节点，可来源于用户反馈、模型自动评估或人工审核。查看文档了解详情。",
          href: "https://langfuse.com/docs/evaluation/overview",
        },
        tabsProps: {
          tabs: getScoresTabs(projectId),
          activeTab: SCORES_TABS.ANALYTICS,
        },
      }}
    >
      <div className="flex max-h-full flex-col gap-0">
        {/* Header Controls */}
        {!hasError && !hasNoScores && (
          <ScoreAnalyticsHeader
            scoreOptions={scoreOptions}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
            compatibleScore2DataTypes={compatibleScore2DataTypes}
          />
        )}

        {/* Content Section */}
        <div className="max-h-full overflow-y-scroll p-4 pt-6">
          {hasError ? (
            <div className="bg-destructive/10 flex flex-col items-center justify-center gap-4 rounded-3xl border border-sky-200/70 p-12 shadow-sm">
              <BarChart3 className="text-destructive h-12 w-12" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">评分加载失败</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  评分数据加载失败，请刷新页面后重试。
                </p>
              </div>
            </div>
          ) : hasNoScores ? (
            <div className="bg-muted/20 flex flex-col items-center justify-center gap-4 rounded-3xl border border-sky-200/70 p-12 shadow-sm">
              <BarChart3 className="text-muted-foreground h-12 w-12" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">暂无评分数据</h3>
                <p className="text-muted-foreground mt-2 text-sm">
                  为你的 Trace 或观测节点添加评估后，这里会展示评分分析结果。
                </p>
              </div>
            </div>
          ) : hasNoSelection ? (
            <div className="bg-muted/20 flex flex-col items-center justify-center gap-6 rounded-3xl border border-sky-200/70 p-12 shadow-sm">
              <BarChart3 className="text-muted-foreground h-16 w-16" />
              <div className="max-w-2xl text-center">
                <h3 className="text-2xl font-semibold">请选择评分项</h3>
                <p className="text-muted-foreground mt-3 text-base">
                  从上方下拉框中选择一个或两个评分项，即可查看分析结果。
                </p>
                <div className="text-muted-foreground mt-6 space-y-3 text-sm">
                  <div className="bg-background/70 rounded-2xl p-4">
                    <p className="text-foreground mb-1 font-semibold">
                      选择单个评分时：
                    </p>
                    <p>查看分布情况与时间趋势</p>
                  </div>
                  <div className="bg-background/70 rounded-2xl p-4">
                    <p className="text-foreground mb-1 font-semibold">
                      选择两个评分时：
                    </p>
                    <p>
                      使用热力图、相关性分析和统计指标对两项评分进行对比
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : queryParams ? (
            <ScoreAnalyticsProvider params={queryParams}>
              <ScoreAnalyticsDashboard />
            </ScoreAnalyticsProvider>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-sky-200/70 bg-white/80 p-12 shadow-sm">
              <Loader2 className="text-muted-foreground h-12 w-12 animate-spin" />
              <p className="text-muted-foreground text-sm">
                正在加载分析数据...
              </p>
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}
