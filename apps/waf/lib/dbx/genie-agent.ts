/**
 * Genie Agent mode API client.
 *
 * Each call creates a new conversation for exactly one WAF control. Results
 * arrive as SSE and are normalized into a final report plus structured SQL
 * evidence. If the stream disconnects after `response.created`, the client
 * recovers through the conversation-items endpoint.
 *
 * Calls use the deployer/admin's Databricks Apps OBO token. The token is held
 * only in memory and can be refreshed by UI polling while long-running
 * analyses continue.
 *
 * API docs: https://docs.databricks.com/aws/en/genie-agents/api
 */

import { getConfig } from "./client";
import { fetchWithTimeout, FetchTimeoutError, TIMEOUTS } from "./fetch-with-timeout";

const AGENT_ID_RE = /^[0-9a-f]{32}$/;
const TERMINAL_STATUSES = new Set(["completed", "failed"]);

export type GenieAgentOboTokenProvider = () => string;

export interface GenieAgentErrorInfo {
  type?: string;
  code?: string;
  message?: string;
}

export interface GenieAgentContentItem {
  type?: string;
  text?: string;
  metadata?: {
    columns?: Array<{ name?: string; type?: string }>;
    preview_rows?: unknown[][];
    total_row_count?: number;
    status?: string;
    sql?: string;
  };
}

export interface GenieAgentOutputItem {
  type?: string;
  id?: string;
  call_id?: string;
  status?: string;
  role?: string;
  name?: string;
  arguments?: string;
  output?: string;
  content?: GenieAgentContentItem[];
}

export interface GenieAgentResponse {
  object?: string;
  id?: string;
  model?: string;
  status?: string;
  output?: GenieAgentOutputItem[];
  conversation_id?: string;
  created_at?: number;
  error?: GenieAgentErrorInfo;
}

export interface GenieAgentSseEvent {
  type?: string;
  sequence_number?: number;
  response?: GenieAgentResponse;
  item?: GenieAgentOutputItem;
}

export interface GenieAgentEvidence {
  callId: string;
  title: string | null;
  sql: string | null;
  output: string | null;
  columns: Array<{ name: string; type: string }>;
  previewRows: string[][];
  totalRowCount: number | null;
}

export interface GenieAgentResult {
  responseId: string | null;
  conversationId: string;
  status: "completed" | "failed";
  reportMarkdown: string | null;
  citations: string[];
  evidence: GenieAgentEvidence[];
  queryCount: number;
  error: GenieAgentErrorInfo | null;
}

export class GenieAgentApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
    readonly code: string | null = null,
  ) {
    super(message);
    this.name = "GenieAgentApiError";
  }
}

function parseSseBlock(block: string): GenieAgentSseEvent | null {
  let eventType = "";
  const dataLines: string[] = [];
  for (const line of block.split("\n")) {
    if (line.startsWith("event:")) eventType = line.slice(6).trim();
    if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
  }
  const raw = dataLines.join("\n").trim();
  if (!raw || raw === "[DONE]") return null;
  const parsed = JSON.parse(raw) as GenieAgentSseEvent;
  if (!parsed.type && eventType) parsed.type = eventType;
  return parsed;
}

/**
 * Consume SSE even when event boundaries are split across network chunks.
 * Duplicate/out-of-order sequence numbers are ignored.
 */
export async function consumeGenieAgentSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: GenieAgentSseEvent) => void | Promise<void>,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastSequence = -1;

  const deliver = async (block: string) => {
    const event = parseSseBlock(block);
    if (!event) return;
    if (typeof event.sequence_number === "number" && event.sequence_number <= lastSequence) {
      return;
    }
    if (typeof event.sequence_number === "number") {
      lastSequence = event.sequence_number;
    }
    await onEvent(event);
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    buffer = buffer.replace(/\r\n/g, "\n");

    let boundary = buffer.indexOf("\n\n");
    while (boundary >= 0) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (block.trim()) await deliver(block);
      boundary = buffer.indexOf("\n\n");
    }
    if (done) break;
  }

  if (buffer.trim()) await deliver(buffer);
}

function parseJsonObject(raw: string | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function safeString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function normalizeRows(value: unknown): string[][] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(Array.isArray)
    .map((row) => row.map((cell) => (cell == null ? "" : String(cell))));
}

function extractCitations(markdown: string): string[] {
  const urls = new Set<string>();
  const markdownLink = /\[[^\]]+\]\((https:\/\/[^)\s]+)\)/g;
  for (const match of markdown.matchAll(markdownLink)) urls.add(match[1]);
  return [...urls];
}

