/**
 * Pipeline runs stubs for apps/waf.
 *
 * The original forge module had a `forge_runs` table managed via Prisma's
 * `forgeRun` accessor. The WAF schema doesn't include that table — runs are
 * a Forge concept, not a WAF concept. These stubs satisfy imports from
 * shared utilities (api-utils, etc.) that reach into runs but are
 * never actually called from the WAF flow.
 */

export interface PipelineRun {
  runId: string;
  ownerEmail: string | null;
  businessName: string;
  status: string;
  [k: string]: unknown;
}

export interface StepLogEntry {
  step: string;
  startedAt?: string;
  finishedAt?: string;
  status?: string;
  message?: string;
}

export type SchemaSnapshotEntry = {
  fullName: string;
  columns: Array<{ name: string; type: string }>;
};

export async function createRun(..._args: unknown[]): Promise<PipelineRun> {
  throw new Error("createRun not implemented in apps/waf");
}

export async function getRunById(_runId: string): Promise<PipelineRun | null> {
  return null;
}

export async function listRuns(..._args: unknown[]): Promise<PipelineRun[]> {
  return [];
}

export async function updateRunStatus(..._args: unknown[]): Promise<void> {}
export async function requeueOrphanedRunsOnStartup(): Promise<number> {
  return 0;
}
export async function failOrphanedRunningRun(..._args: unknown[]): Promise<void> {}
export async function updateRunMessage(..._args: unknown[]): Promise<void> {}
export async function deleteRun(_runId: string): Promise<void> {}
export async function updateRunBusinessContext(..._args: unknown[]): Promise<void> {}
export async function updateRunFilteredTables(..._args: unknown[]): Promise<void> {}
export async function updateRunMetadataCacheKey(_runId: string, _cacheKey: string): Promise<void> {}
export async function updateRunIndustry(..._args: unknown[]): Promise<void> {}
export async function getRunFilteredTables(_runId: string): Promise<string[] | null> {
  return null;
}
export async function updateRunStepLog(_runId: string, _entry: StepLogEntry): Promise<void> {}
