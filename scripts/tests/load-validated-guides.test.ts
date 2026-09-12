import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadRawGuides } from "../lib/load-validated-guides";

async function makeTempRoot(): Promise<string> {
  return mkdtempSync(join(tmpdir(), "guides-loader-test-"));
}

test("loadRawGuides returns an empty array when content/guides doesn't exist at all", async () => {
  const root = await makeTempRoot();
  try {
    assert.deepEqual(loadRawGuides(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loadRawGuides throws (does not silently swallow) a malformed guide file's YAML frontmatter error", async () => {
  const root = await makeTempRoot();
  try {
    const guidesDir = join(root, "content", "guides");
    await mkdir(guidesDir, { recursive: true });
    writeFileSync(
      join(guidesDir, "broken.md"),
      "---\nid: broken\nrelated_technologies: []\n  - ansible\n---\nbody\n",
    );
    assert.throws(() => loadRawGuides(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loadRawGuides loads real, well-formed guide files normally", async () => {
  const root = await makeTempRoot();
  try {
    const guidesDir = join(root, "content", "guides");
    await mkdir(guidesDir, { recursive: true });
    writeFileSync(join(guidesDir, "fixture.md"), "---\nid: fixture\n---\nbody\n");
    const files = loadRawGuides(root);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.data.id, "fixture");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