function normalizeAgentResult(
  response: GenieAgentResponse,
  fallbackConversationId?: string,
): GenieAgentResult {
  const conversationId = response.conversation_id ?? fallbackConversationId;
  if (!conversationId) {
    throw new GenieAgentApiError("Genie Agent response did not include a conversation_id", null);
  }

  const output = Array.isArray(response.output) ? response.output : [];
  const calls = new Map<
    string,
    { title: string | null; sql: string | null; output: string | null }
  >();

  for (const item of output) {
    if (item.type !== "function_call" || item.name !== "execute_sql") continue;
    const args = parseJsonObject(item.arguments);
    const callId = item.call_id ?? item.id ?? `query-${calls.size + 1}`;
    calls.set(callId, {
      title: safeString(args.title),
      sql: safeString(args.sql),
      output: null,
    });
  }
  for (const item of output) {
    if (item.type !== "function_call_output") continue;
    const callId = item.call_id ?? item.id?.replace(/_output$/, "");
    if (!callId) continue;
    const previous = calls.get(callId) ?? { title: null, sql: null, output: null };
    previous.output = safeString(item.output);
    calls.set(callId, previous);
  }

  const reportChunks: string[] = [];
  const metadataBySql = new Map<
    string,
    {
      columns: Array<{ name: string; type: string }>;
      previewRows: string[][];
      totalRowCount: number | null;
    }
  >();
  for (const item of output) {
    if (item.type !== "message" || item.role !== "assistant") continue;
    for (const content of item.content ?? []) {
      if (content.type !== "output_text") continue;
      const text = safeString(content.text);
      if (text) reportChunks.push(text);
      const sql = safeString(content.metadata?.sql);
      if (sql) {
        metadataBySql.set(sql, {
          columns: (content.metadata?.columns ?? []).map((column) => ({
            name: column.name ?? "",
            type: column.type ?? "",
          })),
          previewRows: normalizeRows(content.metadata?.preview_rows),
          totalRowCount:
            typeof content.metadata?.total_row_count === "number"
              ? content.metadata.total_row_count
              : null,
        });
      }
    }
  }

  const evidence: GenieAgentEvidence[] = [...calls.entries()].map(([callId, call]) => {
    const metadata = call.sql ? metadataBySql.get(call.sql) : undefined;
    return {
      callId,
      title: call.title,
      sql: call.sql,
      output: call.output,
      columns: metadata?.columns ?? [],
      previewRows: metadata?.previewRows ?? [],
      totalRowCount: metadata?.totalRowCount ?? null,
    };
  });
  const reportMarkdown = reportChunks.length > 0 ? reportChunks.join("\n\n") : null;
  const status = response.status === "failed" ? "failed" : "completed";

  return {
    responseId: response.id ?? null,
    conversationId,
    status,
    reportMarkdown,
    citations: reportMarkdown ? extractCitations(reportMarkdown) : [],
    evidence,
    queryCount: evidence.length,
    error: response.error ?? null,
  };
}

interface ConversationItemsPage {
  data?: GenieAgentOutputItem[];
  last_id?: string;
  has_more?: boolean;
  status?: string;
}

const RECOVERY_RETRY_BASE_MS = 1_000;
const RECOVERY_RETRY_MAX_MS = 15_000;

function oboHeaders(getOboToken: GenieAgentOboTokenProvider): Record<string, string> {
  const token = getOboToken().trim();
  if (!token) {
    throw new GenieAgentApiError(
      "Databricks OBO token is unavailable for Genie Agent execution",
      401,
      "obo_token_unavailable",
    );
  }
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function getConversationItemsPage(
  agentId: string,
  conversationId: string,
  params: URLSearchParams,
  getOboToken: GenieAgentOboTokenProvider,
  timeoutMs: number = TIMEOUTS.WORKSPACE,
): Promise<ConversationItemsPage> {
  const { host } = getConfig();
  const headers = oboHeaders(getOboToken);
  const url =
    `${host}/api/2.0/genie/agents/${agentId}/conversations/` +
    `${conversationId}/items?${params.toString()}`;
  const response = await fetchWithTimeout(url, { method: "GET", headers }, timeoutMs);
  if (!response.ok) {
    const text = await response.text();
    throw new GenieAgentApiError(
      `Genie Agent conversation recovery failed (${response.status}): ${text}`,
      response.status,
    );
  }
  return (await response.json()) as ConversationItemsPage;
}

function recoveryTimedOut(): GenieAgentApiError {
  return new GenieAgentApiError(
    "Timed out while recovering a disconnected Genie Agent response",
    null,
    "timeout",
  );
}

function isRetryableRecoveryError(error: unknown): boolean {
  if (error instanceof FetchTimeoutError || error instanceof TypeError) {
    return true;
  }
  if (error instanceof GenieAgentApiError) {
    return error.status === 429 || (error.status !== null && error.status >= 500);
  }
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }
  if (error && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    return (
      code === "ECONNRESET" ||
      code === "ETIMEDOUT" ||
      code === "ECONNREFUSED" ||
      code === "EAI_AGAIN"
    );
  }
  return false;
}

