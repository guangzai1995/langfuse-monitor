// used on organization.cloudConfig.plan
export const cloudConfigPlans = [
  "Hobby",
  "Core",
  "Pro",
  "Team",
  "Enterprise",
] as const;

export const planLabels = {
  oss: "OSS",
  "cloud:hobby": "个人版",
  "cloud:core": "核心版",
  "cloud:pro": "专业版",
  "cloud:team": "团队版",
  "cloud:enterprise": "企业版",
  "self-hosted:pro": "专业版（自托管）",
  "self-hosted:enterprise": "企业版（自托管）",
} as const;

export type Plan = keyof typeof planLabels;

export const plans = Object.keys(planLabels) as Plan[];

// These functions are kept here to ensure consistency when updating plan names in the future.
export const isCloudPlan = (plan?: Plan) => plan?.startsWith("cloud");
export const isSelfHostedPlan = (plan?: Plan) =>
  plan?.startsWith("self-hosted");

export const isPlan = (value: string): value is Plan =>
  plans.includes(value as Plan);
