import { afterEach, describe, expect, it, vi } from "vitest";

const AGENT_ID = "0123456789abcdef0123456789abcdef";

function sseResponse(prompt: string): Response {
  const responseId = `response-${prompt}`;
  const conversationId = `conversation-${prompt}`;
  const events = [
    `event: response.created\ndata: ${JSON.stringify({
      type: "response.created",
      sequence_number: 0,
      response: {
        id: responseId,
        status: "in_progress",
        conversation_id: conversationId,
        output: [],
      },
    })}\n\n`,
    `event: response.completed\ndata: ${JSON.stringify({
      type: "response.completed",
      sequence_number: 1,
      response: {
        id: responseId,
        status: "completed",
        conversation_id: conversationId,
        output: [
          {
            type: "function_call",
            id: `call-${prompt}`,
            call_id: `call-${prompt}`,
            name: "execute_sql",
            status: "completed",
            arguments: JSON.stringify({
              title: `Evidence for ${prompt}`,
              sql: "SELECT COUNT(*) AS total FROM system.access.audit",
            }),
          },
          {
            type: "function_call_output",
            id: `call-${prompt}_output`,
            call_id: `call-${prompt}`,
            status: "completed",
            output: "total\n10",
          },
          {
            type: "message",
            role: "assistant",
            status: "completed",
            content: [
              {
                type: "output_text",
                text: `Finding for ${prompt} [1](https://example.cloud.databricks.com/genie/citation)`,
              },
              {
                type: "output_text",
                text: "| total |\\n| --- |\\n| 10 |",
                metadata: {
                  columns: [{ name: "total", type: "BIGINT" }],
                  preview_rows: [["10"]],
                  total_row_count: 1,
                  status: "available",
                  sql: "SELECT COUNT(*) AS total FROM system.access.audit",
                },
              },
            ],
          },
        ],
      },
    })}\n\n`,
  ].join("");

  // Deliberately split inside event/data boundaries to exercise the streaming
  // parser instead of handing it one convenient chunk.
  const chunks = [events.slice(0, 37), events.slice(37, 151), events.slice(151)];
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
        controller.close();
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream" } },
  );
}

async function loadClient() {
  vi.resetModules();
  vi.doMock("@/lib/dbx/client", () => ({
    getConfig: () => ({ host: "https://example.cloud.databricks.com", warehouseId: "wh" }),
  }));

  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as {
      input: Array<{ content: Array<{ text: string }> }>;
    };
    return sseResponse(body.input[0].content[0].text);
  });
  vi.doMock("@/lib/dbx/fetch-with-timeout", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/dbx/fetch-with-timeout")>()),
    TIMEOUTS: { GENIE_AGENT: 5_460_000, WORKSPACE: 30_000 },
    fetchWithTimeout: fetchMock,
  }));
  vi.stubGlobal("fetch", fetchMock);
  const module = await import("@/lib/dbx/genie-agent");
  return { ...module, fetchMock };
}

async function loadRecoveryClient(transientFailures = 0) {
  vi.resetModules();
  vi.doMock("@/lib/dbx/client", () => ({
    getConfig: () => ({ host: "https://example.cloud.databricks.com", warehouseId: "wh" }),
  }));

  const output = [
    {
      type: "function_call",
      id: "call-recovery",
      call_id: "call-recovery",
      name: "execute_sql",
      status: "completed",
      arguments: JSON.stringify({
        title: "Recovered evidence",
        sql: "SELECT COUNT(*) AS total FROM system.access.audit",
      }),
    },
    {
      type: "function_call_output",
      id: "call-recovery_output",
      call_id: "call-recovery",
      status: "completed",
      output: "total\n10",
    },
    {
      type: "message",
      role: "assistant",
      status: "completed",
      content: [{ type: "output_text", text: "Recovered recommendation" }],
    },
  ];
  let failuresRemaining = transientFailures;
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    expect(init.method).toBe("GET");
    if (failuresRemaining > 0) {
      failuresRemaining -= 1;
      return Response.json(
        { error: { code: "TEMPORARILY_UNAVAILABLE", message: "retry me" } },
        { status: 503 },
      );
    }
    const parsedUrl = new URL(url);
    if (parsedUrl.searchParams.get("order") === "desc") {
      return Response.json({ status: "completed", data: [output.at(-1)] });
    }
    return Response.json({
      status: "completed",
      data: output,
      has_more: false,
    });
  });
  vi.doMock("@/lib/dbx/fetch-with-timeout", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/lib/dbx/fetch-with-timeout")>()),
    TIMEOUTS: { GENIE_AGENT: 5_460_000, WORKSPACE: 30_000 },
    fetchWithTimeout: fetchMock,
  }));
  const module = await import("@/lib/dbx/genie-agent");
  return { ...module, fetchMock };
}

afterEach(() => {
  vi.doUnmock("@/lib/dbx/client");
  vi.doUnmock("@/lib/dbx/fetch-with-timeout");
  vi.doUnmock("@/lib/prisma");
  vi.doUnmock("@/lib/lakebase/schema");
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Genie Agent mode client", () => {
  it("normalizes a fragmented SSE response and its structured SQL evidence", async () => {
    const { runGenieAgentAnalysis, fetchMock } = await loadClient();
    const created = vi.fn(async () => undefined);
    const result = await runGenieAgentAnalysis({
      agentId: AGENT_ID,
      prompt: "DG-03-02",
      getOboToken: () => "admin-obo-token",
      onCreated: created,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get("Authorization")).toBe(
      "Bearer admin-obo-token",
    );
    expect(created).toHaveBeenCalledWith({
      responseId: "response-DG-03-02",
      conversationId: "conversation-DG-03-02",
    });
    expect(result.status).toBe("completed");
    expect(result.queryCount).toBe(1);
    expect(result.reportMarkdown).toContain("Finding for DG-03-02");
    expect(result.citations).toEqual(["https://example.cloud.databricks.com/genie/citation"]);
    expect(result.evidence[0]).toMatchObject({
      title: "Evidence for DG-03-02",
      sql: "SELECT COUNT(*) AS total FROM system.access.audit",
      previewRows: [["10"]],
      totalRowCount: 1,
    });
  });

  it("issues one independent POST for every analysis", async () => {
    const { runGenieAgentAnalysis, fetchMock } = await loadClient();
    const [first, second, third] = await Promise.all([
      runGenieAgentAnalysis({
        agentId: AGENT_ID,
        prompt: "DG-01-03",
        getOboToken: () => "admin-obo-token",
      }),
      runGenieAgentAnalysis({
        agentId: AGENT_ID,
        prompt: "DG-03-02",
        getOboToken: () => "admin-obo-token",
      }),
      runGenieAgentAnalysis({
        agentId: AGENT_ID,
        prompt: "SCP-01-13",
        getOboToken: () => "admin-obo-token",
      }),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect([first.conversationId, second.conversationId, third.conversationId]).toEqual([
      "conversation-DG-01-03",
      "conversation-DG-03-02",
      "conversation-SCP-01-13",
    ]);
    for (const [, init] of fetchMock.mock.calls) {
      const payload = JSON.parse(String(init.body)) as {
        enable_viz: boolean;
        input: unknown[];
      };
      expect(payload.enable_viz).toBe(false);
      expect(payload.input).toHaveLength(1);
    }
  });

  it("recovers an existing conversation with GET requests only", async () => {
    const { recoverGenieAgentAnalysis, fetchMock } = await loadRecoveryClient();
    const result = await recoverGenieAgentAnalysis({
      agentId: AGENT_ID,
      conversationId: "conversation-existing",
      responseId: "response-existing",
      getOboToken: () => "admin-obo-token",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
    expect(result).toMatchObject({
      responseId: "response-existing",
      conversationId: "conversation-existing",
      status: "completed",
      queryCount: 1,
      reportMarkdown: "Recovered recommendation",
    });
  });

  it("retries a transient recovery GET without creating another response", async () => {
    vi.useFakeTimers();
    const { recoverGenieAgentAnalysis, fetchMock } = await loadRecoveryClient(1);
    const recovery = recoverGenieAgentAnalysis({
      agentId: AGENT_ID,
      conversationId: "conversation-existing",
      responseId: "response-existing",
      timeoutMs: 10_000,
      getOboToken: () => "admin-obo-token",
    });

    await vi.advanceTimersByTimeAsync(1_000);
    const result = await recovery;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.every(([, init]) => init.method === "GET")).toBe(true);
    expect(result).toMatchObject({
      responseId: "response-existing",
      conversationId: "conversation-existing",
      status: "completed",
      queryCount: 1,
    });
  });
});

describe("WAF recommendation prompt", () => {
  it("binds one Not Met control to mandatory SQL and curated documentation", async () => {
    const { buildRecommendationPrompt } =
      await import("@/lib/engines/waf-assessment/genie/recommendations");
    const prompt = buildRecommendationPrompt({
      wafId: "DG-03-02",
      pillar: "governance",
      principle: "Establish data quality standards",
      bestPractice: "Use data quality tooling",
      details: "Official curated guidance.",
      metricDefinition: "Coverage percentage.",
      recommendationIfNotMet: "Add data quality monitoring.",
      fixActionParamsJson: JSON.stringify({
        href: "https://docs.databricks.com/aws/en/lakehouse-monitoring",
      }),
      scorePercentage: 0,
      thresholdPercentage: 100,
      locale: "pt-BR",
    });

    expect(prompt).toContain("only for control DG-03-02");
    expect(prompt).toContain("Execute at least one SQL query");
    expect(prompt).toContain("Official curated guidance.");
    expect(prompt).toContain("https://docs.databricks.com/aws/en/lakehouse-monitoring");
    expect(prompt).toContain("Brazilian Portuguese");
  });

  it("queues one independent Agent request row for every Not Met result only", async () => {
    vi.resetModules();
    const findMany = vi.fn(async () => [
      {
        assessmentId: "assessment-1",
        wafId: "DG-01-03",
        pillar: "governance",
        scorePercentage: 0,
        thresholdPercentage: 50,
        thresholdMet: false,
        control: {
          principle: "Unify data and AI management",
          bestPractice: "Track lineage",
          details: "Curated lineage guidance",
          metricDefinition: "Lineage events",
          recommendationIfNotMet: "Enable lineage",
          fixActionParamsJson: null,
        },
      },
      {
        assessmentId: "assessment-1",
        wafId: "SCP-01-13",
        pillar: "security_compliance_privacy",
        scorePercentage: 25,
        thresholdPercentage: 50,
        thresholdMet: false,
        control: {
          principle: "Manage identity",
          bestPractice: "Use service principals",
          details: "Curated identity guidance",
          metricDefinition: "Jobs running as service principals",
          recommendationIfNotMet: "Migrate production jobs",
          fixActionParamsJson: null,
        },
      },
    ]);
    const upsert = vi.fn(async (args: unknown) => args);
    const prisma = {
      wafControlResult: { findMany },
      wafGenieRecommendation: { upsert },
      $transaction: async (operations: Array<Promise<unknown>>) => Promise.all(operations),
    };
    vi.doMock("@/lib/prisma", () => ({
      withPrisma: async (fn: (client: typeof prisma) => Promise<unknown>) => fn(prisma),
    }));
    vi.doMock("@/lib/lakebase/schema", () => ({
      ensureMigrated: async () => undefined,
    }));

    const { seedRecommendationBatch } =
      await import("@/lib/engines/waf-assessment/genie/recommendations");
    const total = await seedRecommendationBatch({
      assessmentId: "assessment-1",
      agentId: AGENT_ID,
      locale: "pt-BR",
    });

    expect(total).toBe(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          assessmentId: "assessment-1",
          thresholdMet: false,
        },
      }),
    );
    expect(upsert).toHaveBeenCalledTimes(2);
    const queuedWafIds = upsert.mock.calls.map(
      ([args]) =>
        (args as { create: { wafId: string }; update: Record<string, never> }).create.wafId,
    );
    expect(queuedWafIds).toEqual(["DG-01-03", "SCP-01-13"]);
    for (const [args] of upsert.mock.calls) {
      expect((args as { update: unknown }).update).toEqual({});
    }
  });

  it("returns a durable setup failure even when no recommendation rows exist", async () => {
    vi.resetModules();
    const prisma = {
      wafAssessment: {
        findUnique: vi.fn(async () => ({
          recommendationSetupStatus: "failed",
          recommendationSetupError: "Agent mode preview is disabled",
        })),
      },
      wafGenieRecommendation: {
        findMany: vi.fn(async () => []),
      },
    };
    vi.doMock("@/lib/prisma", () => ({
      withPrisma: async (fn: (client: typeof prisma) => Promise<unknown>) => fn(prisma),
    }));
    vi.doMock("@/lib/lakebase/schema", () => ({
      ensureMigrated: async () => undefined,
    }));

    const { listRecommendationBatch } =
      await import("@/lib/engines/waf-assessment/genie/recommendations");
    const batch = await listRecommendationBatch("assessment-1");

    expect(batch).toMatchObject({
      assessmentId: "assessment-1",
      status: "failed",
      setupStatus: "failed",
      setupError: "Agent mode preview is disabled",
      total: 0,
      items: [],
    });
  });
});
