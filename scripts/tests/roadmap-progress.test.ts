import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeStageStatus,
  loadRoadmapProgress,
  parsePracticeProgress,
  parseRoadmapProgress,
  saveRoadmapProgress,
  serializeRoadmapProgress,
} from "../../lib/roadmap-progress";

test("parseRoadmapProgress round-trips through serializeRoadmapProgress", () => {
  const original = new Set(["foundations", "containers"]);
  const parsed = parseRoadmapProgress(serializeRoadmapProgress(original));
  assert.deepEqual(Array.from(parsed).sort(), ["containers", "foundations"]);
});

test("parseRoadmapProgress returns an empty set for null input", () => {
  assert.deepEqual(parseRoadmapProgress(null), new Set());
});

test("parseRoadmapProgress returns an empty set for invalid JSON", () => {
  assert.deepEqual(parseRoadmapProgress("{not valid json"), new Set());
});

test("parseRoadmapProgress returns an empty set when completedStageIds is missing", () => {
  assert.deepEqual(parseRoadmapProgress(JSON.stringify({ somethingElse: true })), new Set());
});

test("parseRoadmapProgress returns an empty set when completedStageIds is not an array", () => {
  assert.deepEqual(parseRoadmapProgress(JSON.stringify({ completedStageIds: "foundations" })), new Set());
});

test("parseRoadmapProgress filters out non-string entries instead of throwing", () => {
  const parsed = parseRoadmapProgress(JSON.stringify({ completedStageIds: ["foundations", 42, null, "containers"] }));
  assert.deepEqual(Array.from(parsed).sort(), ["containers", "foundations"]);
});

test("parsePracticeProgress returns an empty object for malformed or array-shaped input", () => {
  assert.deepEqual(parsePracticeProgress(null), {});
  assert.deepEqual(parsePracticeProgress("not json"), {});
  assert.deepEqual(parsePracticeProgress(JSON.stringify(["a", "b"])), {});
});

test("parsePracticeProgress parses a well-formed practice-progress object", () => {
  assert.deepEqual(parsePracticeProgress(JSON.stringify({ "k1": "known", "k2": "review" })), { k1: "known", k2: "review" });
});

test("loadRoadmapProgress and saveRoadmapProgress degrade to a safe no-op without throwing when localStorage is unavailable (e.g. this Node test environment)", () => {
  assert.doesNotThrow(() => saveRoadmapProgress(new Set(["foundations"])));
  assert.deepEqual(loadRoadmapProgress(), new Set());
});

test("computeStageStatus returns completed when the stage id is in completedStageIds, regardless of practice data", () => {
  const status = computeStageStatus("foundations", ["linux"], new Set(["foundations"]), {}, new Map());
  assert.equal(status, "completed");
});

test("computeStageStatus infers in-progress from an unrelated practice-progress entry whose category matches the stage", () => {
  const questionCategoryById = new Map([["k1", "kubernetes"]]);
  const status = computeStageStatus("orchestration", ["kubernetes", "helm"], new Set(), { k1: "known" }, questionCategoryById);
  assert.equal(status, "in-progress");
});

test("computeStageStatus returns not-started when there is no completion and no matching practice activity", () => {
  const questionCategoryById = new Map([["a1", "aws"]]);
  const status = computeStageStatus("orchestration", ["kubernetes", "helm"], new Set(), { a1: "known" }, questionCategoryById);
  assert.equal(status, "not-started");
});

test("computeStageStatus ignores practice-progress entries for questions outside the stage's categories", () => {
  const questionCategoryById = new Map([["a1", "aws"], ["k1", "kubernetes"]]);
  const status = computeStageStatus("cloud", ["aws"], new Set(), { k1: "known" }, questionCategoryById);
  assert.equal(status, "not-started");
});

test("computeStageStatus never matches a stale completed-stage id against a different, unrelated stage", () => {
  const status = computeStageStatus("networking", ["networking"], new Set(["some-removed-stage"]), {}, new Map());
  assert.equal(status, "not-started");
});
