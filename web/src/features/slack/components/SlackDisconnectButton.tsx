import React, { useState } from "react";
import { Unlink, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { api } from "@/src/utils/api";

/**
 * Props for the SlackDisconnectButton component
 */
interface SlackDisconnectButtonProps {
  /** Project ID for the Slack integration */
  projectId: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button variant */
  variant?:
    | "default"
    | "outline-solid"
    | "secondary"
    | "destructive"
    | "ghost"
    | "link";
  /** Button size */
  size?: "default" | "sm" | "lg" | "icon";
  /** Custom button text */
  buttonText?: string;
  /** Callback when disconnection is successful */
  onSuccess?: () => void;
  /** Callback when disconnection fails */
  onError?: (error: Error) => void;
  /** Whether to show confirmation dialog */
  showConfirmation?: boolean;
  /** Whether to show the button text */
  showText?: boolean;
}

/**
 * A button component that handles disconnecting the Slack integration.
 *
 * This component handles:
 * - Showing a confirmation dialog before disconnecting
 * - Calling the disconnect API endpoint
 * - Providing loading states during the disconnection process
 * - Displaying appropriate success/error messages
 * - Calling success/error callbacks
 *
 * The component includes safety measures to prevent accidental disconnection:
 * - Confirmation dialog with clear warning about consequences
 * - Information about what happens when disconnecting
 * - Option to cancel the operation
 *
 * @param projectId - The project ID for the Slack integration
 * @param disabled - Whether the button should be disabled
 * @param variant - Button variant (default: "destructive")
 * @param size - Button size (default: "sm")
 * @param buttonText - Custom button text (default: "Disconnect")
 * @param onSuccess - Callback when disconnection is successful
 * @param onError - Callback when disconnection fails
 * @param showConfirmation - Whether to show confirmation dialog (default: true)
 * @param showText - Whether to show the button text (default: true)
 */
export const SlackDisconnectButton: React.FC<SlackDisconnectButtonProps> = ({
  projectId,
  disabled = false,
  variant = "destructive",
  size = "sm",
  buttonText = "断开连接",
  onSuccess,
  onError,
  showConfirmation = true,
  showText = true,
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Disconnect mutation
  const disconnectMutation = api.slack.disconnect.useMutation({
    onSuccess: () => {
      setIsDisconnecting(false);
      setIsDialogOpen(false);

      showSuccessToast({
        title: "Slack 已断开",
        description: "已成功断开当前 Slack 工作区。",
      });

      onSuccess?.();
    },
    onError: (error: any) => {
      setIsDisconnecting(false);

      const errorMessage = error.message || "断开 Slack 连接失败";

      showErrorToast("断开连接失败", errorMessage);

      onError?.(new Error(errorMessage));
    },
  });

  // Handle disconnect action
  const handleDisconnect = async () => {
    if (isDisconnecting) return;

    setIsDisconnecting(true);

    try {
      await disconnectMutation.mutateAsync({ projectId });
    } catch (error) {
      // Error handling is done in the mutation callbacks
      console.error("Disconnect error:", error);
    }
  };

  // Handle button click
  const handleClick = () => {
    if (showConfirmation) {
      setIsDialogOpen(true);
    } else {
      handleDisconnect();
    }
  };

  const buttonContent = (
    <>
      {isDisconnecting ? (
        <Loader2
          className={
            showText ? "mr-2 h-4 w-4 animate-spin" : "h-4 w-4 animate-spin"
          }
        />
      ) : (
        <Unlink className={showText ? "mr-2 h-4 w-4" : "h-4 w-4"} />
      )}
      {showText && (isDisconnecting ? "断开中..." : buttonText)}
    </>
  );

  if (showConfirmation) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            disabled={disabled || isDisconnecting}
          >
            {buttonContent}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              断开 Slack 集成
            </DialogTitle>
            <DialogDescription className="space-y-2">
              <p>
                确定要将当前项目与 Slack 工作区断开连接吗？
              </p>
              <div className="bg-muted space-y-2 rounded-md p-3">
                <p className="text-sm font-medium">断开后将会：</p>
                <ul className="ml-4 space-y-1 text-sm">
                  <li>• 从 Slack 工作区移除机器人</li>
                  <li>• 禁用现有的 Slack 自动化</li>
                  <li>• 停止后续所有 Slack 通知</li>
                  <li>• 删除已保存的工作区凭据</li>
                </ul>
              </div>
              <p className="text-muted-foreground text-sm">
                你之后仍可重新连接，但需要重新配置自动化规则。
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isDisconnecting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  断开中...
                </>
              ) : (
                <>
                  <Unlink className="mr-2 h-4 w-4" />
                  断开连接
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={disabled || isDisconnecting}
    >
      {buttonContent}
    </Button>
  );
};
