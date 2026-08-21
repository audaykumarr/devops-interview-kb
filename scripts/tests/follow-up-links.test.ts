import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeFollowUpCoverage } from "../lib/content-gaps";
import { buildFollowUpLinks } from "../lib/follow-up-links";
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

test("buildFollowUpLinks includes a matched follow-up with its target's derived URL", () => {
  const target = record(
    { id: "aws-oidc-001", title: "How would you migrate to OIDC", tags: ["oidc", "iam"], subcategory: "security" },
    new Map([["Question", "q"]]),
  );
  const source = record(
    { id: "aws-iam-001", tags: ["iam"] },
    new Map([["Interview Follow-Up Questions", "- How would you migrate to OIDC"]]),
  );
  const followUps = analyzeFollowUpCoverage([source, target]);
  const links = buildFollowUpLinks([source, target], followUps);
  assert.equal(links.length, 1);
  assert.equal(links[0]!.source_id, "aws-iam-001");
  assert.equal(links[0]!.matched_id, "aws-oidc-001");
  assert.equal(links[0]!.matched_url, "/questions/aws/security/aws-oidc-001");
});

test("buildFollowUpLinks excludes gap follow-ups (no match)", () => {
  const source = record(
    { id: "aws-iam-001", tags: ["iam"] },
    new Map([["Interview Follow-Up Questions", "- What is the blast radius of a leaked credential"]]),
  );
  const unrelated = record(
    { id: "docker-001", title: "How do multi-stage builds work", category: "docker", technologies: ["docker"] },
    new Map([["Question", "q"]]),
  );
  const followUps = analyzeFollowUpCoverage([source, unrelated]);
  const links = buildFollowUpLinks([source, unrelated], followUps);
  assert.deepEqual(links, []);
});
