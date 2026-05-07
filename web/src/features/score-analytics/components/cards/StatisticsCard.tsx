import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Loader2 } from "lucide-react";
import { useScoreAnalytics } from "../ScoreAnalyticsProvider";
import { MetricCard } from "../charts/MetricCard";
import { SamplingDetailsHoverCard } from "../SamplingDetailsHoverCard";
import {
  calculateCohensKappa,
  calculateWeightedF1Score,
  calculateOverallAgreement,
  interpretPearsonCorrelation,
  interpretSpearmanCorrelation,
  interpretCohensKappa,
  interpretF1Score,
  interpretOverallAgreement,
  interpretMAE,
  interpretRMSE,
} from "@/src/features/score-analytics/lib/statistics-utils";

/**
 * StatisticsCard - Smart card component for displaying score statistics
 *
 * Consumes ScoreAnalyticsProvider context and displays:
 * - Score 1 stats (always shown)
 * - Score 2 stats (shown in two-score mode)
 * - Comparison metrics (shown in two-score mode)
 *
 * Handles:
 * - Loading states
 * - Empty states
 * - Single vs two-score modes
 * - Numeric vs categorical data types
 */
export function StatisticsCard() {
  const { data, isLoading, params } = useScoreAnalytics();

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>Loading statistics...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  // No data state
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground py-12 text-center text-sm">
          Select a score to view statistics
        </CardContent>
      </Card>
    );
  }

  // Extract data from context
  const { statistics, metadata } = data;
  const { dataType } = metadata;
  const { score1, score2 } = params;

  // Check if Cartesian product occurred (matched count exceeds both individual counts)
  const hasCartesianProduct =
    statistics.comparison &&
    statistics.comparison.matchedCount > statistics.score1.total &&
    statistics.score2 &&
    statistics.comparison.matchedCount > statistics.score2.total;

  // Determine what to show
  const showScore1Data = statistics.score1.total > 0;
  const showScore2Data = statistics.score2 !== null;
  const showComparisonMetrics = statistics.comparison !== null;

  // Always show Score 2 and Comparison sections once score1 is selected
  // to set user expectations about what information will be available
  const showScore2Section = true; // Always show when on this page
  const showComparisonSection = true; // Always show when on this page

  // Calculate categorical metrics if available
  const cohensKappa =
    showComparisonMetrics && statistics.comparison?.confusionMatrix
      ? calculateCohensKappa(statistics.comparison.confusionMatrix)
      : null;
  const f1Score =
    showComparisonMetrics && statistics.comparison?.confusionMatrix
      ? calculateWeightedF1Score(statistics.comparison.confusionMatrix)
      : null;
  const overallAgreement =
    showComparisonMetrics && statistics.comparison?.confusionMatrix
      ? calculateOverallAgreement(statistics.comparison.confusionMatrix)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          统计概览
          {data.samplingMetadata.isSampled && (
            <SamplingDetailsHoverCard
              samplingMetadata={data.samplingMetadata}
              mode={data.metadata.mode}
              showLabel
            />
          )}
        </CardTitle>
        <CardDescription>
          {score2
            ? `${score1.name} vs ${score2.name}`
            : `${score1.name} - 选择第二个评分后可进行对比`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section 1: Score 1 Data */}
        <div>
          <h4 className="mb-2 text-xs font-semibold">
            {score1.name} ({score1.source})
          </h4>
          {dataType === "NUMERIC" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label="总数"
                value={
                  showScore1Data
                    ? statistics.score1.total.toLocaleString()
                    : "--"
                }
                helpText={`${score1.name} 的评分总数`}
                isPlaceholder={!showScore1Data}
                isContext
              />
              <MetricCard
                label="均值"
                value={
                  showScore1Data && statistics.score1.mean !== null
                    ? statistics.score1.mean.toFixed(2)
                    : !showScore1Data
                      ? "--"
                      : "N/A"
                }
                helpText={`${score1.name} 的平均值`}
                isPlaceholder={!showScore1Data}
                isContext
              />
              <MetricCard
                label="标准差"
                value={
                  showScore1Data && statistics.score1.std !== null
                    ? statistics.score1.std.toFixed(2)
                    : !showScore1Data
                      ? "--"
                      : "N/A"
                }
                helpText={`${score1.name} 的标准差`}
                isPlaceholder={!showScore1Data}
                isContext
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard
                label="总数"
                value={
                  showScore1Data
                    ? statistics.score1.total.toLocaleString()
                    : "--"
                }
                helpText={`${score1.name} 的评分总数`}
                isPlaceholder={!showScore1Data}
                isContext
              />
              <MetricCard
                label="众数"
                value={
                  showScore1Data && statistics.score1.mode
                    ? `${statistics.score1.mode.category} (${statistics.score1.mode.count.toLocaleString()})`
                    : !showScore1Data
                      ? "--"
                      : "N/A"
                }
                helpText="出现频率最高的类别及其数量"
                isPlaceholder={!showScore1Data}
                isContext
              />
              <MetricCard
                label="众数占比"
                value={
                  showScore1Data && statistics.score1.modePercentage !== null
                    ? `${statistics.score1.modePercentage.toFixed(1)}%`
                    : !showScore1Data
                      ? "--"
                      : "N/A"
                }
                helpText="出现频率最高类别所占的观测比例"
                isPlaceholder={!showScore1Data}
                isContext
              />
            </div>
          )}
        </div>

        {/* Section 2: Score 2 Data - Always show to set expectations */}
        {showScore2Section && (
          <div>
            <h4 className="mb-2 text-xs font-semibold">
              {score2?.name ?? "评分 2"}
              {score2?.source ? ` (${score2.source})` : ""}
            </h4>
            {dataType === "NUMERIC" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  label="总数"
                  value={
                    showScore2Data && statistics.score2
                      ? statistics.score2.total.toLocaleString()
                      : "--"
                  }
                  helpText={`${score2?.name ?? "评分 2"} 的评分总数`}
                  isPlaceholder={!showScore2Data}
                  isContext
                />
                <MetricCard
                  label="均值"
                  value={
                    showScore2Data &&
                    statistics.score2 &&
                    statistics.score2.mean !== null
                      ? statistics.score2.mean.toFixed(2)
                      : !showScore2Data
                        ? "--"
                        : "N/A"
                  }
                  helpText={`${score2?.name ?? "评分 2"} 的平均值`}
                  isPlaceholder={!showScore2Data}
                  isContext
                />
                <MetricCard
                  label="标准差"
                  value={
                    showScore2Data &&
                    statistics.score2 &&
                    statistics.score2.std !== null
                      ? statistics.score2.std.toFixed(2)
                      : !showScore2Data
                        ? "--"
                        : "N/A"
                  }
                  helpText={`${score2?.name ?? "评分 2"} 的标准差`}
                  isPlaceholder={!showScore2Data}
                  isContext
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MetricCard
                  label="总数"
                  value={
                    showScore2Data && statistics.score2
                      ? statistics.score2.total.toLocaleString()
                      : "--"
                  }
                  helpText={`${score2?.name ?? "评分 2"} 的评分总数`}
                  isPlaceholder={!showScore2Data}
                  isContext
                />
                <MetricCard
                  label="众数"
                  value={
                    showScore2Data && statistics.score2?.mode
                      ? `${statistics.score2.mode.category} (${statistics.score2.mode.count.toLocaleString()})`
                      : !showScore2Data
                        ? "--"
                        : "N/A"
                  }
                  helpText="出现频率最高的类别及其数量"
                  isPlaceholder={!showScore2Data}
                  isContext
                />
                <MetricCard
                  label="众数占比"
                  value={
                    showScore2Data &&
                    statistics.score2 &&
                    statistics.score2.modePercentage !== null
                      ? `${statistics.score2.modePercentage.toFixed(1)}%`
                      : !showScore2Data
                        ? "--"
                        : "N/A"
                  }
                  helpText="出现频率最高类别所占的观测比例"
                  isPlaceholder={!showScore2Data}
                  isContext
                />
              </div>
            )}
          </div>
        )}

        {/* Section 3: Comparison Metrics - Always show to set expectations */}
        {showComparisonSection && (
          <div>
            <h4 className="mb-2 text-xs font-semibold">对比指标</h4>
            {dataType === "NUMERIC" ? (
              <div className="space-y-4">
                {/* First row: Matched, Pearson, Spearman */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="匹配数"
                    value={
                      showComparisonMetrics && statistics.comparison
                        ? statistics.comparison.matchedCount.toLocaleString()
                        : "--"
                    }
                    helpText="同时拥有两项评分的观测数量"
                    warning={
                      hasCartesianProduct
                        ? {
                            show: true,
                            content: (
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold">
                                  由于笛卡尔积，匹配数可能高于单项评分数量
                                </p>
                                <p>
                                  当同一个挂载点（Trace、观测、会话或运行）上存在多个相同名称/来源的评分时，就会出现这种情况。每一种组合都会形成一组匹配。
                                </p>
                                <p className="text-muted-foreground">
                                  <strong>示例：</strong>如果一条 Trace 上有 2 个
                                  &quot;gpt4&quot; 评分和 3 个
                                  &quot;gemini&quot; 评分，就会形成 6 组匹配（2 × 3 = 6）。
                                </p>
                              </div>
                            ),
                          }
                        : undefined
                    }
                    isContext
                    isPlaceholder={!showComparisonMetrics}
                  />
                  <MetricCard
                    label="Pearson r"
                    value={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.pearsonCorrelation !== null
                        ? statistics.comparison.pearsonCorrelation.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.pearsonCorrelation !== null
                        ? interpretPearsonCorrelation(
                            statistics.comparison.pearsonCorrelation,
                          )
                        : undefined
                    }
                    helpText="线性相关性（-1 到 1）"
                    isPlaceholder={!showComparisonMetrics}
                  />
                  <MetricCard
                    label="Spearman ρ"
                    value={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.spearmanCorrelation !== null
                        ? statistics.comparison.spearmanCorrelation.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.spearmanCorrelation !== null
                        ? interpretSpearmanCorrelation(
                            statistics.comparison.spearmanCorrelation,
                          )
                        : undefined
                    }
                    helpText="秩相关性（-1 到 1）"
                    isPlaceholder={!showComparisonMetrics}
                  />
                </div>
                {/* Second row: Empty, MAE, RMSE */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div />
                  <MetricCard
                    label="MAE"
                    value={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.mae !== null
                        ? statistics.comparison.mae.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.mae !== null
                        ? interpretMAE(statistics.comparison.mae)
                        : undefined
                    }
                    helpText="平均绝对误差"
                    isPlaceholder={!showComparisonMetrics}
                  />
                  <MetricCard
                    label="RMSE"
                    value={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.rmse !== null
                        ? statistics.comparison.rmse.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics &&
                      statistics.comparison &&
                      statistics.comparison.rmse !== null
                        ? interpretRMSE(statistics.comparison.rmse)
                        : undefined
                    }
                    helpText="均方根误差"
                    isPlaceholder={!showComparisonMetrics}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* First row: Matched, Agreement */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <MetricCard
                    label="匹配数"
                    value={
                      showComparisonMetrics && statistics.comparison
                        ? statistics.comparison.matchedCount.toLocaleString()
                        : "--"
                    }
                    helpText="同时拥有两项评分的观测数量"
                    warning={
                      hasCartesianProduct
                        ? {
                            show: true,
                            content: (
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold">
                                  由于笛卡尔积，匹配数可能高于单项评分数量
                                </p>
                                <p>
                                  当同一个挂载点（Trace、观测、会话或运行）上存在多个相同名称/来源的评分时，就会出现这种情况。每一种组合都会形成一组匹配。
                                </p>
                                <p className="text-muted-foreground">
                                  <strong>示例：</strong>如果一条 Trace 上有 2 个
                                  &quot;gpt4&quot; 评分和 3 个
                                  &quot;gemini&quot; 评分，就会形成 6 组匹配（2 × 3 = 6）。
                                </p>
                              </div>
                            ),
                          }
                        : undefined
                    }
                    isContext
                    isPlaceholder={!showComparisonMetrics}
                  />
                  <MetricCard
                    label="一致率"
                    value={
                      showComparisonMetrics && overallAgreement !== null
                        ? `${(overallAgreement * 100).toFixed(1)}%`
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics && overallAgreement !== null
                        ? interpretOverallAgreement(overallAgreement)
                        : undefined
                    }
                    helpText="整体一致比例"
                    isPlaceholder={!showComparisonMetrics}
                  />
                </div>
                {/* Second row: Empty, Cohen's κ, F1 Score */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div />
                  <MetricCard
                    label="Cohen's κ"
                    value={
                      showComparisonMetrics && cohensKappa !== null
                        ? cohensKappa.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics && cohensKappa !== null
                        ? interpretCohensKappa(cohensKappa)
                        : undefined
                    }
                    helpText="评分者一致性（-1 到 1）"
                    isPlaceholder={!showComparisonMetrics}
                  />
                  <MetricCard
                    label="F1 分数"
                    value={
                      showComparisonMetrics && f1Score !== null
                        ? f1Score.toFixed(3)
                        : showComparisonMetrics
                          ? "N/A"
                          : "--"
                    }
                    interpretation={
                      showComparisonMetrics && f1Score !== null
                        ? interpretF1Score(f1Score)
                        : undefined
                    }
                    helpText="加权 F1 分数（0 到 1）"
                    isPlaceholder={!showComparisonMetrics}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
