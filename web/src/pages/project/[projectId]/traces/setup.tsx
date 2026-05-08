import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import ContainerPage from "@/src/components/layouts/container-page";
import { ActionButton } from "@/src/components/ActionButton";
import { SubHeader } from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { ApiKeyRender } from "@/src/features/public-api/components/CreateApiKeyButton";
import { type RouterOutput } from "@/src/utils/types";
import { useState } from "react";
import { useQueryProject } from "@/src/features/projects/hooks";

export const TracingSetup = ({
  projectId,
  hasTracingConfigured,
}: {
  projectId: string;
  hasTracingConfigured?: boolean;
}) => {
  const [apiKeys, setApiKeys] = useState<
    RouterOutput["projectApiKeys"]["create"] | null
  >(null);
  const utils = api.useUtils();
  const mutCreateApiKey = api.projectApiKeys.create.useMutation({
    onSuccess: (data) => {
      utils.projectApiKeys.invalidate();
      setApiKeys(data);
    },
  });

  const createApiKey = async () => {
    try {
      await mutCreateApiKey.mutateAsync({ projectId });
    } catch (error) {
      console.error("Error creating API key:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <SubHeader title="1. 获取 API 密钥" />
        {apiKeys ? (
          <ApiKeyRender
            generatedKeys={apiKeys}
            scope={"project"}
            className="mt-4"
          />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-muted-foreground text-sm">
              你需要先创建 API 密钥，才能开始接入应用追踪。后续也可以在项目设置中继续新增更多密钥。
            </p>
            <div className="flex gap-2">
              <Button
                onClick={createApiKey}
                loading={mutCreateApiKey.isPending}
                className="self-start"
              >
                创建新的 API 密钥
              </Button>
              <ActionButton
                href={`/project/${projectId}/settings/api-keys`}
                variant="secondary"
              >
                管理 API 密钥
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      <div>
        <SubHeader
          title="2. 为应用接入追踪"
          status={hasTracingConfigured ? "active" : "pending"}
        />
        <p className="text-muted-foreground mb-4 text-sm">
          Langfuse 基于 OpenTelemetry 为你的应用打点，并将 LLM
          应用或 Agent 的追踪数据上报到 Langfuse。你可以使用我们的 SDK，或接入 50+
          框架集成。请按照文档中的快速开始完成接入。
        </p>
        <ActionButton href="https://langfuse.com/docs/observability/get-started">
          查看快速开始
        </ActionButton>
      </div>
    </div>
  );
};

export default function TracesSetupPage() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const { project } = useQueryProject();

  // Check if the user has tracing configured
  // Skip polling entirely if the project flag is already set in the session
  const { data: hasTracingConfigured } =
    api.traces.hasTracingConfigured.useQuery(
      { projectId },
      {
        enabled: !!projectId,
        refetchInterval: project?.hasTraces ? false : 5000,
        initialData: project?.hasTraces ? true : undefined,
        staleTime: project?.hasTraces ? Infinity : 0,
        trpc: {
          context: {
            skipBatch: true,
          },
        },
      },
    );

  const capture = usePostHogClientCapture();
  useEffect(() => {
    if (hasTracingConfigured !== undefined) {
      capture("onboarding:tracing_check_active", {
        active: hasTracingConfigured,
      });
    }
  }, [hasTracingConfigured, capture]);

  return (
    <ContainerPage
      headerProps={{
        title: "追踪接入设置",
        help: {
          description:
            "配置追踪能力以监控和分析你的 LLM 调用。你可以在这里创建 API 密钥并将 Langfuse 接入应用。",
          href: "https://langfuse.com/docs/observability/overview",
        },
      }}
    >
      <div className="flex flex-col gap-4">
        <TracingSetup
          projectId={projectId}
          hasTracingConfigured={hasTracingConfigured ?? false}
        />
      </div>
    </ContainerPage>
  );
}
