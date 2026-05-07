import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { SettingsTableCard } from "@/src/components/layouts/settings-table-card";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { BatchActionsTable } from "./BatchActionsTable";

export function BatchActionsSettingsPage(props: { projectId: string }) {
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "datasets:CUD",
  });

  return (
    <>
      <Header title="批量操作记录" />
      <p className="mb-4 text-sm">
        查看表格批量操作的执行状态，例如将观测加入数据集、删除链路，或向标注队列中批量添加条目。这些操作会在后台异步处理。
      </p>
      {hasAccess ? (
        <SettingsTableCard>
          <BatchActionsTable projectId={props.projectId} />
        </SettingsTableCard>
      ) : (
        <Alert>
          <AlertTitle>访问被拒绝</AlertTitle>
          <AlertDescription>
            你没有查看批量操作记录的权限。
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
