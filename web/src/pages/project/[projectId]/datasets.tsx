import { useRouter } from "next/router";
import { DatasetsTable } from "@/src/features/datasets/components/DatasetsTable";
import Page from "@/src/components/layouts/page";
import { DatasetActionButton } from "@/src/features/datasets/components/DatasetActionButton";
import { api } from "@/src/utils/api";
import { DatasetsOnboarding } from "@/src/components/onboarding/DatasetsOnboarding";
import { useQueryParam, StringParam } from "use-query-params";

export default function Datasets() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const [currentFolderPath] = useQueryParam("folder", StringParam);

  // Check if the project has any datasets
  const { data: hasAnyDataset, isLoading } = api.datasets.hasAny.useQuery(
    { projectId },
    {
      enabled: !!projectId,
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  const showOnboarding = !isLoading && !hasAnyDataset;

  if (showOnboarding) {
    return (
      <Page
        headerProps={{
          title: "数据集",
          help: {
            description:
              "Langfuse 中的数据集是 LLM 应用输入及期望输出的集合，可用于在发布前对新版本进行基准测试。",
            href: "https://langfuse.com/docs/evaluation/dataset-runs/datasets",
          },
        }}
        scrollable
      >
        <DatasetsOnboarding projectId={projectId} />
      </Page>
    );
  }

  return (
    <Page
      headerProps={{
        title: "数据集",
        help: {
          description:
            "Langfuse 中的数据集是 LLM 应用输入及期望输出的集合，可用于在发布前对新版本进行基准测试。",
          href: "https://langfuse.com/docs/evaluation/dataset-runs/datasets",
        },
        actionButtonsRight: (
          <DatasetActionButton
            projectId={projectId}
            mode="create"
            folderPrefix={currentFolderPath || undefined}
          />
        ),
      }}
    >
      <DatasetsTable projectId={projectId} />
    </Page>
  );
}
