import { StringParam, useQueryParam, withDefault } from "use-query-params";
import { PublishTraceSwitch } from "@/src/components/publish-object-switch";
import { DetailPageNav } from "@/src/features/navigate-detail-pages/DetailPageNav";
import { useRouter } from "next/router";
import { api } from "@/src/utils/api";
import { StarTraceDetailsToggle } from "@/src/components/star-toggle";
import { ErrorPage } from "@/src/components/error-page";
import { DeleteTraceButton } from "@/src/components/deleteButton";
import Page from "@/src/components/layouts/page";
import { Trace } from "@/src/components/trace2/Trace";
import { useSession } from "next-auth/react";
import { useIsAuthenticatedAndProjectMember } from "@/src/features/auth/hooks";
import { Button } from "@/src/components/ui/button";
import Link from "next/link";
import { stripBasePath } from "@/src/utils/redirect";
import { Badge } from "@/src/components/ui/badge";
import { useV4Beta } from "@/src/features/events/hooks/useV4Beta";
import { useEventsTraceData } from "@/src/features/events/hooks/useEventsTraceData";
import { showErrorToast } from "@/src/features/notifications/showErrorToast";
import { useEffect } from "react";

export function TracePage({
  traceId,
  timestamp,
}: {
  traceId: string;
  timestamp?: Date;
}) {
  const router = useRouter();
  const session = useSession();
  const routeProjectId = (router.query.projectId as string) ?? "";
  const { isBetaEnabled } = useV4Beta();

  // Old path: fetch from traces table (beta OFF)
  const tracesQuery = api.traces.byIdWithObservationsAndScores.useQuery(
    {
      traceId,
      timestamp,
      projectId: routeProjectId,
    },
    {
      enabled: !isBetaEnabled,
      retry(failureCount, error) {
        if (
          error.data?.code === "UNAUTHORIZED" ||
          error.data?.code === "NOT_FOUND"
        )
          return false;
        return failureCount < 3;
      },
    },
  );

  // New path: fetch from events table (beta ON)
  const eventsData = useEventsTraceData({
    projectId: routeProjectId,
    traceId,
    timestamp,
    enabled: isBetaEnabled,
  });

  // Use the appropriate data source based on beta toggle
  const trace = isBetaEnabled
    ? {
        data: eventsData.data,
        isLoading: eventsData.isLoading,
        error: eventsData.error as typeof tracesQuery.error,
      }
    : tracesQuery;

  const projectIdForAccessCheck = trace.data?.projectId ?? routeProjectId;
  const hasProjectAccess = useIsAuthenticatedAndProjectMember(
    projectIdForAccessCheck,
  );

  const [selectedTab, setSelectedTab] = useQueryParam(
    "display",
    withDefault(StringParam, "details"),
  );

  useEffect(() => {
    if (isBetaEnabled && eventsData.cutoffObservationsAfterMaxCount) {
      showErrorToast(
        "Trace 已截断",
        "当前 Trace 的观测节点过多，详情页仅展示其中一部分内容。",
        "WARNING",
      );
    }
  }, [isBetaEnabled, eventsData.cutoffObservationsAfterMaxCount]);

  // Handle errors - for events path, we check if there's no data after loading
  if (!isBetaEnabled && tracesQuery.error?.data?.code === "UNAUTHORIZED")
    return <ErrorPage message="你无权访问此 Trace。" />;

  if (!isBetaEnabled && tracesQuery.error?.data?.code === "NOT_FOUND")
    return (
      <ErrorPage
        title="未找到 Trace"
        message="该 Trace 可能仍在处理中，或已被删除。"
        additionalButton={{
          label: "重试",
          onClick: () => void window.location.reload(),
        }}
      />
    );

  // For events path: show not found if no observations found after loading
  if (isBetaEnabled && !eventsData.isLoading && !eventsData.data)
    return (
      <ErrorPage
        title="未找到 Trace"
        message="未找到该 Trace 的观测节点，它可能仍在处理中，或已被删除。"
        additionalButton={{
          label: "重试",
          onClick: () => void window.location.reload(),
        }}
      />
    );

  if (!trace.data) return <div className="p-3">加载中...</div>;

  const isSharedTrace = trace.data.public;
  const showPublicIndicators = isSharedTrace && !hasProjectAccess;
  const encodedTargetPath = encodeURIComponent(
    stripBasePath(router.asPath || "/"),
  );
  const leadingControl = showPublicIndicators ? (
    session.status === "authenticated" ? (
      <Button
        asChild
        size="sm"
        variant="outline"
        title="返回 Langfuse"
        className="px-3"
      >
        <Link href="/">Langfuse</Link>
      </Button>
    ) : (
      <Button
        asChild
        size="sm"
        variant="default"
        title="登录 Langfuse"
        className="px-3"
      >
        <Link href={`/auth/sign-in?targetPath=${encodedTargetPath}`}>
          登录
        </Link>
      </Button>
    )
  ) : undefined;
  const sharedBadge = showPublicIndicators ? (
    <Badge variant="outline" className="text-xs font-medium">
      公开
    </Badge>
  ) : undefined;

  return (
    <Page
      headerProps={{
        title: trace.data.name
          ? `${trace.data.name}: ${trace.data.id}`
          : trace.data.id,
        itemType: "TRACE",
        breadcrumb: [
          {
            name: "链路追踪",
            href: `/project/${router.query.projectId as string}/traces`,
          },
        ],
        showSidebarTrigger: !showPublicIndicators,
        leadingControl,
        breadcrumbBadges: sharedBadge,
        actionButtonsLeft: (
          <div className="ml-1 flex items-center gap-1">
            <div className="flex items-center gap-0">
              <StarTraceDetailsToggle
                traceId={trace.data.id}
                projectId={trace.data.projectId}
                value={trace.data.bookmarked}
                size="icon-xs"
              />
              <PublishTraceSwitch
                traceId={trace.data.id}
                projectId={trace.data.projectId}
                timestamp={timestamp}
                isPublic={trace.data.public}
                size="icon-xs"
              />
            </div>
          </div>
        ),
        actionButtonsRight: (
          <>
            <DetailPageNav
              currentId={traceId}
              path={(entry) => {
                const { view, display, projectId } = router.query;
                const queryParams = new URLSearchParams({
                  ...(typeof view === "string" ? { view } : {}),
                  ...(typeof display === "string" ? { display } : {}),
                });
                const timestamp =
                  entry.params && entry.params.timestamp
                    ? encodeURIComponent(entry.params.timestamp)
                    : undefined;

                if (timestamp) {
                  queryParams.set("timestamp", timestamp);
                }

                const finalQueryString = queryParams.size
                  ? `?${queryParams.toString()}`
                  : "";

                return `/project/${projectId as string}/traces/${entry.id}${finalQueryString}`;
              }}
              listKey="traces"
            />
            <DeleteTraceButton
              itemId={traceId}
              projectId={trace.data.projectId}
              redirectUrl={`/project/${router.query.projectId as string}/traces`}
              deleteConfirmation={trace.data.name ?? ""}
              icon
            />
          </>
        ),
      }}
    >
      <div className="flex max-h-full min-h-0 flex-1 overflow-hidden">
        <Trace
          trace={trace.data}
          scores={trace.data.scores}
          corrections={trace.data.corrections}
          projectId={trace.data.projectId}
          observations={trace.data.observations}
          selectedTab={selectedTab}
          setSelectedTab={setSelectedTab}
          context={router.query.peek !== undefined ? "peek" : "fullscreen"}
        />
      </div>
    </Page>
  );
}
