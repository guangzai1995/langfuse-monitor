import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { BatchExportsTable } from "@/src/features/batch-exports/components/BatchExportsTable";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { SettingsTableCard } from "@/src/components/layouts/settings-table-card";

export function BatchExportsSettingsPage(props: { projectId: string }) {
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "batchExports:read",
  });

  return (
    <>
      <Header title="导出记录" />
      <p className="mb-4 text-sm">
        你可以通过 Langfuse 各处的导出按钮，将大批量数据按所需格式导出。
        导出任务会异步处理，生成后可在一小时内下载。导出完成后，你还会
        收到邮件通知。
      </p>
      {hasAccess ? (
        <SettingsTableCard>
          <BatchExportsTable projectId={props.projectId} />
        </SettingsTableCard>
      ) : (
        <Alert>
          <AlertTitle>访问被拒绝</AlertTitle>
          <AlertDescription>
            你没有查看导出记录的权限。
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
