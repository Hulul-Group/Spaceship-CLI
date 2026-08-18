import { expect, test } from "bun:test";
import { mkdtemp, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { addPrefix, removePrefix, validatePrefix } from "../src/lib/prefix";

test("validates custom prefixes", () => {
  expect(validatePrefix("My-CLI")).toBe("my-cli");
  expect(() => validatePrefix("x")).toThrow();
  expect(() => validatePrefix("bad name")).toThrow();
});

test("adds and removes an alias without touching unrelated commands", async () => {
  const directory = await mkdtemp(join(tmpdir(), "space-prefix-")); const launcher = join(directory, "space");
  await Bun.write(launcher, "launcher"); const alias = await addPrefix("custom", launcher);
  expect(await Bun.file(alias).exists()).toBeTrue(); expect(await removePrefix("custom", launcher)).toBe(alias);
  expect(await Bun.file(alias).exists()).toBeFalse();
  await Bun.write(alias, "unrelated"); expect(addPrefix("custom", launcher)).rejects.toThrow("already exists");
});

test("refuses to remove a symlink owned by another command", async () => {
  const directory = await mkdtemp(join(tmpdir(), "space-prefix-")); const launcher = join(directory, "space"); const other = join(directory, "other");
  await Bun.write(launcher, "launcher"); await Bun.write(other, "other"); await symlink(other, join(directory, "custom"));
  expect(removePrefix("custom", launcher)).rejects.toThrow("not an alias");
});
