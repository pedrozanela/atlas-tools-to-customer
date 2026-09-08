import { safeJsonParse } from "@/lib/error-utils";
import { forgeFetch } from "@/lib/forge-fetch";

interface MetadataErrorResponse {
  error?: string;
  code?: string;
  errorCode?: string;
}

export interface MetadataTable {
  tableName: string;
  fqn: string;
  comment: string | null;
  tableType: string;
}

export class MetadataResponseError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "MetadataResponseError";
  }
}

async function requestMetadata<T>(params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await forgeFetch(`/api/metadata?${query.toString()}`);
  const body = await safeJsonParse<(T & MetadataErrorResponse) | MetadataErrorResponse>(response);

  if (body === null) {
    throw new MetadataResponseError(
      `Metadata service returned an invalid response (HTTP ${response.status}).`,
      response.status,
      "METADATA_RESPONSE_INVALID",
    );
  }

  if (!response.ok) {
    throw new MetadataResponseError(
      body.error ?? `Metadata request failed (${response.status}).`,
      response.status,
      body.code ?? body.errorCode,
    );
  }

  return body as T;
}

export function warmupMetadataWarehouse(): Promise<Record<string, unknown>> {
  return requestMetadata({ type: "warmup" });
}

export function listMetadataCatalogs(): Promise<{ catalogs?: string[] }> {
  return requestMetadata({ type: "catalogs" });
}

export function listMetadataSchemas(catalog: string): Promise<{ schemas?: string[] }> {
  return requestMetadata({ type: "schemas", catalog });
}

export function listMetadataTables(
  catalog: string,
  schema: string,
): Promise<{ tables?: MetadataTable[] }> {
  return requestMetadata({ type: "tables", catalog, schema });
}