async function getConversationItemsPageWithRetry(
  agentId: string,
  conversationId: string,
  params: URLSearchParams,
  deadline: number,
  getOboToken: GenieAgentOboTokenProvider,
): Promise<ConversationItemsPage> {
  let attempt = 0;
  while (Date.now() < deadline) {
    try {
      return await getConversationItemsPage(
        agentId,
        conversationId,
        params,
        getOboToken,
        Math.max(1, Math.min(TIMEOUTS.WORKSPACE, deadline - Date.now())),
      );
    } catch (error) {
      if (!isRetryableRecoveryError(error)) throw error;
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      const backoffMs = Math.min(
        RECOVERY_RETRY_BASE_MS * 2 ** attempt,
        RECOVERY_RETRY_MAX_MS,
        remainingMs,
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      attempt += 1;
    }
  }
  throw recoveryTimedOut();
}

async function recoverConversation(
  agentId: string,
  conversationId: string,
  deadline: number,
  responseId: string | null,
  getOboToken: GenieAgentOboTokenProvider,
): Promise<GenieAgentResult> {
  let status = "in_progress";
  while (!TERMINAL_STATUSES.has(status) && Date.now() < deadline) {
    const page = await getConversationItemsPageWithRetry(
      agentId,
      conversationId,
      new URLSearchParams({ order: "desc", limit: "1" }),
      deadline,
      getOboToken,
    );
    status = page.status ?? "in_progress";
    if (!TERMINAL_STATUSES.has(status)) {
      const remainingMs = deadline - Date.now();
      if (remainingMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, Math.min(5_000, remainingMs)));
      }
    }
  }
  if (!TERMINAL_STATUSES.has(status)) {
    throw recoveryTimedOut();
  }

  const items: GenieAgentOutputItem[] = [];
  let after: string | undefined;
  do {
    const params = new URLSearchParams({ order: "asc", limit: "100" });
    if (after) params.set("after", after);
    const page = await getConversationItemsPageWithRetry(
      agentId,
      conversationId,
      params,
      deadline,
      getOboToken,
    );
    items.push(...(page.data ?? []));
    after = page.has_more ? page.last_id : undefined;
  } while (after);

  const failedMessage = items
    .filter((item) => item.type === "message" && item.role === "system")
    .flatMap((item) => item.content ?? [])
    .map((content) => safeString(content.text))
    .find(Boolean);

  return normalizeAgentResult(
    {
      id: responseId ?? undefined,
      status,
      conversation_id: conversationId,
      output: items,
      error:
        status === "failed"
          ? {
              type: "server_error",
              code: "stream_recovery_failed",
              message: failedMessage ?? undefined,
            }
          : undefined,
    },
    conversationId,
  );
}

export async function recoverGenieAgentAnalysis(input: {
  agentId: string;
  conversationId: string;
  responseId?: string | null;
  timeoutMs?: number;
  getOboToken: GenieAgentOboTokenProvider;
}): Promise<GenieAgentResult> {
  if (!AGENT_ID_RE.test(input.agentId)) {
    throw new GenieAgentApiError(
      "Genie Agent ID must be a 32-character lowercase hexadecimal string",
      null,
      "invalid_agent_id",
    );
  }
  if (!input.conversationId) {
    throw new GenieAgentApiError(
      "conversationId is required for Genie Agent recovery",
      null,
      "invalid_conversation_id",
    );
  }
  return recoverConversation(
    input.agentId,
    input.conversationId,
    Date.now() + (input.timeoutMs ?? TIMEOUTS.GENIE_AGENT),
    input.responseId ?? null,
    input.getOboToken,
  );
}

function retryAfterMs(response: Response, attempt: number): number {
  const raw = response.headers.get("Retry-After");
  const seconds = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(seconds)) return Math.min(seconds * 1_000, 60_000);
  return Math.min(2_000 * 2 ** attempt, 30_000);
}

type AgentStreamHandle = {
  response: Response;
  cleanup: () => void;
  timedOut: () => boolean;
};

