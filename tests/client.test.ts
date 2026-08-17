import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { ApiClient } from "../src/lib/client";

describe("ApiClient", () => {
  test("retries 429 and respects Retry-After", async () => { let calls = 0; const sleeps: number[] = [];
    const mocked = (async () => ++calls === 1 ? new Response("{}", { status: 429, headers: { "Retry-After": "1" } }) : Response.json({ ok: true })) as unknown as typeof fetch;
    const client = new ApiClient({ baseUrl: "https://example.test/api", apiKey: "key", apiSecret: "secret", timeout: 1000, fetch: mocked, sleep: async (ms) => { sleeps.push(ms); } });
    expect((await client.request({ path: "/v1/test", schema: z.object({ ok: z.boolean() }) })).data).toEqual({ ok: true }); expect(calls).toBe(2); expect(sleeps).toEqual([1000]);
  });
  test("paginates skip/take envelopes", async () => { const urls: string[] = []; const mocked = (async (input: URL | RequestInfo) => { const url = String(input); urls.push(url); const skip = Number(new URL(url).searchParams.get("skip")); return Response.json({ items: skip ? [3] : [1, 2], total: 3 }); }) as unknown as typeof fetch;
    const client = new ApiClient({ baseUrl: "https://example.test", apiKey: "key", apiSecret: "secret", timeout: 1000, fetch: mocked }); const values = [];
    for await (const item of client.paginate({ path: "/items", schema: z.object({ items: z.array(z.number()), total: z.number() }) }, { items: (x) => x.items, total: (x) => x.total, take: 2 })) values.push(item);
    expect(values).toEqual([1, 2, 3]); expect(urls).toHaveLength(2);
  });
});
