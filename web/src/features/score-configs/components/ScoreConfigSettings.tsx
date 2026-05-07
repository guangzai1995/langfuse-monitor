import React from "react";
import Header from "@/src/components/layouts/header";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { ScoreConfigsTable } from "@/src/components/table/use-cases/score-configs";

export function ScoreConfigSettings({ projectId }: { projectId: string }) {
  const hasReadAccess = useHasProjectAccess({
    projectId: projectId,
    scope: "scoreConfigs:read",
  });

  if (!hasReadAccess) return null;

  return (
    <div id="score-configs">
      <Header title="评分配置" />
      <p className="mb-2 text-sm">
        评分配置用于定义项目中可用于{" "}
        <a
          href="https://langfuse.com/docs/evaluation/evaluation-methods/annotation"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          人工标注
        </a>{" "}
        的评分项。请注意，评分配置创建后不可变更核心类型。
      </p>
      <ScoreConfigsTable projectId={projectId} />
    </div>
  );
}
