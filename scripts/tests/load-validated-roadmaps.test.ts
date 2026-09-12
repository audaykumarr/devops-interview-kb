import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadRawRoadmaps } from "../lib/load-validated-roadmaps";

async function makeTempRoot(): Promise<string> {
  return mkdtempSync(join(tmpdir(), "roadmaps-loader-test-"));
}

test("loadRawRoadmaps returns an empty array when content/roadmaps doesn't exist at all", async () => {
  const root = await makeTempRoot();
  try {
    assert.deepEqual(loadRawRoadmaps(root), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loadRawRoadmaps throws (does not silently swallow) a malformed roadmap file's YAML frontmatter error", async () => {
  const root = await makeTempRoot();
  try {
    const roadmapsDir = join(root, "content", "roadmaps");
    await mkdir(roadmapsDir, { recursive: true });
    writeFileSync(
      join(roadmapsDir, "broken.md"),
      "---\nid: broken\nrelated_technologies: []\n  - ansible\n---\nbody\n",
    );
    assert.throws(() => loadRawRoadmaps(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("loadRawRoadmaps loads real, well-formed roadmap files normally", async () => {
  const root = await makeTempRoot();
  try {
    const roadmapsDir = join(root, "content", "roadmaps");
    await mkdir(roadmapsDir, { recursive: true });
    writeFileSync(join(roadmapsDir, "fixture.md"), "---\nid: fixture\n---\nbody\n");
    const files = loadRawRoadmaps(root);
    assert.equal(files.length, 1);
    assert.equal(files[0]!.data.id, "fixture");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
