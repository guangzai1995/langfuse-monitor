import { useMemo } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Github,
  Bug,
  Lightbulb,
  Sparkles,
  LibraryBig,
  LifeBuoy,
  Radio,
  Calendar,
} from "lucide-react";
//eslint-disable-next-line no-restricted-imports
import { SiDiscord } from "react-icons/si";
import { RainbowButton } from "@/src/components/magicui/rainbow-button";
import { Separator } from "@/src/components/ui/separator";
import { usePlan } from "@/src/features/entitlements/hooks";
import { isCloudPlan } from "@langfuse/shared";
import { useUiCustomization } from "@/src/ee/features/ui-customization/useUiCustomization";
import { useLangfuseCloudRegion } from "@/src/features/organizations/hooks";
import { usePostHogClientCapture } from "@/src/features/posthog-analytics/usePostHogClientCapture";

type SupportType = "in-app-support" | "custom" | "community";

export function IntroSection({
  onStartForm,
}: {
  onStartForm: () => void;
  displayDensity?: "default" | "compact";
}) {
  const uiCustomization = useUiCustomization();
  const { isLangfuseCloud } = useLangfuseCloudRegion();
  const capture = usePostHogClientCapture();

  // Note: We previously added an entitlement for in-app support, but removed it for now.
  //       The issue was that on global routes e.g., https://langfuse.com/setup, the entitlement
  //       hook would not have access to an org or project an therefore no plan, always returning
  //       false if asked. However on these pages, the in-app-chat should be available.
  //       Therefore we now check for whether wer are in a cloud deployment instead.
  // const hasInAppSupportEntitlement = useHasEntitlement("in-app-support");
  const hasInAppSupportEntitlement = !!isLangfuseCloud;
  const plan = usePlan();

  const supportType: SupportType = useMemo(() => {
    if (uiCustomization?.supportHref) {
      return "custom";
    }
    if (hasInAppSupportEntitlement) {
      return "in-app-support";
    }
    return "community";
  }, [hasInAppSupportEntitlement, uiCustomization]);

  const showStatusPageLink = useMemo(() => {
    return isCloudPlan(plan);
  }, [plan]);

  return (
    <div className="mt-1 flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="h-4 w-4" /> 问问 AI
        </div>
        <p className="text-muted-foreground mt-1 text-sm">
          立即获取有帮助的答案。我们的 AI 熟悉文档、示例和最佳实践，能帮你
          更快找到方向。
        </p>

        <RainbowButton asChild>
          <a
            href="https://langfuse.com/docs/ask-ai"
            target="_blank"
            rel="noopener"
          >
            与 AI 对话
          </a>
        </RainbowButton>
      </div>

      <Separator />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-base font-semibold">
          <LibraryBig className="h-4 w-4" /> 文档
        </div>
        <p className="text-muted-foreground text-sm">
          深入查看指南、核心概念和 API 参考，通过清晰的步骤与示例快速推进。
        </p>

        <Button asChild variant="outline">
          <a
            href={
              uiCustomization?.documentationHref ?? "https://langfuse.com/docs"
            }
            target="_blank"
            rel="noopener"
          >
            查看文档
          </a>
        </Button>
      </div>

      <Separator />

      {supportType === "custom" && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="h-4 w-4" /> 支持
            </div>
            <p className="text-muted-foreground text-sm">
              如果 AI 和文档还没帮你解决问题，可以直接联系支持团队。
            </p>
            <Button variant="outline" asChild>
              <a
                href={uiCustomization?.supportHref}
                target="_blank"
                rel="noopener"
              >
                打开支持入口
              </a>
            </Button>
            {uiCustomization?.feedbackHref && (
              <Button variant="outline" asChild>
                <a
                  href={uiCustomization?.feedbackHref}
                  target="_blank"
                  rel="noopener"
                >
                  提交反馈
                </a>
              </Button>
            )}
            {!uiCustomization?.supportHref && (
              <>
                <Button variant="outline" asChild>
                  <a
                    href="https://langfuse.com/ideas"
                    target="_blank"
                    rel="noopener"
                  >
                    功能建议
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a
                    href="https://langfuse.com/issues"
                    target="_blank"
                    rel="noopener"
                  >
                    报告问题
                  </a>
                </Button>
              </>
            )}
          </div>

          <Separator />
        </>
      )}

      {supportType === "in-app-support" && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="h-4 w-4" /> 联系支持工程师
            </div>
            <p className="text-muted-foreground text-sm">
              如果 AI 和文档仍未解决问题，我们的支持工程师会协助你继续排查。
            </p>
            <Button variant="outline" onClick={onStartForm}>
              联系支持工程师
            </Button>
          </div>

          <Separator />
        </>
      )}

      {supportType === "community" && (
        <>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-base font-semibold">
              <LifeBuoy className="h-4 w-4" /> 社区支持
            </div>
            <p className="text-muted-foreground text-sm">
              如果 AI 和文档仍未解决问题，可以到社区寻求帮助并分享反馈。
            </p>
            <Button variant="outline" asChild>
              <a
                href="https://langfuse.com/gh-support"
                target="_blank"
                rel="noopener"
              >
                <Github className="mr-2 h-4 w-4" /> 获取帮助 ↗
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://langfuse.com/ideas"
                target="_blank"
                rel="noopener"
              >
                <Lightbulb className="mr-2 h-4 w-4" /> 功能建议 ↗
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a
                href="https://langfuse.com/issues"
                target="_blank"
                rel="noopener"
              >
                <Bug className="mr-2 h-4 w-4" /> 报告问题 ↗
              </a>
            </Button>
          </div>

          <Separator />
        </>
      )}

      {supportType !== "custom" && (
        <div>
          <div className="flex items-center gap-2 text-base font-semibold">
            <Github className="h-4 w-4" /> 社区与资源
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            加入讨论，与 Langfuse 社区保持连接。
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <Button asChild variant="ghost" className="justify-start px-1.5">
              <a
                href="https://langfuse.com/gh-support"
                target="_blank"
                rel="noopener"
              >
                <Github className="mr-2 h-4 w-4" /> GitHub ↗
              </a>
            </Button>
            <Button asChild variant="ghost" className="justify-start px-1.5">
              <a
                href="https://langfuse.com/discord"
                target="_blank"
                rel="noopener"
                className="flex items-center"
              >
                <SiDiscord className="mr-2 h-4 w-4" /> Discord ↗
              </a>
            </Button>
            <Button asChild variant="ghost" className="justify-start px-1.5">
              <a
                href="https://lu.ma/langfuse"
                target="_blank"
                rel="noopener"
                className="flex items-center"
                onClick={() => capture("support_chat:community_hours_click")}
              >
                <Calendar className="mr-2 h-4 w-4" /> 社区答疑时间 ↗
              </a>
            </Button>

            {showStatusPageLink && (
              <Button asChild variant="ghost" className="justify-start px-1.5">
                <a
                  href="https://status.langfuse.com"
                  target="_blank"
                  rel="noopener"
                  className="flex items-center"
                >
                  <Radio className="mr-2 h-4 w-4" /> 服务状态页 ↗
                </a>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
