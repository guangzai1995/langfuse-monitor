import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { ClipboardCheck, Users, BarChart4, GitMerge } from "lucide-react";
import { CreateOrEditAnnotationQueueButton } from "@/src/features/annotation-queues/components/CreateOrEditAnnotationQueueButton";

export function AnnotationQueuesOnboarding({
  projectId,
}: {
  projectId: string;
}) {
  const valuePropositions: ValueProposition[] = [
    {
      title: "管理评分流程",
      description:
        "创建并管理标注队列，让评分流程更清晰高效",
      icon: <ClipboardCheck className="h-4 w-4" />,
    },
    {
      title: "协同标注",
      description: "邀请团队成员一起标注和评估 LLM 输出",
      icon: <Users className="h-4 w-4" />,
    },
    {
      title: "追踪标注指标",
      description:
        "监控团队标注进度与质量指标",
      icon: <BarChart4 className="h-4 w-4" />,
    },
    {
      title: "沉淀评估基线",
      description:
        "使用标注数据作为基线，校准其他评估指标",
      icon: <GitMerge className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title="开始使用标注队列"
      description="标注队列帮助你管理 LLM 项目的人工标注与打标流程。你可以创建队列、定义标注指标，并持续跟踪进度。"
      valuePropositions={valuePropositions}
      primaryAction={{
        label: "创建标注队列",
        component: (
          <CreateOrEditAnnotationQueueButton
            variant="default"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: "了解更多",
        href: "https://langfuse.com/docs/scores/annotation",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/annotation-queue-overview-v1.mp4"
    />
  );
}
