import { expect, test } from "bun:test";
import { render } from "../src/lib/output";
test("JSON output is raw and stable", () => expect(render({ id: 1 }, { json: true })).toBe('{\n  "id": 1\n}\n'));
test("empty arrays are explicit", () => expect(render([])).toBe("No results found.\n"));
test("list envelopes render rows instead of stringifying the entire items array", () => {
  const output = render({ items: [{ name: "example.com", status: "registered" }], total: 1 });
  expect(output).toBe("name\tstatus\nexample.com\tregistered\n");
  expect(output).not.toContain("items");
  expect(output).not.toContain("┌");
});
test("piped single-object output has no ANSI or box drawing", () => {
  const output = render({ name: "example.com", status: "registered" });
  expect(output).toBe("name\texample.com\nstatus\tregistered\n");
  expect(output).not.toMatch(/[\u001b\u2500-\u257f]/);
});
