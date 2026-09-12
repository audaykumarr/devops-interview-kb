import type { EvaluationDepth, FollowUpKind, InterviewerClient, OwnershipSignal, TurnRequest, TurnResponse } from "../adaptive-interview";

// Recognized only by FakeInterviewerClient, so Playwright/unit tests can exercise the
// evaluator-unavailable fallback path (§11) through the real UI without a live backend.
export const SIMULATE_EVALUATOR_UNAVAILABLE_SENTINEL = "__simulate_evaluator_unavailable__";

function pickFollowUpKind(eligible: readonly FollowUpKind[]): FollowUpKind {
  const nonMoveOn = eligible.find((k) => k !== "move-on");
  return nonMoveOn ?? "move-on";
}

function followUpQuestionText(kind: FollowUpKind, canonicalFollowUpText: string | undefined): string | undefined {
  if (kind === "move-on") return undefined;
  if (canonicalFollowUpText) return canonicalFollowUpText;
  switch (kind) {
    case "clarify":
      return "Can you walk through a specific example of how you did that?";
    case "scenario-probe":
      return "What were the failure domains here, and how did you handle availability across them?";
    case "troubleshooting-probe":
      return "Suppose that broke in production at 2am — what's your first move?";
    case "challenge":
      return "Tell me about a specific incident where that was actually tested.";
    default:
      return undefined;
  }
}

/**
 * Deterministic, local, network-free stand-in for the future real AI client — same
 * sendTurn(request): Promise<TurnResponse> interface, so swapping in a real backend in Phase B is
 * a drop-in replacement. Verdict is derived purely from answer length so behavior is reproducible
 * in tests without depending on any external content-matching heuristic.
 */
export class FakeInterviewerClient implements InterviewerClient {
  async sendTurn(request: TurnRequest): Promise<TurnResponse> {
    if (request.candidateAnswer.includes(SIMULATE_EVALUATOR_UNAVAILABLE_SENTINEL)) {
      throw new Error("Simulated evaluator unavailable");
    }

    const length = request.candidateAnswer.trim().length;
    const verdict = length >= 60 ? "nailed" : length >= 30 ? "partial" : "needs-work";
    const depth: EvaluationDepth = length >= 60 ? "deep" : length >= 30 ? "moderate" : "surface";
    const ownershipSignal: OwnershipSignal = length >= 60 ? "strong" : length >= 30 ? "weak" : "none";
    const feedback =
      verdict === "nailed"
        ? `Solid, specific answer on ${request.requirementContext.label} — that reads as real hands-on experience.`
        : verdict === "partial"
          ? `Reasonable understanding of ${request.requirementContext.label}, but the answer stayed fairly general.`
          : `That's a thin answer for ${request.requirementContext.label} — hard to tell how deep the experience goes.`;

    const kinds = verdict === "nailed" ? (["move-on"] as FollowUpKind[]) : request.eligibleFollowUpKinds;
    const kind = pickFollowUpKind(kinds);

    return {
      evaluation: { verdict, depth, ownershipSignal, feedback },
      nextAction: { kind, questionText: followUpQuestionText(kind, request.canonicalFollowUpText) },
      claimAssessment: request.claimContext ? (verdict === "nailed" ? "supports" : verdict === "partial" ? "uncertain" : "uncertain") : undefined,
    };
  }
}
