import { expect, test } from "bun:test";
import { operations, responseSchema, spec } from "../src/lib/spec";
import { schemaToZod } from "../src/types/api";

test("all documented success schemas compile to validators", () => {
  const definitions = operations(); expect(definitions).toHaveLength(50);
  for (const definition of definitions) expect(() => schemaToZod(responseSchema(definition.operation), spec.components.schemas)).not.toThrow();
});
