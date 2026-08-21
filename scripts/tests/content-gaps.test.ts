import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeFollowUpCoverage } from "../lib/content-gaps";
import type { QuestionFrontmatter, QuestionRecord } from "../lib/validate";

function record(overrides: Partial<QuestionFrontmatter> & { id: string }, sections: Map<string, string>): QuestionRecord {
  return {
    file: `${overrides.id}.md`,
    relFile: `${overrides.id}.md`,
    slug: overrides.id,
    body: "",
    sections,
    data: {
      title: "fixture title",
      category: "aws",
      subcategory: "iam",
      technologies: ["aws"],
      difficulty: "beginner",
      question_type: ["conceptual"],
      tags: ["iam"],
      estimated_time_minutes: 5,
      status: "draft",
      last_reviewed: "2026-01-01",
      last_updated: "2026-01-01",
      ...overrides,
    },
  };
}

test("matches a follow-up to an existing in-scope question above threshold", () => {
  const target = record(
    { id: "aws-oidc-001", title: "How would you migrate GitHub Actions to OIDC based AWS credentials", tags: ["oidc", "iam"] },
    new Map([["Question", "q"]]),
  );
  const source = record(
    { id: "aws-iam-001", tags: ["iam"] },
    new Map([["Interview Follow-Up Questions", "- How would you migrate GitHub Actions to OIDC based AWS credentials"]]),
  );
  const results = analyzeFollowUpCoverage([source, target]);
  assert.equal(results.length, 1);
  assert.equal(results[0]!.status, "matched");
  assert.equal(results[0]!.best_match?.id, "aws-oidc-001");
});

test("reports a gap when there is no in-scope candidate at all", () => {
  const source = record(
    { id: "aws-iam-001", tags: ["iam"], technologies: ["aws"] },
    new Map([["Interview Follow-Up Questions", "- How would permission boundaries change this design"]]),
  );
  const unrelated = record(
    { id: "docker-001", title: "How do multi-stage Docker builds reduce image size", tags: ["docker"], category: "docker", technologies: ["docker"] },
    new Map([["Question", "q"]]),
  );
  const results = analyzeFollowUpCoverage([source, unrelated]);
  assert.equal(results.length, 1);
  assert.equal(results[0]!.status, "gap");
  assert.equal(results[0]!.best_match, null);
});

test("reports a gap when a candidate is in-scope but its text is dissimilar", () => {
  const source = record(
    { id: "aws-iam-001", tags: ["iam"] },
    new Map([["Interview Follow-Up Questions", "- What is the blast radius of a leaked credential"]]),
  );
  const candidate = record(
    { id: "aws-vpc-001", title: "How do you design subnet CIDR ranges for a multi-account VPC", tags: ["iam"] },
    new Map([["Question", "q"]]),
  );
  const results = analyzeFollowUpCoverage([source, candidate]);
  assert.equal(results.length, 1);
  assert.equal(results[0]!.status, "gap");
});

test("returns no results when there is no follow-up section", () => {
  const source = record({ id: "aws-iam-001" }, new Map());
  assert.deepEqual(analyzeFollowUpCoverage([source]), []);
});

test("excludes the source question itself from its own candidate pool", () => {
  const source = record(
    { id: "aws-iam-001", title: "How would you migrate an IAM user to a role" },
    new Map([["Interview Follow-Up Questions", "- How would you migrate an IAM user to a role"]]),
  );
  const results = analyzeFollowUpCoverage([source]);
  assert.equal(results[0]!.status, "gap");
});
