import { expect, test } from "bun:test";
import { normalizeArgv, recordItem } from "../src/lib/argv";

test("normalizes domain-first record listing", () => {
  expect(normalizeArgv(["bun", "cli", "domain", "example.com", "records", "list", "--take", "20"]))
    .toEqual(["bun", "cli", "dns", "list", "example.com", "--take", "20"]);
});

test("preserves global options before domain-first commands", () => {
  expect(normalizeArgv(["bun", "cli", "-j", "domain", "example.com", "records", "list"]))
    .toEqual(["bun", "cli", "-j", "dns", "list", "example.com"]);
});

test("keeps the previous concise domain layout as a compatibility route", () => {
  const argv = ["bun", "cli", "domain", "get", "example.com"];
  expect(normalizeArgv(argv)).toEqual(argv);
});

test("builds simple and type-specific records", () => {
  expect(recordItem("www", "192.0.2.1", { type: "a", ttl: "300" })).toEqual({ type: "A", name: "www", address: "192.0.2.1", ttl: 300 });
  expect(recordItem("@", "mail.example.com", { type: "MX", priority: "10" })).toEqual({ type: "MX", name: "@", exchange: "mail.example.com", preference: 10 });
  expect(recordItem("sip", "sip.example.com", { type: "SRV", service: "_sip", protocol: "_tcp", priority: "10", weight: "5", port: "5060" })).toEqual({ type: "SRV", name: "sip", target: "sip.example.com", service: "_sip", protocol: "_tcp", priority: 10, weight: 5, port: 5060 });
});

test("normalizes a single record into a one-item save batch", () => {
  const normalized = normalizeArgv(["bun", "cli", "domain", "example.com", "records", "set", "www", "192.0.2.1", "--type", "A", "--ttl", "300", "--dry-run"]);
  expect(normalized.slice(2, 7)).toEqual(["dns", "save", "example.com", "-d", expect.any(String)]);
  expect(JSON.parse(normalized[6]!)).toEqual({ items: [{ type: "A", name: "www", address: "192.0.2.1", ttl: 300 }] });
  expect(normalized.at(-1)).toBe("--dry-run");
});

test("normalizes custom and basic nameservers", () => {
  expect(normalizeArgv(["bun", "cli", "domain", "example.com", "nameservers", "set", "ns1.example.net", "ns2.example.net"])).toContain(JSON.stringify({ provider: "custom", hosts: ["ns1.example.net", "ns2.example.net"] }));
  expect(normalizeArgv(["bun", "cli", "domain", "example.com", "nameservers", "use-basic"])).toContain(JSON.stringify({ provider: "basic" }));
});

test("normalizes removal to the API's array body", () => {
  const normalized = normalizeArgv(["bun", "cli", "domain", "example.com", "records", "remove", "www", "192.0.2.1", "--type", "A", "-y"]);
  expect(JSON.parse(normalized[6]!)).toEqual([{ type: "A", name: "www", address: "192.0.2.1" }]);
  expect(normalized.at(-1)).toBe("-y");
});
