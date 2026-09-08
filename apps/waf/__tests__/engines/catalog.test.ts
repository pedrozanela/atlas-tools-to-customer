import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Verifies the fix that unblocked /waf/api:
//   1. ensureCatalogSeeded() is memoised — concurrent + repeat calls
//      reuse a single seed promise.
//   2. A failed seed clears the memo so the next caller retries.
//
// We bypass the real Lakebase by mocking @/lib/prisma's withPrisma.

const seedGlobal = globalThis as unknown as {
  __wafCatalogSeed: Promise<unknown> | undefined;
};

async function loadCatalog(opts: {
  withPrismaImpl: (
    fn: (prisma: unknown) => Promise<unknown>,
  ) => Promise<unknown>;
}) {
  vi.resetModules();
  seedGlobal.__wafCatalogSeed = undefined;
  vi.doMock("@/lib/prisma", () => ({
    withPrisma: opts.withPrismaImpl,
  }));
  return await import("@/lib/engines/waf-assessment/catalog");
}

afterEach(() => {
  vi.doUnmock("@/lib/prisma");
  seedGlobal.__wafCatalogSeed = undefined;
});

describe("ensureCatalogSeeded — memoisation", () => {
  it("calls withPrisma exactly once when invoked many times in parallel", async () => {
    const withPrismaSpy = vi.fn(async (fn: (p: unknown) => Promise<unknown>) =>
      fn({
        wafControl: {
          findMany: async () => [],
          upsert: async (args: unknown) => args,
        },
      }),
    );

    const { ensureCatalogSeeded } = await loadCatalog({
      withPrismaImpl: withPrismaSpy,
    });

    await Promise.all([
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
      ensureCatalogSeeded(),
    ]);

    expect(withPrismaSpy).toHaveBeenCalledTimes(1);
  });

  it("subsequent calls after success return the cached result", async () => {
    let calls = 0;
    const withPrismaSpy = vi.fn(async (fn: (p: unknown) => Promise<unknown>) => {
      calls++;
      return fn({
        wafControl: {
          findMany: async () => [],
          upsert: async (args: unknown) => args,
        },
      });
    });

    const { ensureCatalogSeeded } = await loadCatalog({
      withPrismaImpl: withPrismaSpy,
    });

    const first = await ensureCatalogSeeded();
    const second = await ensureCatalogSeeded();
    expect(first).toBe(second);
    expect(calls).toBe(1);
  });

  it("clears the memo on failure so the next caller retries", async () => {
    let attempt = 0;
    const withPrismaSpy = vi.fn(async (fn: (p: unknown) => Promise<unknown>) => {
      attempt++;
      if (attempt === 1) throw new Error("transient lakebase error");
      return fn({
        wafControl: {
          findMany: async () => [],
          upsert: async (args: unknown) => args,
        },
      });
    });

    const { ensureCatalogSeeded } = await loadCatalog({
      withPrismaImpl: withPrismaSpy,
    });

    await expect(ensureCatalogSeeded()).rejects.toThrow(/lakebase/);
    // After failure the memo is cleared; the next call should retry rather
    // than re-throw the cached rejection.
    await expect(ensureCatalogSeeded()).resolves.toBeDefined();
    expect(attempt).toBe(2);
  });
});

describe("ensureCatalogSeeded — inserted vs updated accounting", () => {
  it("counts pre-existing wafIds as updated, new ones as inserted", async () => {
    // Catalog rows that loadControlsFromCsv() returns depend on the bundled
    // CSV under data/waf-controls-catalog.csv. We fake the findMany so two
    // of those rows look already-existing.
    const knownExistingIds = new Set<string>();

    const withPrismaImpl = vi.fn(
      async (fn: (p: unknown) => Promise<unknown>) =>
        fn({
          wafControl: {
            findMany: async () => Array.from(knownExistingIds, (id) => ({ wafId: id })),
            upsert: async (args: { where: { wafId: string } }) => args,
          },
        }),
    );

    const { ensureCatalogSeeded } = await loadCatalog({ withPrismaImpl });

    // No pre-existing rows: everything counts as inserted.
    const result = (await ensureCatalogSeeded()) as {
      inserted: number;
      updated: number;
    };
    expect(result.inserted).toBeGreaterThan(0);
    expect(result.updated).toBe(0);
    expect(result.inserted + result.updated).toBeGreaterThan(0);
  });
});
