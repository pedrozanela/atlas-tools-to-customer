/**
 * ACL stubs for apps/waf.
 *
 * The original forge module used a `forge_resource_acl` table that doesn't
 * exist in the WAF schema. For now, ACL helpers return owner-only semantics
 * (no team sharing). Implement a real WafResourceAcl Prisma model when WAF
 * needs sharing.
 */

export type ResourceType =
  | "run"
  | "scan"
  | "genie_space"
  | "metadata_genie_space"
  | "demo_session"
  | "comment_job"
  | "strategy_document"
  | "connection"
  | "document"
  | "bv_portfolio"
  | "benchmark_run"
  | "health_score"
  | "metric_view_proposal"
  | "fabric_scan"
  | "fabric_migration"
  | "waf_assessment";

export const RESOURCE_TYPES: readonly ResourceType[] = [
  "run",
  "scan",
  "genie_space",
  "metadata_genie_space",
  "demo_session",
  "comment_job",
  "strategy_document",
  "connection",
  "document",
  "bv_portfolio",
  "benchmark_run",
  "health_score",
  "metric_view_proposal",
  "fabric_scan",
  "fabric_migration",
  "waf_assessment",
] as const;

export type AclPermission = "view" | "edit";

export interface AclEntry {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  viewerEmail: string;
  permission: AclPermission;
  grantedBy: string;
  createdAt: Date;
}

function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function listAccessibleIds(
  _userEmail: string,
  _resourceType: ResourceType,
): Promise<string[]> {
  return [];
}

export function makeAccessibleIdsCache(): {
  get: (email: string, type: ResourceType) => Promise<string[]>;
} {
  return {
    async get() {
      return [];
    },
  };
}

export async function canRead(args: {
  userEmail: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerEmail: string | null | undefined;
}): Promise<AclPermission | "owner" | null> {
  if (args.ownerEmail && normaliseEmail(args.ownerEmail) === normaliseEmail(args.userEmail)) {
    return "owner";
  }
  return null;
}

export async function canEdit(args: {
  userEmail: string;
  resourceType: ResourceType;
  resourceId: string;
  ownerEmail: string | null | undefined;
}): Promise<boolean> {
  return (await canRead(args)) === "owner";
}

export async function listAclForResource(
  _resourceType: ResourceType,
  _resourceId: string,
): Promise<AclEntry[]> {
  return [];
}

export async function share(_args: {
  resourceType: ResourceType;
  resourceId: string;
  viewerEmail: string;
  permission: AclPermission;
  grantedBy: string;
}): Promise<AclEntry> {
  throw new Error("ACL sharing not implemented in apps/waf yet");
}

export async function unshare(_args: {
  resourceType: ResourceType;
  resourceId: string;
  viewerEmail: string;
}): Promise<number> {
  return 0;
}

export async function clearAclForResource(
  _resourceType: ResourceType,
  _resourceId: string,
): Promise<number> {
  return 0;
}

export async function eraseAclForUser(_userEmail: string): Promise<number> {
  return 0;
}
