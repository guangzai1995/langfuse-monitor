"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { type z } from "zod";
import {
  MESSAGE_TYPES,
  SEVERITIES,
  INTEGRATION_TYPES,
  TopicGroups,
  MessageTypeLabelMap,
  TopicGroupLabelMap,
  TopicLabelMap,
  SeverityLabelMap,
  IntegrationTypeLabelMap,
  type MessageType,
  SupportFormSchema,
} from "./formConstants";

import { api } from "@/src/utils/api";

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
import { RadioGroup } from "@/src/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Textarea } from "@/src/components/ui/textarea";
import { useQueryProjectOrOrganization } from "@/src/features/projects/hooks";
import { useMemo, useState } from "react";

import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/src/components/ui/shadcn-io/dropzone";
import { Paperclip, Loader2, Trash2 } from "lucide-react";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { PLAIN_MAX_FILE_SIZE_BYTES } from "./plain/plainConstants";

/** Make RHF generics match the resolver (Zod defaults => input can be undefined) */
type SupportFormInput = z.input<typeof SupportFormSchema>;
type SupportFormValues = z.output<typeof SupportFormSchema>;

/**
 * File upload constraints - single source of truth for validation
 * Uses Plain API's file size limit
 */
const FILE_UPLOAD_CONSTRAINTS = {
  maxFiles: 5,
  maxFileSizeBytes: PLAIN_MAX_FILE_SIZE_BYTES, // 6MB (Plain API limit)
  maxCombinedBytes: 50 * 1024 * 1024, // 50MB
} as const;

/**
 * Validates files against upload constraints
 * @returns {isValid: boolean, error?: string}
 */
function validateFiles(files: File[] | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!files || files.length === 0) {
    return { isValid: true };
  }

  const { maxFiles, maxFileSizeBytes, maxCombinedBytes } =
    FILE_UPLOAD_CONSTRAINTS;

  // Check file count
  if (files.length > maxFiles) {
    return {
      isValid: false,
      error: `最多只能上传 ${maxFiles} 个文件。`,
    };
  }

  // Check individual file sizes
  const oversizedFile = files.find((f) => f.size > maxFileSizeBytes);
  if (oversizedFile) {
    const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `文件“${oversizedFile.name}”过大，单个文件最大支持 ${maxMB}MB。`,
    };
  }

  // Check combined size
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > maxCombinedBytes) {
    const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
    const maxMB = (maxCombinedBytes / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `附件总大小（${totalMB}MB）超过上限 ${maxMB}MB。`,
    };
  }

  return { isValid: true };
}

/**
 * Converts technical file error messages to user-friendly ones
 */
function formatFileError(error: Error): string {
  const msg = error.message.toLowerCase();
  const { maxFiles, maxFileSizeBytes, maxCombinedBytes } =
    FILE_UPLOAD_CONSTRAINTS;
  const maxMB = (maxFileSizeBytes / (1024 * 1024)).toFixed(0);
  const maxCombinedMB = (maxCombinedBytes / (1024 * 1024)).toFixed(0);

  // File size errors
  if (
    msg.includes("larger than") ||
    msg.includes("10485760") ||
    msg.includes("10mb") ||
    msg.includes("too large")
  ) {
    return `文件过大，单个文件最大支持 ${maxMB}MB。`;
  }

  // File count errors
  if (
    msg.includes("too many") ||
    msg.includes("maxfiles") ||
    msg.includes("5 files")
  ) {
    return `文件数量过多，最多允许 ${maxFiles} 个文件。`;
  }

  // Combined size errors
  if (msg.includes("total") && (msg.includes("50mb") || msg.includes("size"))) {
    return `附件总大小超出限制，合计最多支持 ${maxCombinedMB}MB。`;
  }

  // File type errors
  if (msg.includes("file type") || msg.includes("accept")) {
    return "不支持该文件类型，请选择其他文件。";
  }

  return error.message || "文件上传失败，请稍后重试。";
}

