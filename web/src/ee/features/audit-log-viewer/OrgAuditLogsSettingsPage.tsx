import Header from "@/src/components/layouts/header";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { AuditLogsTable } from "@/src/ee/features/audit-log-viewer/AuditLogsTable";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import { useHasOrganizationAccess } from "@/src/features/rbac/utils/checkOrganizationAccess";

export function OrgAuditLogsSettingsPage(props: { orgId: string }) {
  const hasAccess = useHasOrganizationAccess({
    organizationId: props.orgId,
    scope: "auditLogs:read",
  });
  const hasEntitlement = useHasEntitlement("audit-logs");

  const body = !hasEntitlement ? (
    <p className="text-muted-foreground text-sm">
      审计日志是企业版功能。升级你的套餐后，即可跟踪组织中的所有变更。
    </p>
  ) : !hasAccess ? (
    <Alert>
      <AlertTitle>访问被拒绝</AlertTitle>
      <AlertDescription>
        请联系组织管理员申请访问权限。
      </AlertDescription>
    </Alert>
  ) : (
    <AuditLogsTable scope="organization" orgId={props.orgId} />
  );

  return (
    <>
      <Header title="组织审计日志" />
      <p className="text-muted-foreground mb-2 text-sm">
        追踪组织中是谁在什么时间改动了哪些内容。你可以查看组织设置、项目的
        创建与删除，以及成员变更等历史记录。
      </p>
      {body}
    </>
  );
}
