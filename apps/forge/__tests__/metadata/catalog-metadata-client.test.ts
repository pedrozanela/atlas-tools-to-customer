import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listMetadataCatalogs,
  listMetadataSchemas,
  MetadataResponseError,
} from "@/lib/metadata/catalog-metadata-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("catalog metadata client", () => {
  it("routes metadata calls through the Forge base path", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ catalogs: ["main"] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(listMetadataCatalogs()).resolves.toEqual({ catalogs: ["main"] });
    expect(fetchMock).toHaveBeenCalledWith("/forge/api/metadata?type=catalogs", undefined);
  });

  it("encodes catalog names in metadata requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ schemas: [] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await listMetadataSchemas("data & ai");
    expect(fetchMock).toHaveBeenCalledWith(
      "/forge/api/metadata?type=schemas&catalog=data+%26+ai",
      undefined,
    );
  });

  it("preserves API errors returned as JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ error: "Warehouse is stopped", code: "WAREHOUSE_UNAVAILABLE" }),
          {
            status: 503,
          },
        ),
      ),
    );

    await expect(listMetadataCatalogs()).rejects.toMatchObject({
      name: "MetadataResponseError",
      message: "Warehouse is stopped",
      status: 503,
      code: "WAREHOUSE_UNAVAILABLE",
    } satisfies Partial<MetadataResponseError>);
  });

  it("returns a controlled error for an HTML proxy response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<!DOCTYPE html><html></html>", { status: 404 })),
    );

    await expect(listMetadataCatalogs()).rejects.toMatchObject({
      name: "MetadataResponseError",
      message: "Metadata service returned an invalid response (HTTP 404).",
      status: 404,
    } satisfies Partial<MetadataResponseError>);
  });
});