export function SupportFormSection({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { organization, project } = useQueryProjectOrOrganization();

  // Tracks whether we've already warned about a short message
  const [warnedShortOnce, setWarnedShortOnce] = useState(false);

  // Local file state from Dropzone
  const [files, setFiles] = useState<File[] | undefined>(undefined);
  const totalUploadBytes = useMemo(
    () => (files ?? []).reduce((sum, f) => sum + f.size, 0),
    [files],
  );

  // Local submit guard to avoid flicker across multiple mutations
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);

  const form = useForm<SupportFormInput>({
    resolver: zodResolver(SupportFormSchema),
    defaultValues: {
      messageType: "Question" as MessageType,
      severity: "Question or feature request",
      topic: "",
      message: "",
      integrationType: "",
    },
    mode: "onSubmit",
  });

  const selectedTopic = form.watch("topic");
  const isProductFeatureTopic = TopicGroups["Product Features"].includes(
    selectedTopic as any,
  );

  const createSupportThread = api.plainRouter.createSupportThread.useMutation({
    onSuccess: () => {
      form.reset({
        messageType: "Question",
        severity: "Question or feature request",
        topic: "",
        message: "",
      });
      setWarnedShortOnce(false);
      setFiles(undefined);
      onSuccess();
    },
    onSettled: () => setIsSubmittingLocal(false),
  });

  const prepareUploads = api.plainRouter.prepareAttachmentUploads.useMutation({
    onError: (error) => {
      setIsSubmittingLocal(false);
      showErrorToast(
        "附件上传准备失败",
        error.message || "准备附件上传时失败，请稍后重试。",
        "ERROR",
      );
    },
  });

  async function uploadToPlainS3(
    uploadFormUrl: string,
    uploadFormData: { key: string; value: string }[],
    file: File,
  ) {
    const form = new FormData();
    uploadFormData.forEach(({ key, value }) => form.append(key, value));
    form.append("file", file, file.name);
    const res = await fetch(uploadFormUrl, { method: "POST", body: form });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Attachment upload failed (${res.status} ${res.statusText}) ${text}`,
      );
    }
  }

  const onSubmit = async (values: SupportFormInput) => {
    const parsed: SupportFormValues = SupportFormSchema.parse(values);
    const msgLen = (parsed.message ?? "").trim().length;

    if (msgLen < 50 && !warnedShortOnce) {
      setWarnedShortOnce(true);
      return;
    }

    try {
      setIsSubmittingLocal(true);

      // Validate files using centralized validation function
      const validation = validateFiles(files);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // 1) Request presigned S3 upload forms
      const uploadPlans =
        files && files.length
          ? await prepareUploads.mutateAsync({
              files: files.map((f) => ({
                fileName: f.name,
                fileSizeBytes: f.size,
              })),
            })
          : {
              uploads: [] as any[],
              customerId: undefined as string | undefined,
            };

      // 2) Upload blobs
      if (files && files.length) {
        await Promise.all(
          files.map(async (file, idx) => {
            const plan = uploadPlans.uploads[idx];
            if (!plan) throw new Error("Missing upload plan for a file.");
            await uploadToPlainS3(
              plan.uploadFormUrl,
              plan.uploadFormData,
              file,
            );
          }),
        );
      }

      // 3) Create thread with attachmentIds
      const attachmentIds =
        uploadPlans.uploads?.map((u: any) => u.attachmentId) ?? [];

      await createSupportThread.mutateAsync({
        messageType: parsed.messageType,
        severity: parsed.severity,
        topic: parsed.topic as any,
        integrationType: parsed.integrationType,
        message: parsed.message,
        url: window.location.href,
        organizationId: organization?.id,
        projectId: project?.id,
        browserMetadata: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          viewport: { w: window.innerWidth, h: window.innerHeight },
        },
        attachmentIds,
      });
    } catch (err: any) {
      console.error(err);
      setIsSubmittingLocal(false);
      form.setError("message", {
        type: "manual",
        message: err?.message ?? "提交支持请求失败。",
      });
    }
  };

  const messageIsShortAfterWarning =
    warnedShortOnce && (form.getValues("message") ?? "").trim().length < 50;

  // --- Compact attachment row helpers
  const totalMB = (totalUploadBytes / (1024 * 1024)).toFixed(2);
  const hasFiles = (files?.length ?? 0) > 0;

  return (
    <div className="mt-1 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-base font-semibold">
        联系支持工程师
      </div>
      <p className="text-muted-foreground text-sm">
        提供越清晰的细节，支持团队就越能更快给出准确回复。
      </p>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4"
        >
          {/* Message Type */}
          <FormField
            control={form.control}
            name="messageType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>消息类型</FormLabel>
                <FormControl>
                  <RadioGroup
                    className="grid grid-cols-3 gap-2"
                    value={field.value ?? "Question"}
                    onValueChange={field.onChange}
                  >
                    {MESSAGE_TYPES.map((v) => (
                      <Button
                        key={v}
                        variant={
                          field.value === v ? "default" : "outline-solid"
                        }
                        className="flex w-full items-center gap-2 text-sm font-normal"
                        size="default"
                        onClick={() => field.onChange(v)}
                      >
                        <span className="truncate">{MessageTypeLabelMap[v]}</span>
                      </Button>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormDescription className="sr-only">
                  选择你的消息类型。
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Severity */}
          <FormField
            control={form.control}
            name="severity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>紧急程度</FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="请选择紧急程度" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITIES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SeverityLabelMap[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Topic */}
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel>主题</FormLabel>
                <FormControl>
                  <Select
                    value={(field.value as string | undefined) ?? undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择主题" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <div className="text-muted-foreground mb-2 text-xs font-medium">
                          {TopicGroupLabelMap["Product Features"]}
                        </div>
                        {TopicGroups["Product Features"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {TopicLabelMap[t]}
                          </SelectItem>
                        ))}
                      </div>
                      <div className="border-t p-2">
                        <div className="text-muted-foreground mb-2 text-xs font-medium">
                          {TopicGroupLabelMap.Operations}
                        </div>
                        {TopicGroups.Operations.map((t) => (
                          <SelectItem key={t} value={t}>
                            {TopicLabelMap[t]}
                          </SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Integration Type */}
          {isProductFeatureTopic && (
            <FormField
              control={form.control}
              name="integrationType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>集成类型（可选）</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="请选择集成类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {INTEGRATION_TYPES.map((it) => (
                          <SelectItem key={it} value={it}>
                            {IntegrationTypeLabelMap[it]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {/* Message */}
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>问题描述</FormLabel>
                <div className="text-muted-foreground text-xs">
                  我们会通过你的账号邮箱联系你，通常会在一个工作日内回复。
                </div>
                <FormControl>
                  <div className="relative w-full">
                    <Textarea
                      {...field}
                      rows={8}
                      placeholder={
                        isProductFeatureTopic
                          ? "请尽量完整地说明你想完成什么，以及希望我们提供哪些帮助。\n\n如果问题涉及某条 trace、prompt、score 等具体对象，请一并附上链接。"
                          : "请尽量完整地说明你想完成什么，以及希望我们提供哪些帮助。"
                      }
                    />
                  </div>
                </FormControl>

                {messageIsShortAfterWarning && (
                  <p
                    className="mt-2 text-sm text-red-500"
                    role="status"
                    aria-live="polite"
                  >
                    当前描述偏短，补充更多上下文有助于我们更快、更准确地回复。
                    你可以直接提交，也可以继续完善内容。
                  </p>
                )}

                <FormMessage />

                <Dropzone
                  className="mt-1 border-none p-0 text-left"
                  maxFiles={FILE_UPLOAD_CONSTRAINTS.maxFiles}
                  maxSize={FILE_UPLOAD_CONSTRAINTS.maxFileSizeBytes}
                  onDrop={(accepted) => setFiles(accepted)}
                  onError={(error) => {
                    const userMessage = formatFileError(error);
                    showErrorToast("文件上传错误", userMessage, "WARNING");
                  }}
                  src={files}
                >
                  {/* Small, single-line trigger */}
                  <DropzoneEmptyState>
                    <div className="flex w-full cursor-pointer items-center justify-start gap-2 p-2 text-xs">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate">
                        {hasFiles
                          ? `${files!.length} 个文件 • ${totalMB} MB`
                          : "添加附件"}
                      </span>
                    </div>
                  </DropzoneEmptyState>
                  {/* Keep content area minimal; we still allow preview slot if needed */}
                  <DropzoneContent>
                    <div className="flex w-full cursor-pointer items-center justify-start gap-2 p-2 text-xs">
                      <Paperclip className="h-4 w-4" />
                      <span className="truncate">添加附件</span>
                    </div>
                  </DropzoneContent>
                </Dropzone>

                {files && files.length > 0 && (
                  <div className="p-0 text-left text-sm font-medium">
                    <div className="text-muted-foreground mb-2 text-xs font-medium">
                      已添加附件
                    </div>
                    {files?.map((file) => (
                      <div
                        key={file.name}
                        className="flex flex-row items-center justify-start gap-2 text-xs"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          onClick={() =>
                            setFiles(files.filter((f) => f.name !== file.name))
                          }
                          className="p-0"
                        >
                          <span className="sr-only">移除文件</span>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        {file.name}
                      </div>
                    ))}
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Actions */}
          <div className="flex flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setWarnedShortOnce(false);
                setFiles(undefined);
                onCancel();
              }}
              className="w-full"
            >
              取消
            </Button>

            <Button
              type="submit"
              disabled={isSubmittingLocal}
              className="w-full"
            >
              {isSubmittingLocal ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中…
                </span>
              ) : messageIsShortAfterWarning ? (
                "仍然提交"
              ) : (
                "提交"
              )}
            </Button>
          </div>

          {isSubmittingLocal && (
            <div className="text-muted-foreground text-xs">
              提交请求可能需要几秒钟，请稍候。
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
