import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/src/components/ui/dropdown-menu";
import { Button } from "@/src/components/ui/button";
import { Download, Loader, Info } from "lucide-react";
import {
  type BatchExportTableName,
  exportOptions,
  type BatchExportFileFormat,
  type OrderByState,
  BatchTableNames,
} from "@langfuse/shared";
import React from "react";
import { api } from "@/src/utils/api";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";

export type BatchExportTableButtonProps = {
  projectId: string;
  tableName: BatchExportTableName;
  orderByState: OrderByState;
  filterState: any;
  searchQuery?: any;
  searchType?: any;
};

export const BatchExportTableButton: React.FC<BatchExportTableButtonProps> = (
  props,
) => {
  const [isExporting, setIsExporting] = React.useState(false);
  const createExport = api.batchExport.create.useMutation({
    onSettled: () => {
      setIsExporting(false);
    },
    onSuccess: () => {
      showSuccessToast({
        title: "导出任务已加入队列",
        description: "导出完成后，你会收到邮件通知。",
        duration: 10000,
        link: {
          href: `/project/${props.projectId}/settings/exports`,
          text: "查看导出记录",
        },
      });
    },
  });
  const hasAccess = useHasProjectAccess({
    projectId: props.projectId,
    scope: "batchExports:create",
  });

  const handleExport = async (format: BatchExportFileFormat) => {
    setIsExporting(true);
    await createExport.mutateAsync({
      projectId: props.projectId,
      name: `${new Date().toISOString()} - ${props.tableName} as ${format}`,
      format,
      query: {
        tableName: props.tableName,
        filter: props.filterState,
        searchQuery: props.searchQuery || undefined,
        searchType: props.searchType || undefined,
        orderBy: props.orderByState,
      },
    });
  };

  if (!hasAccess) return null;

  const getWarningMessage = () => {
    switch (props.tableName) {
      case BatchTableNames.Traces:
        return "注意：Trace 导出不会包含观测级字段（级别、Tokens、成本、延迟）以及评论相关筛选，因此导出结果可能比预期更多。";
      case BatchTableNames.Observations:
        return "注意：观测导出不会包含 Trace 级字段（Trace 名称、标签、用户 ID、Trace 环境）以及评论相关筛选，因此导出结果可能比预期更多。";
      case BatchTableNames.Events:
        return "注意：事件导出不会包含评论相关筛选，因此导出结果可能比预期更多。";
      case BatchTableNames.Sessions:
        return "注意：会话导出不会包含评论相关筛选，因此导出结果可能比预期更多。";
      case BatchTableNames.AuditLogs:
        return "注意：审计日志导出不会应用当前筛选条件，将导出此项目的全部审计日志。";
      default:
        // Note: for Scores, DatasetRunItems, DatasetItems, filters should work as expected
        return null;
    }
  };

  const warningMessage = getWarningMessage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" title="导出">
          {isExporting ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent className="w-80">
          <DropdownMenuLabel>导出</DropdownMenuLabel>
          {warningMessage && (
            <div className="text-muted-foreground px-2 py-1.5 text-xs">
              <div className="flex items-start gap-1.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{warningMessage}</span>
              </div>
            </div>
          )}
          <DropdownMenuSeparator />
          {Object.entries(exportOptions).map(([key, options]) => (
            <DropdownMenuItem
              key={key}
              className="capitalize"
              onClick={() => void handleExport(key as BatchExportFileFormat)}
            >
              导出为 {options.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  );
};
