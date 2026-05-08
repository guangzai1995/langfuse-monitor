import Header from "@/src/components/layouts/header";
import ContainerPage from "@/src/components/layouts/container-page";
import { StatusBadge } from "@/src/components/layouts/status-badge";
import { Button } from "@/src/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/src/components/ui/form";
import { Input } from "@/src/components/ui/input";
import { PasswordInput } from "@/src/components/ui/password-input";
import { Switch } from "@/src/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/src/components/ui/tooltip";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import {
  blobStorageIntegrationFormSchema,
  type BlobStorageIntegrationFormSchema,
  type BlobStorageSyncStatus,
} from "@/src/features/blobstorage-integration/types";
import { deriveSyncStatus } from "@/src/features/blobstorage-integration/deriveSyncStatus";
import { Alert, AlertTitle, AlertDescription } from "@/src/components/ui/alert";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { api } from "@/src/utils/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/src/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import {
  BlobStorageIntegrationType,
  BlobStorageIntegrationFileType,
  BlobStorageExportMode,
  AnalyticsIntegrationExportSource,
  type BlobStorageIntegration,
  EXPORT_SOURCE_OPTIONS,
} from "@langfuse/shared";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { Info, ExternalLink } from "lucide-react";

const getExportSourceLabel = (value: AnalyticsIntegrationExportSource) => {
  return (
    EXPORT_SOURCE_OPTIONS.find((option) => option.value === value)?.label ?? value
  );
};

