// formModels.ts
import { z } from "zod";

/** ── Message Type ────────────────────────────────────────────────────────── */
export const MessageTypeSchema = z.enum(["Question", "Feedback", "Bug"]);
export type MessageType = z.infer<typeof MessageTypeSchema>;

/** ── Form Sections (for your stepper/wizard) ─────────────────────────────── */
export const FormSectionSchema = z.enum(["intro", "form", "success"]);
export type FormSection = z.infer<typeof FormSectionSchema>;

/** ── Topics (grouped + flattened) ────────────────────────────────────────── */
export const TopicGroups = {
  Operations: [
    "Account Changes",
    "Account Deletion",
    "Billing / Usage",
    "Inviting Users",
    "Set Up SSO",
    "Slack Connect Channel",
  ],
  "Product Features": [
    "Observability",
    "Prompt Management",
    "Evaluation",
    "Platform",
    "Other",
  ],
} as const;

export type TopicGroup = keyof typeof TopicGroups;

export const ALL_TOPICS = [
  ...TopicGroups.Operations,
  ...TopicGroups["Product Features"],
] as const;

export const TopicSchema = z.enum(ALL_TOPICS);
export type Topic = z.infer<typeof TopicSchema>;

export const SeveritySchema = z.enum([
  "Question or feature request",
  "Feature not working as expected",
  "Feature is not working at all",
  "Outage, data loss, or data breach",
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const IntegrationTypeSchema = z.enum([
  "Python SDK",
  "TypeScript SDK",
  "Other SDK",
  "Public API",
  "OpenAI SDK",
  "Vercel AI SDK",
  "LangChain",
  "LangGraph",
  "OTel Instrumentation",
  "LLM Proxy (LiteLLM)",
  "3rd Party (Dify / LangFlow / Flowise)",
  "Other (please specify)",
]);
export type IntegrationType = z.infer<typeof IntegrationTypeSchema>;

export const SupportFormSchema = z.object({
  messageType: MessageTypeSchema.default("Question"),
  severity: SeveritySchema,
  integrationType: z.string().optional(),
  topic: z
    .union([TopicSchema, z.literal("")])
    .refine((val) => val !== "", { message: "请选择一个主题。" })
    .transform((val) => val as z.infer<typeof TopicSchema>),
  message: z
    .string()
    .trim()
    .min(1, "请填写你遇到的问题或需求描述。"),
});
export type SupportFormValues = z.infer<typeof SupportFormSchema>;

export const MESSAGE_TYPES = MessageTypeSchema.options;
export const FORM_SECTIONS = FormSectionSchema.options;
export const SEVERITIES = SeveritySchema.options;
export const INTEGRATION_TYPES = IntegrationTypeSchema.options;

export const MessageTypeLabelMap: Record<MessageType, string> = {
  Question: "问题",
  Feedback: "反馈",
  Bug: "缺陷",
};

export const TopicGroupLabelMap: Record<TopicGroup, string> = {
  Operations: "运营与账户",
  "Product Features": "产品功能",
};

export const TopicLabelMap: Record<Topic, string> = {
  "Account Changes": "账号变更",
  "Account Deletion": "账号删除",
  "Billing / Usage": "账单 / 用量",
  "Inviting Users": "邀请用户",
  "Set Up SSO": "配置 SSO",
  "Slack Connect Channel": "Slack Connect 频道",
  Observability: "可观测性",
  "Prompt Management": "提示词管理",
  Evaluation: "评估",
  Platform: "平台",
  Other: "其他",
};

export const SeverityLabelMap: Record<Severity, string> = {
  "Question or feature request": "问题或功能请求",
  "Feature not working as expected": "功能未按预期工作",
  "Feature is not working at all": "功能完全无法使用",
  "Outage, data loss, or data breach": "故障、数据丢失或数据泄露",
};

export const IntegrationTypeLabelMap: Record<IntegrationType, string> = {
  "Python SDK": "Python SDK",
  "TypeScript SDK": "TypeScript SDK",
  "Other SDK": "其他 SDK",
  "Public API": "公共 API",
  "OpenAI SDK": "OpenAI SDK",
  "Vercel AI SDK": "Vercel AI SDK",
  LangChain: "LangChain",
  LangGraph: "LangGraph",
  "OTel Instrumentation": "OTel 埋点",
  "LLM Proxy (LiteLLM)": "LLM 代理（LiteLLM）",
  "3rd Party (Dify / LangFlow / Flowise)": "第三方平台（Dify / LangFlow / Flowise）",
  "Other (please specify)": "其他（请说明）",
};
