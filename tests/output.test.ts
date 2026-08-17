import { expect, test } from "bun:test";
import { render } from "../src/lib/output";
test("JSON output is raw and stable", () => expect(render({ id: 1 }, { json: true })).toBe('{\n  "id": 1\n}\n'));
test("empty arrays are explicit", () => expect(render([])).toBe("No results found.\n"));
