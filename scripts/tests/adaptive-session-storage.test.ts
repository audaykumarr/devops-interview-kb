import assert from "node:assert/strict";
import { test } from "node:test";
import {
  appendAdaptiveHistory,
  clearActiveAdaptiveSession,
  clearAdaptiveHistory,
  clearAllAdaptiveData,
  loadActiveAdaptiveSession,
  loadAdaptiveHistory,
  parseActiveAdaptiveSession,
  parseAdaptiveHistory,
  saveActiveAdaptiveSession,
} from "../../lib/adaptive-session-storage";
import type { AdaptiveInterviewSession } from "../../lib/adaptive-interview";
import type { InterviewConfig } from "../../lib/interview-session";

const CONFIG: InterviewConfig = { levels: [], types: [], difficulties: [], categories: [], count: 5, timeMode: "off" };

function session(overrides: Partial<AdaptiveInterviewSession> = {}): AdaptiveInterviewSession {
  return {
    config: CONFIG,
    jdFingerprint: "fp1",
    questionIds: ["q-001"],
    explanations: {},
    turns: [],
    evaluations: [],
    currentCanonicalIndex: 0,
    currentFollowUpsUsed: 0,
    pendingTurn: null,
    startedAt: 1,
    aiCallCount: 0,
    aiUnavailable: false,
    ...overrides,
  };
}

function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  return store;
}

function unstubLocalStorage() {
  delete (globalThis as { localStorage?: Storage }).localStorage;
}

test("parseActiveAdaptiveSession tolerates missing, malformed, and structurally-wrong data", () => {
  assert.equal(parseActiveAdaptiveSession(null), null);
  assert.equal(parseActiveAdaptiveSession("not json"), null);
  assert.equal(parseActiveAdaptiveSession(JSON.stringify({ foo: "bar" })), null);
  const valid = session();
  assert.deepEqual(parseActiveAdaptiveSession(JSON.stringify(valid)), valid);
});

test("parseAdaptiveHistory tolerates missing, malformed, and non-array data, and filters out invalid records", () => {
  assert.deepEqual(parseAdaptiveHistory(null), []);
  assert.deepEqual(parseAdaptiveHistory("not json"), []);
  assert.deepEqual(parseAdaptiveHistory(JSON.stringify({ not: "an array" })), []);
  assert.deepEqual(parseAdaptiveHistory(JSON.stringify([{ garbage: true }])), []);
  const record = { session: session(), completedAt: 5 };
  assert.equal(parseAdaptiveHistory(JSON.stringify([record])).length, 1);
});

test("saveActiveAdaptiveSession / loadActiveAdaptiveSession / clearActiveAdaptiveSession round-trip via a stubbed localStorage", () => {
  stubLocalStorage();
  try {
    assert.equal(loadActiveAdaptiveSession(), null);
    const s = session({ currentCanonicalIndex: 2 });
    saveActiveAdaptiveSession(s);
    const loaded = loadActiveAdaptiveSession();
    assert.deepEqual(loaded, s);
    clearActiveAdaptiveSession();
    assert.equal(loadActiveAdaptiveSession(), null);
  } finally {
    unstubLocalStorage();
  }
});

test("appendAdaptiveHistory / loadAdaptiveHistory / clearAdaptiveHistory round-trip via a stubbed localStorage", () => {
  stubLocalStorage();
  try {
    assert.deepEqual(loadAdaptiveHistory(), []);
    appendAdaptiveHistory({ session: session(), completedAt: 10 });
    appendAdaptiveHistory({ session: session({ jdFingerprint: "fp2" }), completedAt: 20 });
    const history = loadAdaptiveHistory();
    assert.equal(history.length, 2);
    assert.equal(history[1]!.completedAt, 20);
    clearAdaptiveHistory();
    assert.deepEqual(loadAdaptiveHistory(), []);
  } finally {
    unstubLocalStorage();
  }
});

test("clearAllAdaptiveData clears both the active session and the history, and leaves other keys untouched", () => {
  const store = stubLocalStorage();
  try {
    store.set("interview-active-session", "should-not-be-touched");
    store.set("job-specific-session-history", "should-not-be-touched-either");
    saveActiveAdaptiveSession(session());
    appendAdaptiveHistory({ session: session(), completedAt: 1 });

    clearAllAdaptiveData();

    assert.equal(loadActiveAdaptiveSession(), null);
    assert.deepEqual(loadAdaptiveHistory(), []);
    assert.equal(store.get("interview-active-session"), "should-not-be-touched");
    assert.equal(store.get("job-specific-session-history"), "should-not-be-touched-either");
  } finally {
    unstubLocalStorage();
  }
});

test("session recovery: an in-progress session (currentCanonicalIndex short of questionIds.length) survives a reload via localStorage", () => {
  stubLocalStorage();
  try {
    const inProgress = session({ questionIds: ["q-001", "q-002", "q-003"], currentCanonicalIndex: 1, currentFollowUpsUsed: 1 });
    saveActiveAdaptiveSession(inProgress);
    const recovered = loadActiveAdaptiveSession();
    assert.ok(recovered);
    assert.equal(recovered!.currentCanonicalIndex, 1);
    assert.equal(recovered!.currentFollowUpsUsed, 1);
    assert.ok(recovered!.currentCanonicalIndex < recovered!.questionIds.length, "a resumable session must not already be complete");
  } finally {
    unstubLocalStorage();
  }
});
