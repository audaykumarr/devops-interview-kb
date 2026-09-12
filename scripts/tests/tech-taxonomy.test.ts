import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capabilityConceptPhrases,
  extractAmbiguousMentions,
  extractCapabilityMentions,
  extractTagMentions,
  isWeakSignal,
} from "../../lib/tech-taxonomy";

test("extractTagMentions resolves expanded aliases from the semantic matching brief", () => {
  assert.equal(extractTagMentions("Experience with Amazon ECS.").find((m) => m.tag === "ecs")?.tag, "ecs");
  assert.equal(extractTagMentions("Ran clusters on Amazon EKS.").find((m) => m.tag === "eks")?.tag, "eks");
  assert.equal(extractTagMentions("Pipelines built with Azure DevOps.").find((m) => m.tag === "azure-pipelines")?.tag, "azure-pipelines");
});

test("extractCapabilityMentions finds every capability phrase from the brief", () => {
  const cases: [string, string[]][] = [
    ["Strong container orchestration experience required.", ["kubernetes", "ecs", "eks", "aks", "gke"]],
    ["Owns our continuous delivery pipeline end to end.", ["github-actions", "gitlab-ci", "jenkins", "azure-pipelines", "cicd"]],
    ["Set up distributed tracing across services.", ["opentelemetry"]],
    ["Comfortable running AWS container workloads in production.", ["ecs", "eks"]],
  ];
  for (const [text, expectedTags] of cases) {
    const mentions = extractCapabilityMentions(text);
    assert.equal(mentions.length, 1, `expected exactly one capability mention in: "${text}"`);
    assert.deepEqual([...mentions[0]!.equivalentTags].sort(), [...expectedTags].sort());
  }
});

test("extractCapabilityMentions matches a phrase even with trailing/leading words (substring, plural-safe)", () => {
  const mentions = extractCapabilityMentions("Led our continuous delivery pipelines across five teams.");
  assert.equal(mentions.length, 1);
  assert.equal(mentions[0]!.sourcePhrase, "continuous delivery pipeline");
});

test("no capability phrase is a single generic word", () => {
  for (const phrase of capabilityConceptPhrases()) {
    assert.ok(phrase.trim().includes(" "), `capability phrase "${phrase}" must be multi-word, not a single generic word`);
  }
});

test("generic words never trigger a capability match on their own", () => {
  for (const word of ["workloads", "deployment", "deployments", "automation", "cloud", "container", "platform", "infrastructure", "services"]) {
    assert.equal(extractCapabilityMentions(`We manage ${word} every day.`).length, 0, `"${word}" alone must not trigger a capability match`);
  }
});

test("extractAmbiguousMentions resolves Fargate into certain (AWS) and possible (ECS/EKS) tags", () => {
  const mentions = extractAmbiguousMentions("Built and operated container workloads on AWS Fargate.");
  assert.equal(mentions.length, 1);
  assert.deepEqual(mentions[0]!.certainTags, ["aws"]);
  assert.deepEqual([...mentions[0]!.possibleTags].sort(), ["ecs", "eks"]);
});

test("isWeakSignal detects hedged/proximity language from the brief's negative examples", () => {
  assert.equal(isWeakSignal("Familiar with Kubernetes."), true);
  assert.equal(isWeakSignal("Some exposure to Terraform."), true);
  assert.equal(isWeakSignal("Worked alongside the Kubernetes team."), true);
});

test("isWeakSignal does not fire on genuine ownership language", () => {
  assert.equal(isWeakSignal("Designed Kubernetes platforms."), false);
  assert.equal(isWeakSignal("Owned Terraform infrastructure end to end."), false);
  assert.equal(isWeakSignal("Operated production Kubernetes clusters."), false);
});
