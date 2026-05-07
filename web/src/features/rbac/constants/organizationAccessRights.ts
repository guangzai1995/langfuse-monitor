import { type Role } from "@langfuse/shared/src/db";

// Exported to silence @typescript-eslint/no-unused-vars v8 warning
// (used for type extraction via typeof, which is a legitimate pattern)
export const organizationScopes = [
  "projects:create",
  "projects:transfer_org",
  "organization:CRUD_apiKeys",
  "organization:update",
  "organization:delete",
  "organizationMembers:read",
  "organizationMembers:CUD",
  "langfuseCloudBilling:CRUD",
  "auditLogs:read",
] as const;

// type string of all Resource:Action, e.g. "organizationMembers:read"
export type OrganizationScope = (typeof organizationScopes)[number];

export const organizationRoleAccessRights: Record<Role, OrganizationScope[]> = {
  OWNER: [
    "projects:create",
    "projects:transfer_org",
    "organization:CRUD_apiKeys",
    "organization:update",
    "organization:delete",
    "organizationMembers:CUD",
    "organizationMembers:read",
    "langfuseCloudBilling:CRUD",
    "auditLogs:read",
  ],
  ADMIN: [
    "projects:create",
    "projects:transfer_org",
    "organization:CRUD_apiKeys",
    "organization:update",
    "organizationMembers:CUD",
    "organizationMembers:read",
    "auditLogs:read",
  ],
  MEMBER: ["organizationMembers:read"],
  VIEWER: [],
  NONE: [],
};

export const orgNoneRoleComment =
  "默认没有组织级资源访问权限，需要通过项目角色单独授予项目访问能力。";
