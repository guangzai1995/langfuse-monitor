export const SCORES_TABS = {
  SCORES: "scores",
  ANALYTICS: "analytics",
} as const;

export type ScoresTab = (typeof SCORES_TABS)[keyof typeof SCORES_TABS];

export const getScoresTabs = (projectId: string) => [
  {
    value: SCORES_TABS.SCORES,
    label: "评分列表",
    href: `/project/${projectId}/scores`,
  },
  {
    value: SCORES_TABS.ANALYTICS,
    label: "分析",
    href: `/project/${projectId}/scores/analytics`,
  },
];
