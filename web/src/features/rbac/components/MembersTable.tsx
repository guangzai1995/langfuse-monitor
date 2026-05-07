import { DataTable } from "@/src/components/table/data-table";
import { DataTableToolbar } from "@/src/components/table/data-table-toolbar";
import { type LangfuseColumnDef } from "@/src/components/table/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import useColumnVisibility from "@/src/features/column-visibility/hooks/useColumnVisibility";
import { CreateProjectMemberButton } from "@/src/features/rbac/components/CreateProjectMemberButton";
import { useHasOrganizationAccess } from "@/src/features/rbac/utils/checkOrganizationAccess";
import { api } from "@/src/utils/api";
import { safeExtract } from "@/src/utils/map-utils";
import type { RouterOutput } from "@/src/utils/types";
import { Role } from "@langfuse/shared";
import { type Row } from "@tanstack/react-table";
import { Trash } from "lucide-react";
import { useSession } from "next-auth/react";
import { Alert, AlertDescription, AlertTitle } from "@/src/components/ui/alert";
import { useHasEntitlement } from "@/src/features/entitlements/hooks";
import { showSuccessToast } from "@/src/features/notifications/showSuccessToast";
import { useHasProjectAccess } from "@/src/features/rbac/utils/checkProjectAccess";
import { RoleSelectItem } from "@/src/features/rbac/components/RoleSelectItem";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/src/components/ui/hover-card";
import { HoverCardPortal } from "@radix-ui/react-hover-card";
import Link from "next/link";
import useColumnOrder from "@/src/features/column-visibility/hooks/useColumnOrder";
import { SettingsTableCard } from "@/src/components/layouts/settings-table-card";
import useSessionStorage from "@/src/components/useSessionStorage";
import { useQueryParam, withDefault, StringParam } from "use-query-params";
import { useEffect } from "react";

export type MembersTableRow = {
  user: {
    image: string | null;
    name: string | null;
  };
  email: string | null;
  providers: string[];
  createdAt: Date;
  orgRole: Role;
  projectRole?: Role;
  meta: {
    userId: string;
    orgMembershipId: string;
  };
};

