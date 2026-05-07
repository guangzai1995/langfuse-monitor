import { DataTable } from "@/src/components/table/data-table";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { api } from "@/src/utils/api";
import { safeExtract } from "@/src/utils/map-utils";
import { type BatchExport } from "@langfuse/shared";
import { StatusBadge } from "@/src/components/layouts/status-badge";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import { ActionButton } from "@/src/components/ActionButton";
import { DownloadIcon, InfoIcon } from "lucide-react";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/components/ui/alert-dialog";
import { useState } from "react";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";

const batchExportStatusLabelMap: Record<string, string> = {
  QUEUED: "排队中",
  PROCESSING: "处理中",
  COMPLETED: "已完成",
  FAILED: "失败",
  CANCELLED: "已取消",
};

const getLocalizedBatchExportStatus = (status: string) =>
  batchExportStatusLabelMap[status] ?? status;

export function BatchExportsTable(props: { projectId: string }) {
  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 10),
  });
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedExportId, setSelectedExportId] = useState<string | null>(null);

  const batchExports = api.batchExport.all.useQuery({
    projectId: props.projectId,
    limit: paginationState.pageSize,
    page: paginationState.pageIndex,
  });

  const cancelBatchExport = api.batchExport.cancel.useMutation({
    onSuccess: () => {
      void batchExports.refetch();
      setCancelDialogOpen(false);
      setSelectedExportId(null);
    },
  });

  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "batchExports:create",
  });

  const columns = [
    {
      accessorKey: "name",
      id: "name",
      header: "名称",
      size: 200,
      cell: ({ row }) => {
        const name = row.getValue("name") as string;
        const { createdAt, finishedAt } = row.original;
        return (
          <div className="flex items-center gap-2">
            <span className="whitespace-break-spaces">{name}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <InfoIcon className="text-muted-foreground size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <div>创建时间：{new Date(createdAt).toLocaleString()}</div>
                    <div>
                      完成时间：{" "}
                      {finishedAt ? new Date(finishedAt).toLocaleString() : "-"}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: "状态",
      size: 90,
      cell: (row) => {
        const status = row.getValue() as string;
        return (
          <StatusBadge type={status.toLowerCase()}>
            {getLocalizedBatchExportStatus(status)}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "url",
      id: "url",
      header: "下载",
      size: 130,
      cell: (info) => {
        const url = info.getValue() as string | null;
        if (!url) {
          return null;
        }
        if (url === "expired") {
          return <span className="text-muted-foreground">已过期</span>;
        }
        return (
          <ActionButton href={url} icon={<DownloadIcon size={16} />} size="sm">
            下载
          </ActionButton>
        );
      },
    },
    {
      accessorKey: "format",
      id: "format",
      header: "格式",
      size: 70,
    },
    {
      accessorKey: "user",
      id: "user",
      header: "创建者",
      size: 150,
      cell: ({ row }) => {
        const user = row.getValue("user") as {
          name: string | null;
          image: string | null;
        } | null;
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={user?.image ?? undefined}
                alt={user?.name ?? "用户头像"}
              />
            </Avatar>
            <span>{user?.name ?? "未知用户"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "log",
      id: "log",
      header: "日志",
      size: 300,
      cell: (row) => {
        const log = row.getValue() as string | null;
        return log ?? null;
      },
    },
    {
      accessorKey: "actions",
      id: "actions",
      header: "操作",
      size: 100,
      cell: ({ row }) => {
        const id = row.original.id;
        const status = row.getValue("status") as string;

        // Only show cancel button for queued or processing exports
        if (status !== "QUEUED" && status !== "PROCESSING") {
          return null;
        }

        return (
          <AlertDialog
            open={cancelDialogOpen && selectedExportId === id}
            onOpenChange={(open) => {
              if (!open) {
                setCancelDialogOpen(false);
                setSelectedExportId(null);
              }
            }}
          >
            <AlertDialogTrigger asChild>
              <ActionButton
                hasAccess={hasAccess}
                size="sm"
                onClick={() => {
                  setSelectedExportId(id);
                  setCancelDialogOpen(true);
                }}
              >
                取消
              </ActionButton>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>取消导出任务？</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要取消这个导出任务吗？此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>继续保留</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    cancelBatchExport.mutate({
                      projectId: props.projectId,
                      batchExportId: id,
                    });
                  }}
                >
                  确认取消
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ] as LangfuseColumnDef<BatchExport>[];

  return (
    <>
      <DataTable
        tableName={"batchExports"}
        columns={columns}
        data={
          batchExports.isPending
            ? { isLoading: true, isError: false }
            : batchExports.isError
              ? {
                  isLoading: false,
                  isError: true,
                  error: batchExports.error.message,
                }
              : {
                  isLoading: false,
                  isError: false,
                  data: safeExtract(batchExports.data, "exports", []),
                }
        }
        pagination={{
          totalCount: batchExports.data?.totalCount ?? null,
          onChange: setPaginationState,
          state: paginationState,
        }}
      />
    </>
  );
}
