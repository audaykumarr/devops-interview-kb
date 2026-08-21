import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildIndex } from "../lib/index-builder";
import { loadRawCorpus, loadSchemaAndTaxonomy } from "../lib/load-validated";
import { computeStatistics } from "../lib/statistics";
import { validateCorpus } from "../lib/validate";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("the real content/ corpus validates cleanly end to end", () => {
  const { validateSchema, validCategories } = loadSchemaAndTaxonomy(ROOT);
  const raw = loadRawCorpus(ROOT);
  assert.ok(raw.length > 0, "expected at least one content file under content/");
  const { errors, valid } = validateCorpus(raw, validateSchema, validCategories);
  assert.deepEqual(errors, []);
  assert.equal(valid.length, raw.length);
});

test("buildIndex and computeStatistics run without throwing against the real corpus", () => {
  const { validateSchema, validCategories } = loadSchemaAndTaxonomy(ROOT);
  const raw = loadRawCorpus(ROOT);
  const { valid } = validateCorpus(raw, validateSchema, validCategories);

  const index = buildIndex(valid);
  const stats = computeStatistics(valid);

  assert.equal(index.length, valid.length);
  assert.equal(stats.total_questions, valid.length);
  assert.ok(index.every((entry) => entry.url.startsWith("/questions/")));
});
