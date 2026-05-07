import React from "react";
import { SplashScreen } from "@/src/components/ui/splash-screen";
import { ActionButton } from "@/src/components/ActionButton";

export function UsersOnboarding() {
  return (
    <SplashScreen
      title="你还没有开始追踪用户"
      description="当你为链路补充用户 ID 后，就可以把成本、评测结果以及其他 LLM 应用指标关联到具体用户，更好地理解应用的实际使用情况。"
      videoSrc="https://static.langfuse.com/prod-assets/onboarding/users-overview-v1.mp4"
    >
      <div className="mt-8">
        <h3 className="mb-4 text-2xl font-semibold">开始追踪用户</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          要开始追踪用户，你需要在链路中附带 <code>userId</code>。
        </p>
        <ActionButton
          href="https://langfuse.com/docs/observability/features/users"
          variant="default"
        >
          阅读文档
        </ActionButton>
      </div>
    </SplashScreen>
  );
}