export function MembersTable({
  orgId,
  project,
  showSettingsCard = false,
}: {
  orgId: string;
  project?: { id: string; name: string };
  showSettingsCard?: boolean;
}) {
  // Create a unique key for this table's pagination state
  const paginationKey = project
    ? `projectMembers_${project.id}_pagination`
    : `orgMembers_${orgId}_pagination`;

  const session = useSession();
  const hasOrgViewAccess = useHasOrganizationAccess({
    organizationId: orgId,
    scope: "organizationMembers:read",
  });
  const hasProjectViewAccess =
    useHasProjectAccess({
      projectId: project?.id,
      scope: "projectMembers:read",
    }) || hasOrgViewAccess;
  const [paginationState, setPaginationState] = useSessionStorage(
    paginationKey,
    {
      pageIndex: 0,
      pageSize: 10,
    },
  );

  const [searchQuery, setSearchQuery] = useQueryParam(
    "search",
    withDefault(StringParam, null),
  );

  useEffect(() => {
    setPaginationState((prev) => ({
      pageIndex: 0,
      pageSize: prev.pageSize,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const membersViaOrg = api.members.allFromOrg.useQuery(
    {
      orgId,
      searchQuery: searchQuery ?? undefined,
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
    },
    {
      enabled: !project && hasOrgViewAccess,
    },
  );
  const membersViaProject = api.members.allFromProject.useQuery(
    {
      projectId: project?.id ?? "NOT ENABLED",
      searchQuery: searchQuery ?? undefined,
      page: paginationState.pageIndex,
      limit: paginationState.pageSize,
    },
    {
      enabled: project !== undefined && hasProjectViewAccess,
    },
  );
  const members = project ? membersViaProject : membersViaOrg;

  const totalCount = members.data?.totalCount ?? null;

  const utils = api.useUtils();

  const mutDeleteMember = api.members.deleteMembership.useMutation({
    onSuccess: (data) => {
      if (data.userId === session.data?.user?.id) void session.update();
      utils.members.invalidate();
    },
  });

  const hasCudAccessOrgLevel = useHasOrganizationAccess({
    organizationId: orgId,
    scope: "organizationMembers:CUD",
  });
  const hasCudAccessProjectLevel = useHasProjectAccess({
    projectId: project?.id,
    scope: "projectMembers:CUD",
  });

  const projectRolesEntitlement = useHasEntitlement("rbac-project-roles");

  const columns: LangfuseColumnDef<MembersTableRow>[] = [
    {
      accessorKey: "user",
      id: "user",
      header: "姓名",
      cell: ({ row }) => {
        const { name, image } = row.getValue("user") as MembersTableRow["user"];
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={image ?? undefined}
                alt={name ?? "用户头像"}
              />
              <AvatarFallback>
                {name
                  ? name
                      .split(" ")
                      .map((word) => word[0])
                      .slice(0, 2)
                      .concat("")
                  : null}
              </AvatarFallback>
            </Avatar>
            <span>{name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      id: "email",
      header: "邮箱",
    },
    {
      accessorKey: "providers",
      id: "providers",
      header: "单点登录来源",
      enableHiding: true,
      cell: ({ row }) => {
        const providers = row.getValue("providers") as string[];
        if (providers.length === 0) return "-";

        return providers.join(", ");
      },
    },
    {
      accessorKey: "orgRole",
      id: "orgRole",
      header: "组织角色",
      headerTooltip: {
        description:
          "组织角色是该用户在当前组织中的默认角色，并默认作用于组织及其全部项目。",
        href: "https://langfuse.com/docs/administration/rbac",
      },
      cell: ({ row }) => {
        const orgRole = row.getValue("orgRole") as MembersTableRow["orgRole"];
        const { orgMembershipId } = row.getValue(
          "meta",
        ) as MembersTableRow["meta"];
        const { userId } = row.getValue("meta") as MembersTableRow["meta"];
        const disableInProjectSettings = Boolean(project?.id);

        const ConfiguredOrgRoleDropdown = () => (
          <OrgRoleDropdown
            orgMembershipId={orgMembershipId}
            currentRole={orgRole}
            userId={userId}
            orgId={orgId}
            hasCudAccess={hasCudAccessOrgLevel && !disableInProjectSettings}
          />
        );

        return (
          <div className="relative">
            {disableInProjectSettings && hasCudAccessOrgLevel ? (
              <HoverCard openDelay={0} closeDelay={0}>
                <HoverCardTrigger>
                  <ConfiguredOrgRoleDropdown />
                </HoverCardTrigger>
                <HoverCardPortal>
                  <HoverCardContent
                    hideWhenDetached={true}
                    align="center"
                    side="right"
                  >
                    <p className="text-xs">
                      组织级角色需要在{" "}
                      <Link
                        href={`/organization/${orgId}/settings/members`}
                        className="underline"
                      >
                        组织设置
                      </Link>
                      中修改。
                    </p>
                  </HoverCardContent>
                </HoverCardPortal>
              </HoverCard>
            ) : (
              <ConfiguredOrgRoleDropdown />
            )}
          </div>
        );
      },
    },
    ...(project
      ? [
          {
            accessorKey: "projectRole",
            id: "projectRole",
            header: "项目角色",
            headerTooltip: {
              description:
                "这是该用户在当前项目中的专属角色，会覆盖默认项目角色。",
              href: "https://langfuse.com/docs/administration/rbac",
            },
            cell: ({
              row,
            }: {
              row: Row<MembersTableRow>; // need to specify the type here due to conditional rendering
            }) => {
              const projectRole = row.getValue(
                "projectRole",
              ) as MembersTableRow["projectRole"];
              const { orgMembershipId, userId } = row.getValue(
                "meta",
              ) as MembersTableRow["meta"];

              if (!projectRolesEntitlement) return "当前套餐不支持";

              return (
                <ProjectRoleDropdown
                  orgMembershipId={orgMembershipId}
                  userId={userId}
                  currentProjectRole={projectRole ?? null}
                  orgId={orgId}
                  projectId={project.id}
                  hasCudAccess={
                    hasCudAccessOrgLevel || hasCudAccessProjectLevel
                  }
                />
              );
            },
          },
        ]
      : []),
    {
      accessorKey: "createdAt",
      id: "createdAt",
      header: "加入时间",
      enableHiding: true,
      defaultHidden: true,
      cell: ({ row }) => {
        const value = row.getValue("createdAt") as MembersTableRow["createdAt"];
        return value ? new Date(value).toLocaleString() : undefined;
      },
    },
    {
      accessorKey: "meta",
      id: "meta",
      header: "操作",
      enableHiding: false,
      cell: ({ row }) => {
        const { orgMembershipId, userId } = row.getValue(
          "meta",
        ) as MembersTableRow["meta"];
        return hasCudAccessOrgLevel ||
          (userId && userId === session.data?.user?.id) ? (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (
                  confirm(
                    userId === session.data?.user?.id
                      ? "确认要离开当前组织吗？"
                      : "确认要将该成员从组织中移除吗？",
                  )
                ) {
                  mutDeleteMember.mutate({ orgId, orgMembershipId });
                }
              }}
            >
              <Trash size={14} />
            </button>
          </div>
        ) : null;
      },
    },
  ];

  const [columnVisibility, setColumnVisibility] =
    useColumnVisibility<MembersTableRow>(
      project ? "membersColumnVisibilityProject" : "membersColumnVisibilityOrg",
      columns,
    );

  const [columnOrder, setColumnOrder] = useColumnOrder<MembersTableRow>(
    project ? "membersColumnOrderProject" : "membersColumnOrderOrg",
    columns,
  );

  const convertToTableRow = (
    orgMembership: RouterOutput["members"]["allFromOrg"]["memberships"][0], // type of both queries is the same
  ): MembersTableRow => {
    return {
      meta: {
        userId: orgMembership.userId,
        orgMembershipId: orgMembership.id,
      },
      email: orgMembership.user.email,
      user: {
        image: orgMembership.user.image,
        name: orgMembership.user.name,
      },
      providers: orgMembership.user.accounts?.map((a) => a.provider) ?? [],
      createdAt: orgMembership.createdAt,
      orgRole: orgMembership.role,
      projectRole: orgMembership.projectRole,
    };
  };

  if (project ? !hasProjectViewAccess : !hasOrgViewAccess) {
    return (
      <Alert>
        <AlertTitle>访问被拒绝</AlertTitle>
        <AlertDescription>
          你没有查看该组织成员的权限。
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <DataTableToolbar
        columns={columns}
        columnVisibility={columnVisibility}
        setColumnVisibility={setColumnVisibility}
        columnOrder={columnOrder}
        setColumnOrder={setColumnOrder}
        actionButtons={
          <CreateProjectMemberButton orgId={orgId} project={project} />
        }
        searchConfig={{
          metadataSearchFields: ["姓名", "邮箱"],
          updateQuery: setSearchQuery,
          currentQuery: searchQuery ?? undefined,
          tableAllowsFullTextSearch: false,
          setSearchType: undefined,
          searchType: undefined,
        }}
        className={showSettingsCard ? "px-0" : undefined}
      />
      {showSettingsCard ? (
        <SettingsTableCard>
          <DataTable
            tableName={project ? "projectMembers" : "orgMembers"}
            columns={columns}
            data={
              members.isPending
                ? { isLoading: true, isError: false }
                : members.isError
                  ? {
                      isLoading: false,
                      isError: true,
                      error: members.error.message,
                    }
                  : {
                      isLoading: false,
                      isError: false,
                      data: safeExtract(members.data, "memberships", []).map(
                        (t) => convertToTableRow(t),
                      ),
                    }
            }
            pagination={{
              totalCount,
              onChange: setPaginationState,
              state: paginationState,
            }}
            columnVisibility={columnVisibility}
            onColumnVisibilityChange={setColumnVisibility}
            columnOrder={columnOrder}
            onColumnOrderChange={setColumnOrder}
          />
        </SettingsTableCard>
      ) : (
        <DataTable
          tableName={project ? "projectMembers" : "orgMembers"}
          columns={columns}
          data={
            members.isPending
              ? { isLoading: true, isError: false }
              : members.isError
                ? {
                    isLoading: false,
                    isError: true,
                    error: members.error.message,
                  }
                : {
                    isLoading: false,
                    isError: false,
                    data: safeExtract(members.data, "memberships", []).map(
                      (t) => convertToTableRow(t),
                    ),
                  }
          }
          pagination={{
            totalCount,
            onChange: setPaginationState,
            state: paginationState,
          }}
          columnVisibility={columnVisibility}
          onColumnVisibilityChange={setColumnVisibility}
          columnOrder={columnOrder}
          onColumnOrderChange={setColumnOrder}
        />
      )}
    </>
  );
}

const OrgRoleDropdown = ({
  orgMembershipId,
  currentRole,
  orgId,
  userId,
  hasCudAccess,
}: {
  orgMembershipId: string;
  currentRole: Role;
  orgId: string;
  userId: string;
  hasCudAccess: boolean;
}) => {
  const utils = api.useUtils();
  const session = useSession();
  const mut = api.members.updateOrgMembership.useMutation({
    onSuccess: (data) => {
      utils.members.invalidate();
      if (data.userId === session.data?.user?.id) void session.update();
      showSuccessToast({
        title: "已保存",
        description: "组织角色已更新",
        duration: 2000,
      });
    },
  });

  return (
    <Select
      disabled={!hasCudAccess || mut.isPending}
      value={currentRole}
      onValueChange={(value) => {
        if (
          userId !== session.data?.user?.id ||
          confirm("确认要修改你自己的组织角色吗？")
        ) {
          mut.mutate({
            orgId,
            orgMembershipId,
            role: value as Role,
          });
        }
      }}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Role).map((role) => (
          <RoleSelectItem role={role} key={role} />
        ))}
      </SelectContent>
    </Select>
  );
};

const ProjectRoleDropdown = ({
  orgId,
  userId,
  orgMembershipId,
  projectId,
  currentProjectRole,
  hasCudAccess,
}: {
  orgMembershipId: string;
  userId: string;
  currentProjectRole: Role | null;
  orgId: string;
  projectId: string;
  hasCudAccess: boolean;
}) => {
  const utils = api.useUtils();
  const session = useSession();
  const mut = api.members.updateProjectRole.useMutation({
    onSuccess: (data) => {
      utils.members.invalidate();
      if (data.userId === session.data?.user?.id) void session.update();
      showSuccessToast({
        title: "已保存",
        description: "项目角色已更新",
        duration: 2000,
      });
    },
  });

  return (
    <Select
      disabled={!hasCudAccess || mut.isPending}
      value={currentProjectRole ?? Role.NONE}
      onValueChange={(value) => {
        if (
          userId !== session.data?.user?.id ||
          confirm("确认要修改你自己的项目角色吗？")
        ) {
          mut.mutate({
            orgId,
            orgMembershipId,
            projectId,
            userId,
            projectRole: value as Role,
          });
        }
      }}
    >
      <SelectTrigger className="w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.values(Role).map((role) => (
          <RoleSelectItem role={role} key={role} isProjectRole />
        ))}
      </SelectContent>
    </Select>
  );
};
