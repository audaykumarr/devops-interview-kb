import assert from "node:assert/strict";
import { test } from "node:test";
import { buildQuestionHook, buildShareText, buildXIntentUrl, buildXPostText, X_HANDLE } from "../../lib/share";

const QUESTION_URL = "https://devopsinterviewkb.com/questions/kubernetes/troubleshooting/pod-stuck-crashloopbackoff";
const GUIDE_URL = "https://devopsinterviewkb.com/guides/kubernetes-interview-guide";
const ROADMAP_URL = "https://devopsinterviewkb.com/roadmaps/devops-engineer-roadmap";

test("buildShareText for a question includes the title, the canonical URL, and the handle, with no emoji heading", () => {
  const text = buildShareText({ type: "question", title: "How do you diagnose a CrashLoopBackOff?", url: QUESTION_URL });
  assert.ok(text.startsWith("How do you diagnose a CrashLoopBackOff?"));
  assert.ok(text.includes(QUESTION_URL));
  assert.ok(text.includes(X_HANDLE));
  assert.ok(text.includes("Practical, scenario-driven DevOps interview preparation."));
});

test("buildShareText for a guide is prefixed with the book emoji and uses the guide tagline", () => {
  const text = buildShareText({ type: "guide", title: "Kubernetes Interview Guide", url: GUIDE_URL });
  assert.ok(text.startsWith("📘 Kubernetes Interview Guide"));
  assert.ok(text.includes("A practical guide for DevOps interview preparation."));
  assert.ok(text.includes(GUIDE_URL));
});

test("buildShareText for a roadmap is prefixed with the map emoji and uses the roadmap tagline", () => {
  const text = buildShareText({ type: "roadmap", title: "DevOps Engineer Roadmap", url: ROADMAP_URL });
  assert.ok(text.startsWith("🗺️ DevOps Engineer Roadmap"));
  assert.ok(text.includes("A practical learning path for DevOps interview preparation."));
  assert.ok(text.includes(ROADMAP_URL));
});

test("buildShareText never hardcodes a URL — it always reflects the url argument passed in", () => {
  const text = buildShareText({ type: "question", title: "t", url: "https://devopsinterviewkb.com/questions/aws/iam/x" });
  assert.ok(text.includes("https://devopsinterviewkb.com/questions/aws/iam/x"));
  assert.ok(!text.includes("localhost"));
});

test("buildQuestionHook composes a direct, dynamic prompt from the real category and title", () => {
  const hook = buildQuestionHook("Kubernetes", "HPA isn't scaling despite rising latency — why?");
  assert.equal(hook, "Kubernetes interview prep: HPA isn't scaling despite rising latency — why?");
});

test("buildXPostText with a hook uses the hook directly instead of the generic tagline", () => {
  const text = buildXPostText({
    type: "question",
    title: "irrelevant when a hook is given",
    url: QUESTION_URL,
    hook: "Kubernetes interview prep: HPA isn't scaling despite rising latency",
  });
  assert.ok(text.startsWith("Kubernetes interview prep: HPA isn't scaling despite rising latency"));
  assert.ok(!text.includes("Practical, scenario-driven"));
  assert.ok(text.includes(QUESTION_URL));
  assert.ok(text.includes(X_HANDLE));
});

test("buildXPostText without a hook falls back to heading + tagline, same as buildShareText", () => {
  const text = buildXPostText({ type: "guide", title: "AWS DevOps Interview Guide", url: GUIDE_URL });
  assert.ok(text.startsWith("📘 AWS DevOps Interview Guide"));
  assert.ok(text.includes("A practical guide for DevOps interview preparation."));
});

test("buildXPostText stays within X's 280-character practical limit even for a very long title", () => {
  const longTitle = "A".repeat(500);
  const text = buildXPostText({ type: "question", title: longTitle, url: QUESTION_URL });
  // X counts any URL as a fixed 23-char t.co link, not its real length — mirror that here.
  const xCountedLength = text.length - QUESTION_URL.length + 23;
  assert.ok(xCountedLength <= 280, `expected <= 280 X-counted chars, got ${xCountedLength}`);
  assert.ok(text.includes(X_HANDLE));
  assert.ok(text.includes(QUESTION_URL));
});

test("buildXPostText with a very long hook still stays within the practical limit and truncates with an ellipsis", () => {
  const longHook = "Kubernetes interview prep: " + "B".repeat(500);
  const text = buildXPostText({ type: "question", title: "t", url: QUESTION_URL, hook: longHook });
  const xCountedLength = text.length - QUESTION_URL.length + 23;
  assert.ok(xCountedLength <= 280, `expected <= 280 X-counted chars, got ${xCountedLength}`);
  assert.ok(text.includes("…"));
});

test("buildXIntentUrl produces a valid x.com intent URL with the post text URL-encoded", () => {
  const url = buildXIntentUrl({ type: "roadmap", title: "DevOps Engineer Roadmap", url: ROADMAP_URL });
  assert.ok(url.startsWith("https://x.com/intent/tweet?text="));
  const decoded = decodeURIComponent(url.replace("https://x.com/intent/tweet?text=", ""));
  assert.ok(decoded.includes("DevOps Engineer Roadmap"));
  assert.ok(decoded.includes(ROADMAP_URL));
});
