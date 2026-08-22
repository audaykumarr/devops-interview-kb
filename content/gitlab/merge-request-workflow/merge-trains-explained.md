---
id: gitlab-merge-request-workflow-merge-trains-001
title: "Two approved merge requests are merged to main within minutes of each other, and the second one breaks the build even though it passed CI on its own branch. How does GitLab's merge trains feature prevent this?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: intermediate
question_type:
  - conceptual
  - practical
tags:
  - gitlab
  - merge-trains
  - ci-cd
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

Two merge requests are each individually approved and pass CI on their own feature branch. They're merged to `main` within minutes of each other, and the resulting combination breaks the build — each MR was fine in isolation, but the two changes together conflict in a way neither branch's own CI run could have caught. How does GitLab's merge trains feature specifically prevent this?

## Short Answer

A merge request's CI pipeline normally tests that branch's changes against the current `main` at the time the pipeline ran — but if another MR merges to `main` afterward, before this one merges, the tested state and the actual merge target have silently diverged, and nothing re-validates the combination. Merge trains fix this by queuing approved MRs and running each one's pipeline against a merge ref that includes every MR ahead of it in the queue, so each MR is validated against exactly what `main` will actually look like once it merges, not against a `main` that may be stale by the time it does.

## Detailed Explanation

The core problem merge trains solve is a timing gap: a merge request's pipeline typically validates the MR's changes merged into `main` *as it exists at pipeline run time* — but between when that pipeline finishes and when the MR actually merges, `main` can change (another MR merging first), meaning the actual merge that happens is never re-validated against that updated target unless something explicitly re-checks it.

**Without merge trains, "approved and passing CI" doesn't guarantee safe to merge at the actual moment of merging**: if MR A's pipeline validated against `main` at commit X, but by the time A actually merges, `main` is now at commit Y (because MR B merged in between), A is being merged into a state its pipeline never actually tested — the combination of A and B's changes is untested, exactly the gap that produced the described build breakage.

**Merge trains queue approved MRs and test each against the cumulative state ahead of it**: when merge trains are enabled, merging an approved MR doesn't merge it immediately — it joins a queue ("train"), and GitLab creates a merge ref combining `main` plus every MR currently ahead of it in the queue, running that MR's pipeline against that combined state — meaning MR B's pipeline, if queued behind MR A, actually tests A and B's changes together, not just B in isolation against a possibly-stale `main`.

**Each MR only actually merges after its train-position pipeline passes**: if a later MR's pipeline (tested against the cumulative queue state) fails, that MR is removed from the train without merging, while earlier, already-validated MRs in front of it proceed — this is what actually prevents the "two individually-fine changes combine into a broken build" scenario, since the combination itself gets validated before either change lands, not discovered as a broken `main` after the fact.

**This addresses a genuine gap even with required, passing CI already in place**: teams often assume "required status checks passing" is sufficient protection, but that alone doesn't handle rapidly parallel merges to the same target branch — merge trains specifically add the "test against what will actually be there" guarantee that plain required-status-checks doesn't provide.

**The trade-off is added pipeline execution and some merge latency**: each MR in the train effectively runs its pipeline against a slightly different, cumulative state than its own feature branch's original pipeline run, meaning more total CI execution, and MRs later in the queue wait for those ahead of them to complete before their own train-position pipeline even starts — a real cost, generally accepted as worthwhile specifically for branches with high merge frequency and where a broken `main` is costly.

## Key Takeaways

- Without merge trains, a merge request's CI pipeline validates against `main` at pipeline run time, which can be stale by the time the MR actually merges if other MRs land first — nothing re-validates the actual combination.
- Merge trains queue approved MRs and run each one's pipeline against a merge ref including every MR ahead of it, testing the actual cumulative combination before any of them land.
- A failing pipeline for a queued MR removes it from the train without merging, while earlier, already-validated MRs proceed — preventing the "individually fine, combined broken" scenario at the source.
- The trade-off is more total CI execution and some added merge latency for MRs queued behind others, generally worthwhile for high-merge-frequency branches where a broken main is costly.

## Interview Follow-Up Questions

- How would you handle a merge train pipeline failure that's caused by flakiness rather than a genuine incompatibility between queued changes?
- What's the trade-off of enabling merge trains only for specific high-traffic branches versus enabling it project-wide?
- How does this compare to GitHub's equivalent merge queue feature, conceptually?

## References

- [GitLab Docs: Merge trains](https://docs.gitlab.com/ee/ci/pipelines/merge_trains.html)
