import { getConfig } from "@/lib/dbx/client";
import {
  createGenieSpace,
  getGenieSpace,
  listGenieSpaces,
  updateGenieSpace,
  DEFAULT_GENIE_PARENT_PATH,
} from "@/lib/dbx/genie";
import { logActivity } from "@/lib/lakebase/activity-log";
import { logger } from "@/lib/logger";
import {
  WAF_GENIE_TITLE,
  LEGACY_WAF_GENIE_DESCRIPTION,
  buildWafGenieSerializedSpace,
  getSpOwnedWafGenieDescription,
  getWafGenieDescription,
  mergeWafGenieSerializedSpace,
} from "./builder";

export interface WafGenieAsset {
  spaceId: string;
  spaceUrl: string;
}

export interface WafGenieProvisionResult extends WafGenieAsset {
  action: "created" | "updated";
}

let provisionPromise: Promise<WafGenieProvisionResult> | null = null;

async function findWafGenieSpaceId(oboToken: string): Promise<string | null> {
  const expectedDescription = getWafGenieDescription();
  const acceptedDescriptions = new Set([
    expectedDescription,
    getSpOwnedWafGenieDescription(),
    LEGACY_WAF_GENIE_DESCRIPTION,
  ]);
  const matches: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await listGenieSpaces(100, pageToken, oboToken);
    for (const candidate of page.spaces ?? []) {
      if (candidate.title !== WAF_GENIE_TITLE) continue;
      const live = await getGenieSpace(candidate.space_id, oboToken);
      const parentPath = live.parent_path?.replace(/\/?$/, "/");
      if (!acceptedDescriptions.has(live.description ?? "")) continue;
      if (parentPath !== DEFAULT_GENIE_PARENT_PATH && parentPath !== "/Shared/") {
        throw new Error(
          `Atlas-owned WAF Genie Agent is outside an allowed parent path: ${live.parent_path}`,
        );
      }
      matches.push(candidate.space_id);
    }
    pageToken = page.next_page_token;
  } while (pageToken);
  if (matches.length > 1) {
    throw new Error(
      `Found ${matches.length} Atlas-owned WAF Genie Agents; refusing an ambiguous update`,
    );
  }
  return matches[0] ?? null;
}

export async function getWafGenieAsset(oboToken: string): Promise<WafGenieAsset | null> {
  const spaceId = await findWafGenieSpaceId(oboToken);
  if (!spaceId) return null;

  const live = await getGenieSpace(spaceId, oboToken);
  if (!live.space_id) return null;
  return {
    spaceId: live.space_id,
    spaceUrl: `${getConfig().host}/genie/rooms/${live.space_id}`,
  };
}

/**
 * Create or reconcile the single shared WAF Genie Agent.
 *
 * This is intentionally called from the assessment Run flow. The authenticated
 * deployer/admin owns the Agent, and the captured OBO token is threaded into
 * background Agent calls without ever being persisted.
 */
async function provisionWafGenieSpace(input: {
  locale?: string;
  userEmail: string;
  oboToken: string;
}): Promise<WafGenieProvisionResult> {
  const config = getConfig();
  const builtSpace = buildWafGenieSerializedSpace(input.locale);
  const description = getWafGenieDescription();
  const existingId = await findWafGenieSpaceId(input.oboToken);

  let spaceId: string;
  let action: "created" | "updated";

  if (existingId) {
    let serializedSpace = builtSpace;
    try {
      const liveSpace = await getGenieSpace(existingId, input.oboToken);
      if (liveSpace.serialized_space) {
        serializedSpace = mergeWafGenieSerializedSpace(builtSpace, liveSpace.serialized_space);
      }
    } catch (error) {
      logger.warn("WAF Genie fetch-before-merge failed; using generated configuration", {
        spaceId: existingId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    const result = await updateGenieSpace(existingId, {
      title: WAF_GENIE_TITLE,
      description,
      serializedSpace,
      warehouseId: config.warehouseId,
      authMode: "obo",
      oboToken: input.oboToken,
    });
    spaceId = result.space_id;
    action = "updated";
  } else {
    const result = await createGenieSpace({
      title: WAF_GENIE_TITLE,
      description,
      serializedSpace: builtSpace,
      warehouseId: config.warehouseId,
      parentPath: DEFAULT_GENIE_PARENT_PATH,
      authMode: "obo",
      oboToken: input.oboToken,
    });
    spaceId = result.space_id;
    action = "created";
  }

  logger.info(`WAF Genie Agent ${action}`, { spaceId, by: input.userEmail });
  void logActivity("waf_genie_generated", {
    userId: input.userEmail,
    resourceId: spaceId,
    metadata: { action, automatic: true },
  });

  return {
    action,
    spaceId,
    spaceUrl: `${config.host}/genie/rooms/${spaceId}`,
  };
}

export async function ensureWafGenieSpace(input: {
  locale?: string;
  userEmail: string;
  oboToken: string;
}): Promise<WafGenieProvisionResult> {
  if (!provisionPromise) {
    provisionPromise = provisionWafGenieSpace(input).finally(() => {
      provisionPromise = null;
    });
  }
  return provisionPromise;
}
