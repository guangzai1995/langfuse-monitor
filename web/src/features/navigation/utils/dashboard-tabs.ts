export const DASHBOARD_TABS = {
  DASHBOARDS: "dashboards",
  WIDGETS: "widgets",
} as const;

export type DashboardTab = (typeof DASHBOARD_TABS)[keyof typeof DASHBOARD_TABS];

export const getDashboardTabs = (projectId: string) => [
  {
    value: DASHBOARD_TABS.DASHBOARDS,
    label: "仪表盘",
    href: `/project/${projectId}/dashboards`,
  },
  {
    value: DASHBOARD_TABS.WIDGETS,
    label: "图表组件",
    href: `/project/${projectId}/widgets`,
  },
];
