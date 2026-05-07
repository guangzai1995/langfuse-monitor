import React from "react";
import {
  SplashScreen,
  type ValueProposition,
} from "@/src/components/ui/splash-screen";
import { Database, Beaker, Zap, Code } from "lucide-react";
import { DatasetActionButton } from "@/src/features/datasets/components/DatasetActionButton";

export function DatasetsOnboarding({ projectId }: { projectId: string }) {
  const valuePropositions: ValueProposition[] = [
    {
      title: "持续改进",
      description:
        "从生产环境中的边界案例构建数据集，持续优化你的应用",
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: "上线前验证",
      description: "在发布到生产环境前对新版本进行基准测试",
      icon: <Beaker className="h-4 w-4" />,
    },
    {
      title: "结构化测试",
      description:
        "围绕输入与期望输出集合运行实验",
      icon: <Database className="h-4 w-4" />,
    },
    {
      title: "自定义工作流",
      description:
        "通过 API 和 SDK 围绕数据集搭建自定义流程，例如微调或 few-shot 实验",
      icon: <Code className="h-4 w-4" />,
    },
  ];

  return (
    <SplashScreen
      title="开始使用数据集与实验"
      description="Langfuse 中的数据集是 LLM 应用输入及期望输出的集合。你可以基于这些数据集运行实验，在发布前验证新版本表现。"
      valuePropositions={valuePropositions}
      primaryAction={{
        label: "创建数据集",
        component: (
          <DatasetActionButton
            variant="default"
            mode="create"
            projectId={projectId}
            size="lg"
          />
        ),
      }}
      secondaryAction={{
        label: "了解更多",
        href: "https://langfuse.com/docs/datasets",
      }}
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/datasets-overview-v1.mp4"
    />
  );
}
