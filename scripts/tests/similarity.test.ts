import assert from "node:assert/strict";
import { test } from "node:test";
import { jaccardSimilarity, tokenize } from "../lib/similarity";

test("tokenize lowercases, strips punctuation, and drops stopwords", () => {
  const tokens = tokenize("How would you troubleshoot a CrashLoopBackOff pod?");
  assert.ok(tokens.has("troubleshoot"));
  assert.ok(tokens.has("crashloopbackoff"));
  assert.ok(!tokens.has("how"));
  assert.ok(!tokens.has("would"));
  assert.ok(!tokens.has("you"));
});

test("tokenize strips inline code spans instead of merging them into surrounding words", () => {
  const tokens = tokenize("Check the `kubectl describe pod` output for events");
  assert.ok(!tokens.has("kubectldescribepod"));
  assert.ok(tokens.has("output"));
  assert.ok(tokens.has("events"));
});

test("jaccardSimilarity is 1 for identical sets and 0 for disjoint sets", () => {
  const a = new Set(["a", "b", "c"]);
  assert.equal(jaccardSimilarity(a, new Set(["a", "b", "c"])), 1);
  assert.equal(jaccardSimilarity(a, new Set(["x", "y", "z"])), 0);
});

test("jaccardSimilarity handles empty sets without dividing by zero", () => {
  assert.equal(jaccardSimilarity(new Set(), new Set(["a"])), 0);
  assert.equal(jaccardSimilarity(new Set(), new Set()), 0);
});

test("jaccardSimilarity is symmetric and reflects partial overlap", () => {
  const a = new Set(["a", "b", "c", "d"]);
  const b = new Set(["c", "d", "e", "f"]);
  // intersection {c,d} = 2, union {a,b,c,d,e,f} = 6 -> 2/6
  assert.equal(jaccardSimilarity(a, b), jaccardSimilarity(b, a));
  assert.equal(Math.round(jaccardSimilarity(a, b) * 100) / 100, 0.33);
});