async function postAgentResponse(
  agentId: string,
  prompt: string,
  deadline: number,
  getOboToken: GenieAgentOboTokenProvider,
): Promise<AgentStreamHandle> {
  const { host } = getConfig();
  const url = `${host}/api/2.0/genie/agents/${agentId}/responses`;
  const body = JSON.stringify({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: prompt }],
      },
    ],
    enable_viz: false,
  });

  for (let attempt = 0; attempt <= 3; attempt++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new GenieAgentApiError(
        "Genie Agent request exceeded the 90-minute stream deadline",
        null,
        "timeout",
      );
    }
    const controller = new AbortController();
    let didTimeOut = false;
    const timer = setTimeout(() => {
      didTimeOut = true;
      controller.abort();
    }, remainingMs);
    let response: Response;
    try {
      // Keep this AbortController alive through SSE body consumption. The
      // generic fetch wrapper clears its timer when headers arrive, which is
      // correct for JSON APIs but insufficient for a long-lived stream.
      response = await fetch(url, {
        method: "POST",
        headers: {
          ...oboHeaders(getOboToken),
          Accept: "text/event-stream",
        },
        body,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      if (didTimeOut) {
        throw new GenieAgentApiError(
          "Genie Agent request exceeded the 90-minute stream deadline",
          null,
          "timeout",
        );
      }
      throw error;
    }
    if (response.status !== 429 || attempt === 3) {
      return {
        response,
        cleanup: () => clearTimeout(timer),
        timedOut: () => didTimeOut,
      };
    }
    clearTimeout(timer);
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, retryAfterMs(response, attempt)));
  }
  throw new GenieAgentApiError("Genie Agent request retry loop exhausted", null);
}

export async function runGenieAgentAnalysis(input: {
  agentId: string;
  prompt: string;
  getOboToken: GenieAgentOboTokenProvider;
  onCreated?: (ids: { responseId: string | null; conversationId: string }) => Promise<void>;
}): Promise<GenieAgentResult> {
  if (!AGENT_ID_RE.test(input.agentId)) {
    throw new GenieAgentApiError(
      "Genie Agent ID must be a 32-character lowercase hexadecimal string",
      null,
      "invalid_agent_id",
    );
  }

  const startedAt = Date.now();
  const deadline = startedAt + TIMEOUTS.GENIE_AGENT;
  const stream = await postAgentResponse(input.agentId, input.prompt, deadline, input.getOboToken);
  const response = stream.response;
  if (!response.ok) {
    stream.cleanup();
    const text = await response.text();
    let code: string | null = null;
    try {
      const parsed = JSON.parse(text) as { error?: { code?: string }; error_code?: string };
      code = parsed.error?.code ?? parsed.error_code ?? null;
    } catch {
      // Keep the raw text in the message below.
    }
    throw new GenieAgentApiError(
      `Genie Agent request failed (${response.status}): ${text}`,
      response.status,
      code,
    );
  }
  if (!response.body) {
    stream.cleanup();
    throw new GenieAgentApiError("Genie Agent response did not include an SSE body", 502);
  }

  let created: { responseId: string | null; conversationId: string } | null = null;
  let terminal: GenieAgentResponse | null = null;
  let streamError: unknown = null;
  try {
    await consumeGenieAgentSse(response.body, async (event) => {
      if (event.type === "response.created" && event.response?.conversation_id) {
        created = {
          responseId: event.response.id ?? null,
          conversationId: event.response.conversation_id,
        };
        await input.onCreated?.(created);
      }
      if (
        (event.type === "response.completed" || event.type === "response.failed") &&
        event.response
      ) {
        terminal = event.response;
      }
    });
  } catch (error) {
    streamError = error;
  } finally {
    stream.cleanup();
  }

  const terminalResult = terminal as GenieAgentResponse | null;
  const createdResult = created as {
    responseId: string | null;
    conversationId: string;
  } | null;
  if (terminalResult) return normalizeAgentResult(terminalResult);
  if (createdResult) {
    return recoverConversation(
      input.agentId,
      createdResult.conversationId,
      deadline,
      createdResult.responseId,
      input.getOboToken,
    );
  }
  if (stream.timedOut()) {
    throw new GenieAgentApiError(
      "Genie Agent request exceeded the 90-minute stream deadline",
      null,
      "timeout",
    );
  }
  if (streamError instanceof Error) throw streamError;
  throw new GenieAgentApiError(
    "Genie Agent SSE stream ended before response.created",
    502,
    "incomplete_stream",
  );
}
