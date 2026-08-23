import assert from "node:assert/strict";
import { test } from "node:test";
import { computeInterviewLevels, INTERVIEW_LEVELS, INTERVIEW_LEVEL_LABELS } from "../lib/interview-level";

test("computeInterviewLevels maps each difficulty to its seniority band", () => {
  assert.deepEqual(
    computeInterviewLevels({ category: "docker", difficulty: "beginner", question_type: ["conceptual"] }),
    ["junior-devops", "devops-engineer"],
  );
  assert.deepEqual(
    computeInterviewLevels({ category: "docker", difficulty: "intermediate", question_type: ["conceptual"] }),
    ["devops-engineer", "senior-devops"],
  );
  assert.deepEqual(
    computeInterviewLevels({ category: "docker", difficulty: "advanced", question_type: ["conceptual"] }),
    ["senior-devops", "staff-principal"],
  );
  assert.deepEqual(
    computeInterviewLevels({ category: "docker", difficulty: "expert", question_type: ["conceptual"] }),
    ["staff-principal"],
  );
});

test("computeInterviewLevels adds a specialty overlay from category, on top of the seniority band", () => {
  const sre = computeInterviewLevels({ category: "sre", difficulty: "intermediate", question_type: ["conceptual"] });
  assert.deepEqual(sre, ["devops-engineer", "senior-devops", "sre"]);

  const cloud = computeInterviewLevels({ category: "aws", difficulty: "beginner", question_type: ["conceptual"] });
  assert.deepEqual(cloud, ["junior-devops", "devops-engineer", "cloud-engineer"]);

  const platform = computeInterviewLevels({ category: "gitops", difficulty: "advanced", question_type: ["conceptual"] });
  assert.deepEqual(platform, ["senior-devops", "platform-engineer", "staff-principal"]);
});

test("computeInterviewLevels adds devsecops from either category or a security question_type", () => {
  const byCategory = computeInterviewLevels({ category: "security", difficulty: "advanced", question_type: ["conceptual"] });
  assert.ok(byCategory.includes("devsecops"));

  const byType = computeInterviewLevels({ category: "aws", difficulty: "advanced", question_type: ["security"] });
  assert.ok(byType.includes("devsecops"));
  assert.ok(byType.includes("cloud-engineer"));
});

test("computeInterviewLevels adds staff-principal for system-design questions regardless of difficulty", () => {
  const levels = computeInterviewLevels({ category: "system-design", difficulty: "intermediate", question_type: ["system-design"] });
  assert.ok(levels.includes("staff-principal"));
  assert.ok(levels.includes("devops-engineer"));
});

test("computeInterviewLevels never duplicates a level and preserves canonical ordering", () => {
  // expert already implies staff-principal from the seniority band; system-design shouldn't duplicate it.
  const levels = computeInterviewLevels({ category: "system-design", difficulty: "expert", question_type: ["system-design"] });
  assert.deepEqual(levels, ["staff-principal"]);
  assert.equal(new Set(levels).size, levels.length);
});

test("INTERVIEW_LEVEL_LABELS has a human-readable label for every level", () => {
  for (const level of INTERVIEW_LEVELS) {
    assert.ok(INTERVIEW_LEVEL_LABELS[level] && INTERVIEW_LEVEL_LABELS[level].length > 0);
  }
});
