import { useEffect, useState } from "react";
import useProjectIdFromURL from "@/src/hooks/useProjectIdFromURL";
import { useOrderByState } from "@/src/features/orderBy/hooks/useOrderByState";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import { api } from "@/src/utils/api";
import { safeExtract } from "@/src/utils/map-utils";
import { DataTable } from "@/src/components/table/data-table";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { createColumnHelper } from "@tanstack/react-table";
import TableLink from "@/src/components/table/table-link";
import { LocalIsoDate } from "@/src/components/LocalIsoDate";
import { useDetailPageLists } from "@/src/features/navigate-detail-pages/context";
import { Button } from "@/src/components/ui/button";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { Copy, Edit } from "lucide-react";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { DeleteDashboardButton } from "@/src/components/deleteButton";
import { EditDashboardDialog } from "@/src/features/dashboard/components/EditDashboardDialog";
import { User as UserIcon } from "lucide-react";
import { useRouter } from "next/router";
import {
  getLocalizedDashboardDescription,
  getLocalizedDashboardName,
} from "@/src/features/dashboard/utils/localized-dashboard";

type DashboardTableRow = {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  owner: "PROJECT" | "LANGFUSE";
};

function CloneDashboardButton({
  dashboardId,
  projectId,
}: {
  dashboardId: string;
  projectId: string;
}) {
  const utils = api.useUtils();
  const hasAccess = useHasProjectAccess({ projectId, scope: "dashboards:CUD" });
  const capture = usePostHogClientCapture();

  const mutCloneDashboard = api.dashboard.cloneDashboard.useMutation({
    onSuccess: () => {
      void utils.dashboard.invalidate();
      capture("dashboard:clone_dashboard");
      showSuccessToast({
        title: "仪表盘已克隆",
        description: "仪表盘已成功克隆",
      });
    },
    onError: (e) => {
      showErrorToast("克隆仪表盘失败", e.message);
    },
  });

  const handleCloneDashboard = () => {
    if (!projectId) {
      console.error("Project ID is missing");
      return;
    }

    void mutCloneDashboard.mutateAsync({
      projectId,
      dashboardId,
    });
  };

  return (
    <Button
      variant="ghost"
      size="default"
      disabled={!hasAccess}
      onClick={handleCloneDashboard}
    >
      <Copy className="mr-2 h-4 w-4" />
      克隆
    </Button>
  );
}

function EditDashboardButton({
  dashboardId,
  projectId,
  dashboardName,
  dashboardDescription,
}: {
  dashboardId: string;
  projectId: string;
  dashboardName: string;
  dashboardDescription: string;
}) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const hasAccess = useHasProjectAccess({ projectId, scope: "dashboards:CUD" });

  return (
    <>
      <Button
        variant="ghost"
        size="default"
        disabled={!hasAccess}
        onClick={() => setIsDialogOpen(true)}
      >
        <Edit className="mr-2 h-4 w-4" />
        编辑
      </Button>

      <EditDashboardDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        projectId={projectId}
        dashboardId={dashboardId}
        initialName={dashboardName}
        initialDescription={dashboardDescription}
      />
    </>
  );
}

export function DashboardTable() {
  const projectId = useProjectIdFromURL() as string;
  const { setDetailPageList } = useDetailPageLists();
  const router = useRouter();

  const [orderByState, setOrderByState] = useOrderByState({
    column: "updatedAt",
    order: "DESC",
  });
  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 50),
  });

  const dashboards = api.dashboard.allDashboards.useQuery(
    {
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
      projectId: projectId as string, // Typecast as query is enabled only when projectId is present
      orderBy: orderByState,
    },
    {
      enabled: Boolean(projectId),
      trpc: {
        context: {
          skipBatch: true,
        },
      },
    },
  );

  useEffect(() => {
    if (dashboards.isSuccess) {
      setDetailPageList(
        "dashboards",
        dashboards.data?.dashboards.map((d) => ({ id: d.id })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboards.isSuccess, dashboards.data]);

  const columnHelper = createColumnHelper<DashboardTableRow>();
  const dashboardColumns = [
    columnHelper.accessor("name", {
      header: "名称",
      id: "name",
      enableSorting: true,
      size: 200,
      cell: (row) => {
        const name = row.getValue();
        const localizedName = getLocalizedDashboardName({
          owner: row.row.original.owner,
          name,
        });
        return name ? (
          <TableLink
            path={`/project/${projectId}/dashboards/${encodeURIComponent(row.row.original.id)}`}
            value={localizedName}
          />
        ) : undefined;
      },
    }),
    columnHelper.accessor("description", {
      header: "描述",
      id: "description",
      size: 300,
      cell: (row) => {
        return getLocalizedDashboardDescription({
          owner: row.row.original.owner,
          name: row.row.original.name,
          description: row.getValue(),
        });
      },
    }),
    columnHelper.display({
      id: "ownerTag",
      header: "归属",
      size: 80,
      cell: (row) => {
        return row.row.original.owner === "LANGFUSE" ? (
          <span className="flex gap-1 px-2 py-0.5 text-xs">
            <span role="img" aria-label="Langfuse">
              🪢
            </span>
            Langfuse
          </span>
        ) : (
          <span className="flex gap-1 px-2 py-0.5 text-xs">
            <UserIcon className="h-3 w-3" /> 项目
          </span>
        );
      },
    }),
    columnHelper.accessor("createdAt", {
      header: "创建时间",
      id: "createdAt",
      enableSorting: true,
      size: 150,
      cell: (row) => {
        const createdAt = row.getValue();
        return <LocalIsoDate date={createdAt} />;
      },
    }),
    columnHelper.accessor("updatedAt", {
      header: "更新时间",
      id: "updatedAt",
      enableSorting: true,
      size: 150,
      cell: (row) => {
        const updatedAt = row.getValue();
        return <LocalIsoDate date={updatedAt} />;
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "操作",
      size: 70,
      cell: (row) => {
        const id = row.row.original.id;
        const name = row.row.original.name;
        const description = row.row.original.description;
        const owner = row.row.original.owner;
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex flex-col *:w-full *:justify-start">
                {owner === "PROJECT" && (
                  <DropdownMenuItem asChild>
                    <EditDashboardButton
                      dashboardId={id}
                      projectId={projectId}
                      dashboardName={name}
                      dashboardDescription={description}
                    />
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <CloneDashboardButton
                    dashboardId={id}
                    projectId={projectId}
                  />
                </DropdownMenuItem>
                {owner === "PROJECT" && (
                  <DropdownMenuItem asChild>
                    <DeleteDashboardButton
                      itemId={id}
                      projectId={projectId}
                      isTableAction
                    />
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    }),
  ] as LangfuseColumnDef<DashboardTableRow>[];

  return (
    <DataTable
      tableName={"dashboards"}
      columns={dashboardColumns}
      data={
        dashboards.isPending
          ? { isLoading: true, isError: false }
          : dashboards.isError
            ? {
                isLoading: false,
                isError: true,
                error: dashboards.error.message,
              }
            : {
                isLoading: false,
                isError: false,
                data: safeExtract(dashboards.data, "dashboards", []),
              }
      }
      orderBy={orderByState}
      setOrderBy={setOrderByState}
      pagination={{
        totalCount: dashboards.data?.totalCount ?? null,
        onChange: setPaginationState,
        state: paginationState,
      }}
      onRowClick={(row) => {
        router.push(
          `/project/${projectId}/dashboards/${encodeURIComponent(row.id)}`,
        );
      }}
    />
  );
}
