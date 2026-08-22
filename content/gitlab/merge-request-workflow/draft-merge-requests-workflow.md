---
id: gitlab-merge-request-workflow-draft-mrs-001
title: "A teammate accidentally merged a merge request that was still a work in progress, because nothing in GitLab's workflow signaled it wasn't ready. How would you prevent this going forward?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: beginner
question_type:
  - practical
tags:
  - gitlab
  - merge-requests
  - workflow
estimated_time_minutes: 5
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A teammate opened a merge request to get early feedback on an approach while still actively working on it, but another reviewer approved and merged it before the work was actually finished — nothing in GitLab's interface clearly signaled the MR wasn't meant to be merged yet. How would you use GitLab's Draft feature to prevent this from happening again?

## Short Answer

Prefix the merge request title with "Draft:" (or use the "Mark as draft" action, which does the same thing) — GitLab structurally disables the merge button for any MR marked as a draft, requiring an explicit "Mark as ready" action before it can be merged at all, rather than relying on a reviewer noticing an informal signal like "WIP" in a comment or description that's easy to miss.

## Detailed Explanation

The core problem with an informal "this isn't ready" signal (a comment, a note in the description, a team convention of adding "WIP" to the title without any tooling enforcement) is that it depends entirely on every reviewer noticing and respecting it — which is exactly the kind of thing that gets missed under time pressure or when a reviewer is scanning quickly. GitLab's Draft status converts this from a social convention into a structural, tooling-enforced state.

**Marking a merge request as Draft structurally disables merging**: the merge button is greyed out and disabled for any MR currently marked as Draft, regardless of approval or pipeline status — there's no way to accidentally merge a draft MR through the normal UI flow, since the action simply isn't available until the draft status is explicitly removed.

**"Mark as ready" is a deliberate, explicit action**: converting a draft MR to ready-to-merge status requires someone (typically the author, once they've genuinely finished the work) to explicitly take that action — this creates a clear, intentional signal ("I believe this is actually done now") rather than relying on a reviewer's judgment call about whether an ambiguous WIP marker still applies.

**This is distinct from — and complementary to — pipeline and approval requirements**: Draft status addresses "is this MR even conceptually finished," which is a different question from "does it pass CI" or "has it been reviewed" — an MR can be marked ready (no longer draft) while still failing its pipeline or lacking approvals, since those are separate, independently-enforced gates; Draft specifically prevents the scenario where an MR that's structurally ready (passing, approved) but not actually conceptually finished gets merged anyway.

**Draft status is visible throughout the GitLab interface, not just on the MR page itself**: merge request lists, notifications, and search results all indicate draft status, meaning the "not ready yet" signal is visible wherever someone might encounter the MR, not just to someone who opens it and reads carefully.

**Team convention should establish when to use Draft, since the tooling only helps if it's actually used**: encouraging contributors to mark early, feedback-seeking MRs as Draft from the moment they're opened (rather than only if they remember to add "WIP" informally) is what actually prevents this class of accidental merge — the tooling provides the enforcement, but the team still needs the habit of using it consistently.

## Key Takeaways

- Marking a merge request as Draft structurally disables the merge button, preventing accidental merging regardless of approval or pipeline status — a tooling-enforced gate, not a social convention that depends on a reviewer noticing.
- "Mark as ready" requires an explicit, deliberate action, creating a clear signal distinct from ambiguous informal markers like "WIP" in a title or comment.
- Draft status is a separate, complementary gate to pipeline and approval requirements — it addresses conceptual readiness, not CI/review completion.
- The tooling only helps if the team consistently uses it — establish the habit of marking early or in-progress MRs as Draft from the start, not just informally noting it in the description.

## Interview Follow-Up Questions

- How would you configure branch protection or approval rules to further reinforce that draft MRs can't be merged, beyond the default UI behavior?
- How would you handle a case where someone forgets to mark an MR as Draft and it gets reviewed prematurely, even before any merge attempt?
- How does GitLab's Draft status compare to GitHub's equivalent "Draft pull request" feature?

## References

- [GitLab Docs: Draft merge requests](https://docs.gitlab.com/ee/user/project/merge_requests/drafts.html)
