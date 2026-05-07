import { TRPCClientError } from "@trpc/client";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";

// Catch network level errors, e.g. by proxy rate-limiting

const httpStatusOverride: Record<number, keyof typeof errorTitleMap> = {
  429: "TOO_MANY_REQUESTS",
  524: "TIMEOUT",
};

const errorTitleMap = {
  BAD_REQUEST: "请求无效",
  UNAUTHORIZED: "未授权",
  FORBIDDEN: "禁止访问",
  NOT_FOUND: "未找到资源",
  TIMEOUT: "请求超时",
  CONFLICT: "冲突",
  PRECONDITION_FAILED: "前置条件不满足",
  PAYLOAD_TOO_LARGE: "请求内容过大",
  METHOD_NOT_SUPPORTED: "不支持该请求方法",
  UNPROCESSABLE_CONTENT: "请求内容无法处理",
  TOO_MANY_REQUESTS: "请求过于频繁",
  CLIENT_CLOSED_REQUEST: "客户端已关闭请求",
  INTERNAL_SERVER_ERROR: "服务器内部错误",
  SERVICE_UNAVAILABLE: "服务器内部错误",
} as const;

const getErrorTitleAndHttpCode = (error: TRPCClientError<any>) => {
  const httpStatus: number =
    typeof error.data?.httpStatus === "number" ? error.data.httpStatus : 500;

  if (httpStatus in httpStatusOverride) {
    return {
      errorTitle: errorTitleMap[httpStatusOverride[httpStatus]],
      httpStatus,
    };
  }

  const errorTitle =
    error.data?.code in errorTitleMap
      ? errorTitleMap[error.data?.code as keyof typeof errorTitleMap]
      : "未预期错误";

  return { errorTitle, httpStatus };
};

const getErrorDescription = (httpStatus: number) => {
  switch (httpStatus) {
    case 429:
      return "请求过于频繁，请稍后再试。";
    case 524:
      return "请求处理时间过长，请稍后再试。";
    default:
      // Check if it's a 5xx server error
      if (httpStatus >= 500 && httpStatus < 600) {
        return "服务器内部错误。我们已收到告警并正在处理；如果该问题持续出现，请联系支持团队。";
      }
      return "内部错误";
  }
};

export const trpcErrorToast = (error: unknown) => {
  if (error instanceof TRPCClientError) {
    const { errorTitle, httpStatus } = getErrorTitleAndHttpCode(error);

    const path = error.data?.path;
    const description = getErrorDescription(httpStatus);
    const message =
      httpStatus >= 500 && httpStatus < 600
        ? description
        : error.message ?? description;

    showErrorToast(
      errorTitle,
      message,
      httpStatus >= 500 && httpStatus < 600 ? "ERROR" : "WARNING",
      path,
    );
  } else {
    showErrorToast(
      "未预期错误",
      "发生了未预期的错误。",
      "ERROR",
    );
  }
};
