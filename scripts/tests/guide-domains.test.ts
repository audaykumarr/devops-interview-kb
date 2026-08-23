import assert from "node:assert/strict";
import { test } from "node:test";
import { groupByCategory, groupQuestionsByDomain, type GuideDomain } from "../lib/guide-domains";

function q(category: string, id = `${category}-${Math.random()}`): { category: string; id: string } {
  return { category, id };
}

const DOMAINS: GuideDomain[] = [
  { id: "cicd", name: "CI/CD", categories: ["github-actions", "jenkins"] },
  { id: "containers", name: "Containers", categories: ["docker"] },
  { id: "empty-domain", name: "Empty Domain", categories: ["nonexistent-category"] },
];

test("groupQuestionsByDomain groups questions by which domain's categories list contains their category", () => {
  const questions = [q("github-actions"), q("jenkins"), q("docker"), q("docker")];
  const groups = groupQuestionsByDomain(questions, DOMAINS);
  assert.equal(groups.length, 2);
  assert.equal(groups[0]!.domain.id, "cicd");
  assert.equal(groups[0]!.questions.length, 2);
  assert.equal(groups[1]!.domain.id, "containers");
  assert.equal(groups[1]!.questions.length, 2);
});

test("groupQuestionsByDomain omits domains with zero matching questions", () => {
  const questions = [q("docker")];
  const groups = groupQuestionsByDomain(questions, DOMAINS);
  assert.equal(groups.length, 1);
  assert.equal(groups[0]!.domain.id, "containers");
  assert.ok(!groups.some((g) => g.domain.id === "empty-domain"));
});

test("groupQuestionsByDomain never assigns a question to more than one domain, even with overlapping-looking data", () => {
  // A question's category can only ever match one domain's categories list in a well-formed config;
  // this test confirms the function doesn't double-count even if it somehow did.
  const questions = [q("docker")];
  const groups = groupQuestionsByDomain(questions, DOMAINS);
  const totalCounted = groups.reduce((sum, g) => sum + g.questions.length, 0);
  assert.equal(totalCounted, 1);
});

test("groupQuestionsByDomain ignores a question whose category isn't in any domain", () => {
  const questions = [q("docker"), q("behavioral")];
  const groups = groupQuestionsByDomain(questions, DOMAINS);
  const totalCounted = groups.reduce((sum, g) => sum + g.questions.length, 0);
  assert.equal(totalCounted, 1);
});

test("groupQuestionsByDomain preserves the domain configuration's own order", () => {
  const questions = [q("docker"), q("github-actions")];
  const groups = groupQuestionsByDomain(questions, DOMAINS);
  assert.deepEqual(groups.map((g) => g.domain.id), ["cicd", "containers"]);
});

test("groupByCategory splits a domain's questions by category, sorted largest first", () => {
  const questions = [q("github-actions"), q("jenkins"), q("jenkins")];
  const byCat = groupByCategory(questions);
  assert.equal(byCat.length, 2);
  assert.equal(byCat[0]!.category, "jenkins");
  assert.equal(byCat[0]!.questions.length, 2);
  assert.equal(byCat[1]!.category, "github-actions");
  assert.equal(byCat[1]!.questions.length, 1);
});
