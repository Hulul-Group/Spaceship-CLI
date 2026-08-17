import { expect, test } from "bun:test";
import { operations, responseSchema, spec } from "../src/lib/spec";
import { schemaToZod } from "../src/types/api";

test("all documented success schemas compile to validators", () => {
  const definitions = operations(); expect(definitions).toHaveLength(50);
  for (const definition of definitions) expect(() => schemaToZod(responseSchema(definition.operation), spec.components.schemas)).not.toThrow();
});

test("domain list scalar allOf references accept API string values", () => {
  const definition = operations().find((item) => item.operation.operationId === "getDomainList");
  expect(definition).toBeDefined();
  const listSchema = responseSchema(definition!.operation)!;
  const itemReference = listSchema.properties!.items!.items!.$ref!;
  const itemSchema = spec.components.schemas[itemReference.split("/").at(-1)!]!;

  for (const field of ["name", "unicodeName", "registrationDate", "expirationDate", "lifecycleStatus"]) {
    const property = itemSchema.properties![field]!;
    const example = field.endsWith("Date") ? "2026-08-18T00:00:00.000Z" : field === "lifecycleStatus" ? "registered" : "example.com";
    expect(schemaToZod(property, spec.components.schemas).safeParse(example).success).toBeTrue();
  }
  expect(schemaToZod(itemSchema.properties!.verificationStatus, spec.components.schemas).safeParse(null).success).toBeTrue();
});
