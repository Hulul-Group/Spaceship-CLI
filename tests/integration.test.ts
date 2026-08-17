import { expect, test } from "bun:test";
test("missing credentials exits with auth code and keeps stdout clean", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "async-operations", "get-async-operation-details", "abc"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "", XDG_CONFIG_HOME: "/tmp/spaceship-test-missing" }, stdout: "pipe", stderr: "pipe" });
  expect(await new Response(proc.stdout).text()).toBe(""); const stderr = await new Response(proc.stderr).text(); expect(await proc.exited).toBe(3); expect(stderr).toContain("API credentials are missing");
});
test("dry-run does not require credentials or make a request", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "domain-management", "domain-delete", "example.com", "--dry-run", "--json"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "" }, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text(); expect(await proc.exited).toBe(0); expect(JSON.parse(stdout)).toMatchObject({ method: "DELETE", path: "/v1/domains/example.com" });
});
