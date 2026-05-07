import { Button } from "@/src/components/ui/button";
import { Switch } from "@/src/components/ui/switch";
import { api } from "@/src/utils/api";
import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import Header from "@/src/components/layouts/header";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";
import { useHasOrganizationAccess } from "@/src/features/rbac/utils/checkOrganizationAccess";
import {
  useLangfuseCloudRegion,
  useQueryOrganization,
} from "@/src/features/organizations/hooks";
import { Card } from "@/src/components/ui/card";
import { LockIcon, ExternalLink } from "lucide-react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod/v4";

const aiFeaturesSchema = z.object({
  aiFeaturesEnabled: z.boolean(),
});

export default function AIFeatureSwitch() {
  const { update: updateSession } = useSession();
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const capture = usePostHogClientCapture();
  const organization = useQueryOrganization();
  const [isAIFeatureSwitchEnabled, setIsAIFeatureSwitchEnabled] = useState(
    organization?.aiFeaturesEnabled ?? false,
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasAccess = useHasOrganizationAccess({
    organizationId: organization?.id,
    scope: "organization:update",
  });

  const confirmForm = useForm<z.infer<typeof aiFeaturesSchema>>({
    resolver: zodResolver(aiFeaturesSchema),
    defaultValues: {
      aiFeaturesEnabled: isAIFeatureSwitchEnabled,
    },
  });

  const updateAIFeatures = api.organizations.update.useMutation({
    onSuccess: () => {
      void updateSession();
      setConfirmOpen(false);
    },
    onError: () => {
      setConfirmOpen(false);
    },
  });

  function handleSwitchChange(newValue: boolean) {
    if (!hasAccess) return;
    setIsAIFeatureSwitchEnabled(newValue);
    confirmForm.setValue("aiFeaturesEnabled", newValue);
    setConfirmOpen(true);
  }

  function handleCancel() {
    setIsAIFeatureSwitchEnabled(organization?.aiFeaturesEnabled ?? false);
    setConfirmOpen(false);
  }

  function handleConfirm() {
    if (!organization || !hasAccess) return;
    capture("organization_settings:ai_features_toggle");
    updateAIFeatures.mutate({
      orgId: organization.id,
      aiFeaturesEnabled: isAIFeatureSwitchEnabled,
    });
  }

  if (!isLangfuseCloud) return null;

  return (
    <div>
      <Header title="AI 功能" />
      <Card className="mb-4 p-3">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold">为组织启用 AI 功能</h4>
            <p className="text-sm">
              此设置会应用到组织下所有用户与项目。启用后，部分数据可能会在
              Langfuse 数据区域内发送到 AWS Bedrock 进行处理。Trace 数据会
              发送到你所在数据区域的 Langfuse Cloud。你的数据不会被用于训练
              模型，HIPAA、SOC2、GDPR 和 ISO 27001 等合规保障仍然有效。{" "}
              <a
                href="https://langfuse.com/security/ai-features"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                查看文档详情。
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
          <div className="relative">
            <Switch
              checked={isAIFeatureSwitchEnabled}
              onCheckedChange={handleSwitchChange}
              disabled={!hasAccess}
            />
            {!hasAccess && (
              <span title="无权限">
                <LockIcon className="text-muted absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 transform" />
              </span>
            )}
          </div>
        </div>
      </Card>

      <Dialog
        open={confirmOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen && !updateAIFeatures.isPending) {
            handleCancel();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认 AI 功能变更</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <span className="text-sm">
              你即将{" "}
              <strong>
                {isAIFeatureSwitchEnabled ? "启用" : "停用"}
              </strong>{" "}
              当前组织的 AI 功能。启用后，部分数据可能会发送到你所在数据区域
              的 AWS Bedrock 进行处理。
              <br />
              <br />{" "}
              <a
                href="https://langfuse.com/security/ai-features"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary inline-flex items-center gap-1 hover:underline"
              >
                查看文档了解更多。
                <ExternalLink className="h-3 w-3" />
              </a>
            </span>
            <p className="text-muted-foreground mt-3 text-sm">
              确定要继续吗？
            </p>
          </DialogBody>
          <DialogFooter>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                disabled={updateAIFeatures.isPending}
                onClick={handleCancel}
              >
                取消
              </Button>
              <Button
                type="submit"
                onClick={handleConfirm}
                loading={updateAIFeatures.isPending}
              >
                确认
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
