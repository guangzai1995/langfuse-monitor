import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { AuditLogsTable } from "@/src/ee/features/audit-log-viewer/AuditLogsTable";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";

export function AuditLogsSettingsPage(props: { projectId: string }) {
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "auditLogs:read",
  });
  const hasEntitlement = useHasEntitlement("audit-logs");

  const body = !hasEntitlement ? (
    <p className="text-muted-foreground text-sm">
      审计日志是企业版功能。升级你的套餐后，即可跟踪项目中的所有变更。
    </p>
  ) : !hasAccess ? (
    <Alert>
      <AlertTitle>访问被拒绝</AlertTitle>
      <AlertDescription>
        请联系项目管理员申请访问权限。
      </AlertDescription>
    </Alert>
  ) : (
    <AuditLogsTable scope="project" projectId={props.projectId} />
  );

  return (
    <>
      <Header title="审计日志" />
      <p className="text-muted-foreground mb-2 text-sm">
        追踪项目中是谁在什么时间改动了哪些内容。你可以持续查看设置、配置和
        数据的变更记录。如果你需要更细粒度或可筛选的审计日志，请联系
        Langfuse 团队。
      </p>
      {body}
    </>
  );
}
