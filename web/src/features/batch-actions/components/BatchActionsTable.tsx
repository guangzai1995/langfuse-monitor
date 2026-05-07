import { DataTable } from "@/src/components/table/data-table";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import { api } from "@/src/utils/api";
import { safeExtract } from "@/src/utils/map-utils";
import { StatusBadge } from "@/src/components/layouts/status-badge";
import { NumberParam, useQueryParams, withDefault } from "use-query-params";
import { InfoIcon } from "lucide-react";
import { Avatar, AvatarImage } from "@/src/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { LocalIsoDate } from "@/src/components/LocalIsoDate";

type BatchActionRow = {
  id: string;
  actionType: string;
  tableName: string;
  status: string;
  totalCount: number | null;
  processedCount: number | null;
  failedCount: number | null;
  createdAt: Date;
  finishedAt: Date | null;
  log: string | null;
  user: {
    name: string | null;
    image: string | null;
  } | null;
};

export function BatchActionsTable(props: { projectId: string }) {
  const [paginationState, setPaginationState] = useQueryParams({
    pageIndex: withDefault(NumberParam, 0),
    pageSize: withDefault(NumberParam, 10),
  });

  const batchActions = api.batchAction.all.useQuery({
    projectId: props.projectId,
    limit: paginationState.pageSize,
    page: paginationState.pageIndex,
  });

  const getLocalizedActionType = (actionType: string) => {
    switch (actionType) {
      case "add-observations-to-dataset":
        return "添加观测到数据集";
      case "delete-traces":
        return "删除链路";
      case "add-to-annotation-queue":
        return "加入标注队列";
      default:
        return actionType
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
    }
  };

  const getLocalizedStatus = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "待处理";
      case "processing":
        return "处理中";
      case "completed":
        return "已完成";
      case "failed":
        return "失败";
      case "cancelled":
        return "已取消";
      default:
        return status;
    }
  };

  const columns: LangfuseColumnDef<BatchActionRow>[] = [
    {
      accessorKey: "actionType",
      id: "actionType",
      header: "操作类型",
      size: 200,
      cell: ({ row }) => {
        const actionType = row.getValue("actionType") as string;
        return <span>{getLocalizedActionType(actionType)}</span>;
      },
    },
    {
      accessorKey: "tableName",
      id: "tableName",
      header: "表",
      size: 120,
      cell: ({ row }) => {
        const tableName = row.getValue("tableName") as string;
        return <span className="capitalize">{tableName}</span>;
      },
    },
    {
      accessorKey: "status",
      id: "status",
      header: "状态",
      size: 110,
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <StatusBadge type={status.toLowerCase()} className="capitalize">
            {getLocalizedStatus(status)}
          </StatusBadge>
        );
      },
    },
    {
      accessorKey: "progress",
      id: "progress",
      header: "进度",
      size: 150,
      cell: ({ row }) => {
        const totalCount = row.original.totalCount;
        const processedCount = row.original.processedCount ?? 0;
        const failedCount = row.original.failedCount ?? 0;

        if (!totalCount)
          return <span className="text-muted-foreground">-</span>;

        return (
          <div className="space-y-1">
            <div className="text-sm">
              {processedCount} / {totalCount}
            </div>
            {failedCount > 0 && (
              <div className="text-destructive text-xs">
                {failedCount} 条失败
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      id: "createdAt",
      header: "创建时间",
      size: 150,
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date;
        return <LocalIsoDate date={createdAt} />;
      },
    },
    {
      accessorKey: "finishedAt",
      id: "finishedAt",
      header: "完成时间",
      size: 150,
      cell: ({ row }) => {
        const finishedAt = row.getValue("finishedAt") as Date | null;
        return finishedAt ? (
          <LocalIsoDate date={finishedAt} />
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
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
      cell: ({ row }) => {
        const log = row.getValue("log") as string | null;
        return log ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1">
                  <InfoIcon className="text-muted-foreground h-3 w-3" />
                  <span className="max-w-[250px] truncate text-xs">{log}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <pre className="max-h-60 overflow-auto text-xs whitespace-pre-wrap">
                  {log}
                </pre>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null;
      },
    },
  ];

  return (
    <DataTable
      tableName={"batchActions"}
      columns={columns}
      data={
        batchActions.isPending
          ? { isLoading: true, isError: false }
          : batchActions.isError
            ? {
                isLoading: false,
                isError: true,
                error: batchActions.error.message,
              }
            : {
                isLoading: false,
                isError: false,
                data: safeExtract(batchActions.data, "batchActions", []),
              }
      }
      pagination={{
        totalCount: batchActions.data?.totalCount ?? 0,
        onChange: setPaginationState,
        state: paginationState,
      }}
    />
  );
}
