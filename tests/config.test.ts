import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveConfig } from "../src/lib/config";

let dir = ""; afterEach(async () => { if (dir) await rm(dir, { recursive: true, force: true }); });
describe("configuration", () => { test("uses flag > env > profile > default precedence", async () => {
  dir = await mkdtemp(join(tmpdir(), "spaceship-")); const path = join(dir, "config.json");
  await writeFile(path, JSON.stringify({ defaultProfile: "work", profiles: { work: { baseUrl: "https://file.test", apiKey: "file-key" } } }));
  const env = { SPACESHIP_BASE_URL: "https://env.test", SPACESHIP_API_KEY: "env-key" };
  const result = await resolveConfig({ baseUrl: "https://flag.test", timeout: "42" }, env, path);
  expect(result).toMatchObject({ profile: "work", baseUrl: "https://flag.test", apiKey: "env-key", timeout: 42 });
}); });

test("uses the environment timeout when the CLI flag is absent", async () => {
  dir = await mkdtemp(join(tmpdir(), "spaceship-"));
  const result = await resolveConfig({}, { SPACESHIP_TIMEOUT: "1234" }, join(dir, "missing.json"));
  expect(result.timeout).toBe(1234);
});