export default function BlobStorageIntegrationSettings() {
  const router = useRouter();
  const projectId = router.query.projectId as string;
  const hasAccess = useHasProjectAccess({
    projectId,
    scope: "integrations:CRUD",
  });
  const state = api.blobStorageIntegration.get.useQuery(
    { projectId },
    {
      enabled: hasAccess,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 50 * 60 * 1000, // 50 minutes
    },
  );

  const syncStatus =
    state.isInitialLoading || !hasAccess || !state.data
      ? undefined
      : deriveSyncStatus({
          enabled: state.data.enabled,
          lastError: state.data.lastError,
          lastSyncAt: state.data.lastSyncAt
            ? new Date(state.data.lastSyncAt)
            : null,
          nextSyncAt: state.data.nextSyncAt
            ? new Date(state.data.nextSyncAt)
            : null,
        });

  const syncStatusToBadge: Record<BlobStorageSyncStatus, string> = {
    up_to_date: "active",
    queued: "queued",
    idle: "inactive",
    disabled: "disabled",
    error: "error",
  };

  return (
    <ContainerPage
      headerProps={{
        title: "对象存储集成",
        breadcrumb: [
          { name: "设置", href: `/project/${projectId}/settings` },
        ],
        actionButtonsLeft: (
          <>
            {syncStatus && <StatusBadge type={syncStatusToBadge[syncStatus]} />}
          </>
        ),
        actionButtonsRight: (
          <Button asChild variant="secondary">
            <Link
              href="https://langfuse.com/docs/api-and-data-platform/features/export-to-blob-storage"
              target="_blank"
            >
              集成文档 ↗
            </Link>
          </Button>
        ),
      }}
    >
      <p className="text-primary mb-4 text-sm">
        可将 trace 数据按计划导出到 AWS S3、兼容 S3 的存储服务，或 Azure Blob Storage。你可以配置按小时、按天或按周导出到自己的存储空间，用于数据分析或备份。点击“校验配置”可上传一个小测试文件验证设置，点击“立即执行”可立刻触发一次导出。
      </p>
      {!hasAccess && (
        <p className="text-sm">
          你当前的角色无权访问这些设置，请联系项目管理员或所有者。
        </p>
      )}
      {state.data && (
        <>
          <Header title="状态" />
          {state.data.lastError && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>最近一次导出失败</AlertTitle>
              <AlertDescription>
                {state.data.lastError}
                {state.data.lastErrorAt && (
                  <>
                    <br />
                    <span className="text-xs opacity-70">
                      {new Date(state.data.lastErrorAt).toLocaleString()}
                    </span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
          <Card className="p-3">
            <div className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">数据已导出至</span>
              <span>
                {state.data.lastSyncAt
                  ? new Date(state.data.lastSyncAt).toLocaleString()
                  : "尚未导出（等待中）"}
              </span>
              {state.data.nextSyncAt && (
                <>
                  <span className="text-muted-foreground">
                    下次计划导出时间
                  </span>
                  <span>
                    {new Date(state.data.nextSyncAt).toLocaleString()}
                  </span>
                </>
              )}
              <span className="text-muted-foreground">导出模式</span>
              <span>
                {state.data.exportMode === BlobStorageExportMode.FULL_HISTORY
                  ? "完整历史"
                  : state.data.exportMode === BlobStorageExportMode.FROM_TODAY
                    ? "从配置当天开始"
                    : state.data.exportMode ===
                        BlobStorageExportMode.FROM_CUSTOM_DATE
                      ? "从自定义日期开始"
                      : "未知"}
              </span>
              {(state.data.exportMode ===
                BlobStorageExportMode.FROM_CUSTOM_DATE ||
                state.data.exportMode === BlobStorageExportMode.FROM_TODAY) &&
                state.data.exportStartDate && (
                  <>
                    <span className="text-muted-foreground">
                      导出起始日期
                    </span>
                    <span>
                      {new Date(
                        state.data.exportStartDate,
                      ).toLocaleDateString()}
                    </span>
                  </>
                )}
            </div>
          </Card>
        </>
      )}
      {hasAccess && (
        <>
          <Header title="配置" className="mt-8" />
          <Card className="p-3">
            <BlobStorageIntegrationSettingsForm
              state={state.data || undefined}
              projectId={projectId}
              isLoading={state.isLoading}
            />
          </Card>
        </>
      )}
    </ContainerPage>
  );
}

const BlobStorageIntegrationSettingsForm = ({
  state,
  projectId,
  isLoading,
}: {
  state?: Partial<BlobStorageIntegration>;
  projectId: string;
  isLoading: boolean;
}) => {
  const capture = usePostHogClientCapture();
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const { isBetaEnabled } = useV4Beta();
  const [integrationType, setIntegrationType] =
    useState<BlobStorageIntegrationType>(BlobStorageIntegrationType.S3);

  // Check if this is a self-hosted instance (no cloud region set)
  const isSelfHosted = !isLangfuseCloud;

  const blobStorageForm = useForm({
    resolver: zodResolver(blobStorageIntegrationFormSchema),
    defaultValues: {
      type: state?.type || BlobStorageIntegrationType.S3,
      bucketName: state?.bucketName || "",
      endpoint: state?.endpoint || null,
      region: state?.region || "",
      accessKeyId: state?.accessKeyId || "",
      secretAccessKey: state?.secretAccessKey || null,
      prefix: state?.prefix || "",
      exportFrequency: (state?.exportFrequency || "daily") as
        | "daily"
        | "weekly"
        | "hourly",
      enabled: state?.enabled || false,
      forcePathStyle: state?.forcePathStyle || false,
      fileType: state?.fileType || BlobStorageIntegrationFileType.JSONL,
      exportMode: state?.exportMode || BlobStorageExportMode.FULL_HISTORY,
      exportStartDate: state?.exportStartDate || null,
      exportSource:
        state?.exportSource ||
        (isBetaEnabled
          ? AnalyticsIntegrationExportSource.EVENTS
          : AnalyticsIntegrationExportSource.TRACES_OBSERVATIONS),
    },
    disabled: isLoading,
  });

  useEffect(() => {
    setIntegrationType(state?.type || BlobStorageIntegrationType.S3);
    blobStorageForm.reset({
      type: state?.type || BlobStorageIntegrationType.S3,
      bucketName: state?.bucketName || "",
      endpoint: state?.endpoint || null,
      region: state?.region || "auto",
      accessKeyId: state?.accessKeyId || "",
      secretAccessKey: state?.secretAccessKey || null,
      prefix: state?.prefix || "",
      exportFrequency: (state?.exportFrequency || "daily") as
        | "daily"
        | "weekly"
        | "hourly",
      enabled: state?.enabled || false,
      forcePathStyle: state?.forcePathStyle || false,
      fileType: state?.fileType || BlobStorageIntegrationFileType.JSONL,
      exportMode: state?.exportMode || BlobStorageExportMode.FULL_HISTORY,
      exportStartDate: state?.exportStartDate || null,
      exportSource:
        state?.exportSource ||
        (isBetaEnabled
          ? AnalyticsIntegrationExportSource.EVENTS
          : AnalyticsIntegrationExportSource.TRACES_OBSERVATIONS),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const utils = api.useUtils();
  const mut = api.blobStorageIntegration.update.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutDelete = api.blobStorageIntegration.delete.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutRunNow = api.blobStorageIntegration.runNow.useMutation({
    onSuccess: () => {
      utils.blobStorageIntegration.invalidate();
    },
  });
  const mutValidate = api.blobStorageIntegration.validate.useMutation({
    onSuccess: (data) => {
      showSuccessToast({
        title: data.message,
        description: `测试文件：${data.testFileName}`,
      });
    },
    onError: (error) => {
      showErrorToast("校验失败", error.message);
    },
  });

  async function onSubmit(values: BlobStorageIntegrationFormSchema) {
    capture("integrations:blob_storage_form_submitted");
    mut.mutate({
      projectId,
      ...values,
    });
  }

  const handleIntegrationTypeChange = (value: BlobStorageIntegrationType) => {
    setIntegrationType(value);
    blobStorageForm.setValue("type", value);
  };

  return (
    <Form {...blobStorageForm}>
      <form
        className="space-y-3"
        onSubmit={blobStorageForm.handleSubmit(onSubmit)}
      >
        <FormField
          control={blobStorageForm.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>存储提供方</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    handleIntegrationTypeChange(
                      value as BlobStorageIntegrationType,
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择提供方" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S3">AWS S3</SelectItem>
                    <SelectItem value="S3_COMPATIBLE">
                      S3 兼容存储
                    </SelectItem>
                    <SelectItem value="AZURE_BLOB_STORAGE">
                      Azure Blob Storage
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                选择你的云存储提供方。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="bucketName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "容器名称"
                  : "Bucket 名称"}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "Azure 存储容器名称"
                  : "S3 Bucket 名称"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Endpoint URL field - Only shown for S3-compatible and Azure */}
        {integrationType !== "S3" && (
          <FormField
            control={blobStorageForm.control}
            name="endpoint"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endpoint 地址</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ""} />
                </FormControl>
                <FormDescription>
                  {integrationType === "AZURE_BLOB_STORAGE"
                    ? "Azure Blob Storage 的 endpoint 地址，例如 https://accountname.blob.core.windows.net"
                    : "S3 兼容存储的 endpoint 地址，例如 https://play.min.io"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Region field - Only shown for AWS S3 or compatible storage */}
        {integrationType !== "AZURE_BLOB_STORAGE" && (
          <FormField
            control={blobStorageForm.control}
            name="region"
            render={({ field }) => (
              <FormItem>
                <FormLabel>区域</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>
                  {integrationType === "S3"
                    ? "AWS 区域，例如 us-east-1"
                    : "S3 兼容存储所在区域"}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Force Path Style switch - Only shown for S3-compatible */}
        {integrationType === "S3_COMPATIBLE" && (
          <FormField
            control={blobStorageForm.control}
            name="forcePathStyle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>强制使用 Path Style</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="mt-1 ml-4"
                  />
                </FormControl>
                <FormDescription>
                  MinIO 及部分 S3 兼容服务需要启用此项。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={blobStorageForm.control}
          name="accessKeyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "Storage Account Name"
                  : integrationType === "S3"
                    ? "AWS Access Key ID"
                    : "Access Key ID"}
                {/* Show optional indicator for S3 types on self-hosted instances with entitlement */}
                {isSelfHosted && integrationType === "S3" && (
                  <span className="text-muted-foreground">（可选）</span>
                )}
              </FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "Azure 存储账户名称"
                  : integrationType === "S3"
                    ? isSelfHosted
                      ? "AWS IAM 用户的 Access Key ID。留空则尝试使用宿主机凭据（如 IAM Role、实例配置等）。"
                      : "AWS IAM 用户的 Access Key ID"
                    : "S3 兼容存储的 Access Key"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="secretAccessKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "Storage Account Key"
                  : integrationType === "S3"
                    ? "AWS Secret Access Key"
                    : "Secret Access Key"}
                {/* Show optional indicator for S3 types on self-hosted instances with entitlement */}
                {isSelfHosted && integrationType === "S3" && (
                  <span className="text-muted-foreground">（可选）</span>
                )}
              </FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder="********************"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? "Azure 存储账户访问密钥"
                  : integrationType === "S3"
                    ? isSelfHosted
                      ? "AWS IAM 用户的 Secret Access Key。留空则尝试使用宿主机凭据（如 IAM Role、实例配置等）。"
                      : "AWS IAM 用户的 Secret Access Key"
                    : "S3 兼容存储的 Secret Key"}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="prefix"
          render={({ field }) => (
            <FormItem>
              <FormLabel>导出前缀</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormDescription>
                {integrationType === "AZURE_BLOB_STORAGE"
                  ? 'Azure 容器内导出文件的可选前缀路径，例如 "langfuse-exports/"'
                  : integrationType === "S3"
                    ? 'S3 Bucket 内导出文件的可选前缀路径，例如 "langfuse-exports/"'
                    : '导出文件的可选前缀路径，例如 "langfuse-exports/"'}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="exportFrequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>导出频率</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择频率" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">每小时</SelectItem>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                指定数据导出的频率。变更会从下一次执行开始生效。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="fileType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>文件类型</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择文件类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="JSONL">JSONL</SelectItem>
                    <SelectItem value="CSV">CSV</SelectItem>
                    <SelectItem value="JSON">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                导出数据所使用的文件格式。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={blobStorageForm.control}
          name="exportMode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>导出模式</FormLabel>
              <FormControl>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择导出模式" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BlobStorageExportMode.FULL_HISTORY}>
                      完整历史
                    </SelectItem>
                    <SelectItem value={BlobStorageExportMode.FROM_TODAY}>
                      今天起
                    </SelectItem>
                    <SelectItem value={BlobStorageExportMode.FROM_CUSTOM_DATE}>
                      自定义日期
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormDescription>
                选择从何时开始导出数据。“今天起”和“自定义日期”模式不会包含指定日期之前的历史数据。
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {isBetaEnabled && (
          <FormField
            control={blobStorageForm.control}
            name="exportSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center gap-1.5 pt-2">
                  导出来源
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="text-muted-foreground h-3.5 w-3.5" />
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="max-w-[350px] space-y-2 p-3"
                    >
                      {EXPORT_SOURCE_OPTIONS.map((option) => (
                        <div key={option.value} className="space-y-0.5">
                          <div className="font-medium">{getExportSourceLabel(option.value)}</div>
                          <div className="text-muted-foreground text-xs">
                            {option.description}
                          </div>
                        </div>
                      ))}
                      <div className="border-t pt-2">
                        <a
                          href="https://langfuse.com/docs/integrations/export-sources"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs hover:underline"
                        >
                          查看更多说明
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择要导出的数据" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {EXPORT_SOURCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {getExportSourceLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  选择要导出到对象存储的数据来源。评分数据会始终一并导出。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {blobStorageForm.watch("exportMode") ===
          BlobStorageExportMode.FROM_CUSTOM_DATE && (
          <FormField
            control={blobStorageForm.control}
            name="exportStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>导出起始日期</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    value={
                      field.value instanceof Date
                        ? field.value.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value)
                        : null;
                      field.onChange(date);
                    }}
                    placeholder="选择起始日期"
                  />
                </FormControl>
                <FormDescription>
                  此日期之前的数据不会被包含在导出结果中。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={blobStorageForm.control}
          name="enabled"
          render={({ field }) => (
            <FormItem>
              <FormLabel>启用</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="mt-1 ml-4"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
      <div className="mt-8 flex gap-2">
        <Button
          loading={mut.isPending}
          onClick={blobStorageForm.handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          loading={mutValidate.isPending}
          disabled={isLoading || !state}
          title="Test your saved configuration by uploading a small test file to your storage"
          title="通过上传一个小测试文件来校验已保存的配置"
          onClick={() => {
            mutValidate.mutate({ projectId });
          }}
        >
          校验配置
        </Button>
        <Button
          variant="secondary"
          loading={mutRunNow.isPending}
          disabled={isLoading || !state?.enabled}
          title="立即触发一次导出，包含自上次同步以来的所有数据"
          onClick={() => {
            if (
              confirm(
                "确定要立即执行对象存储导出吗？这会导出自上次同步以来的全部数据。",
              )
            )
              mutRunNow.mutate({ projectId });
          }}
        >
          立即执行
        </Button>
        <Button
          variant="ghost"
          loading={mutDelete.isPending}
          disabled={isLoading || !!!state}
          onClick={() => {
            if (
              confirm(
                "确定要重置当前项目的对象存储集成吗？",
              )
            )
              mutDelete.mutate({ projectId });
          }}
        >
          重置
        </Button>
      </div>
    </Form>
  );
};
