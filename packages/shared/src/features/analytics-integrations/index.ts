// Export source options for analytics integrations (PostHog, Mixpanel, Blob Storage)
// This is a client-safe file that can be imported from @langfuse/shared

import { AnalyticsIntegrationExportSource } from "@prisma/client";

export const EXPORT_SOURCE_OPTIONS: Array<{
  value: AnalyticsIntegrationExportSource;
  label: string;
  description: string;
}> = [
  {
    value: "TRACES_OBSERVATIONS" as const,
    label: "Traces 与 Observations（旧版）",
    description:
      "导出 traces、observations 和评分。这是将 traces 与 observations 分表存储之前的旧版导出方式，建议优先使用“增强型 observations”选项。",
  },
  {
    value: "TRACES_OBSERVATIONS_EVENTS" as const,
    label: "Traces 与 Observations（旧版）+ 增强型 observations",
    description:
      "同时导出 traces、observations、评分和增强型 observations。由于会同时包含旧版与新版数据源，本质上会产生重复数据，因此仅建议在将现有集成迁移到新版增强型 observations 时临时使用，用于校验下游消费逻辑。",
  },
  {
    value: "EVENTS" as const,
    label: "增强型 observations（推荐）",
    description:
      "导出增强型 observations 和评分。这是当前推荐的集成数据源，也会作为新建集成的默认选项。",
  },
] as const;

export type ExportSourceOption = (typeof EXPORT_SOURCE_OPTIONS)[number];
export type ExportSourceValue = ExportSourceOption["value"];
