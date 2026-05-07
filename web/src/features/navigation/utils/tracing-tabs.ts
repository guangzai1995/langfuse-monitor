export const TRACING_TABS = {
  TRACES: "traces",
  OBSERVATIONS: "observations",
} as const;

export type TracingTab = (typeof TRACING_TABS)[keyof typeof TRACING_TABS];

export const getTracingTabs = (projectId: string) => [
  {
    value: TRACING_TABS.TRACES,
    label: "链路列表",
    href: `/project/${projectId}/traces`,
  },
  {
    value: TRACING_TABS.OBSERVATIONS,
    label: "观测列表",
    href: `/project/${projectId}/observations`,
  },
];
