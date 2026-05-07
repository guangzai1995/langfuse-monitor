import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Bot, Gauge, Zap, BarChart4 } from "lucide-react";

interface EvaluatorsOnboardingProps {
  projectId: string;
}

export function EvaluatorsOnboarding({ projectId }: EvaluatorsOnboardingProps) {
  const valuePropositions: ValueProposition[] = [
    {
      title: "自动化评估",
      description:
        "使用 LLM 裁判自动评估你的链路，无需手动逐条审核",
      icon: <Bot className="h-4 w-4" />,
    },
    {
      title: "衡量质量",
      description:
        "创建自定义评估标准，量化 LLM 输出质量",
      icon: <Gauge className="h-4 w-4" />,
    },
    {
      title: "高效扩展",
      description:
        "通过可配置采样率自动评估成千上万条链路",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "持续追踪表现",
      description:
        "持续监控评估指标，识别趋势并发现改进空间",
      icon: <BarChart4 className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title="开始使用 LLM 裁判评估"
      description="创建评估模板和评估器，让 LLM 裁判自动为你的链路打分。你可以配置自定义评估标准，用 AI 持续衡量输出质量。"
      valuePropositions={valuePropositions}
      primaryAction={{
        label: "创建评估器",
        href: `/project/${projectId}/evals/new`,
      }}
      secondaryAction={{
        label: "了解更多",
        href: "https://langfuse.com/docs/evaluation/evaluation-methods/llm-as-a-judge",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/scores-llm-as-a-judge-overview-v1.mp4"
    />
  );
}
