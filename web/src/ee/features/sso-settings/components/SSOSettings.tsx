import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import Header from "@/src/components/layouts/header";
import { Button } from "@/src/components/ui/button";
import { useSupportDrawer } from "@/src/features/support-chat/SupportDrawerProvider";

export const SSOSettings = () => {
  const hasEntitlement = useHasEntitlement("cloud-multi-tenant-sso");
  const { setOpen: setSupportDrawerOpen } = useSupportDrawer();

  const commonContent = (
    <>
      <Header title="单点登录配置" />
      <p className="text-muted-foreground mb-4 text-sm">
        为你的组织配置单点登录（SSO）。启用后，团队成员可以使用现有身份
        提供商完成认证，例如 Okta、AzureAD/EntraID。你也可以强制要求成员
        使用 Google、GitHub、Microsoft 等公共身份提供商登录。
      </p>
    </>
  );

  if (!hasEntitlement) {
    return (
      <div>
        {commonContent}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>当前不可用</AlertTitle>
          <AlertDescription>
            你当前的套餐不包含企业级 SSO 与 SSO 强制策略。升级后即可使用此
            功能。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      {commonContent}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>联系 Langfuse 支持团队</AlertTitle>
        <AlertDescription className="flex flex-col gap-3">
          <p>
            如需设置或调整 SSO 配置，请联系 Langfuse 支持工程师协助处理。
          </p>
          <Button
            onClick={() => setSupportDrawerOpen(true)}
            className="self-start"
          >
            联系支持
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};
