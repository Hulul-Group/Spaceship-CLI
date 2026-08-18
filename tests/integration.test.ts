import { expect, test } from "bun:test";
test("missing credentials exits with auth code and keeps stdout clean", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "async", "status", "abc"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "", XDG_CONFIG_HOME: "/tmp/spaceship-test-missing" }, stdout: "pipe", stderr: "pipe" });
  expect(await new Response(proc.stdout).text()).toBe(""); const stderr = await new Response(proc.stderr).text(); expect(await proc.exited).toBe(3); expect(stderr).toContain("API credentials are missing");
});
test("dry-run does not require credentials or make a request", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "domain", "delete", "example.com", "-n", "-j"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "" }, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text(); expect(await proc.exited).toBe(0); expect(JSON.parse(stdout)).toMatchObject({ method: "DELETE", path: "/v1/domains/example.com" });
});
test("domain-first single-record syntax builds the expected request", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "domain", "example.com", "records", "set", "www", "192.0.2.10", "--type", "A", "--ttl", "300", "-n", "-j"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "" }, stdout: "pipe", stderr: "pipe" });
  const output = JSON.parse(await new Response(proc.stdout).text()); expect(await proc.exited).toBe(0);
  expect(output).toMatchObject({ method: "PUT", path: "/v1/dns/records/example.com", body: { items: [{ type: "A", name: "www", address: "192.0.2.10", ttl: 300 }] } });
});
test("domain-first nameserver syntax builds a custom-provider request", async () => {
  const proc = Bun.spawn(["bun", "src/index.ts", "domain", "example.com", "nameservers", "set", "ns1.example.net", "ns2.example.net", "-n", "-j"], { env: { ...process.env, SPACESHIP_API_KEY: "", SPACESHIP_API_SECRET: "" }, stdout: "pipe", stderr: "pipe" });
  const output = JSON.parse(await new Response(proc.stdout).text()); expect(await proc.exited).toBe(0);
  expect(output).toMatchObject({ method: "PUT", path: "/v1/domains/example.com/nameservers", body: { provider: "custom", hosts: ["ns1.example.net", "ns2.example.net"] } });
});
