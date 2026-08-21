---
id: argocd-sync-waves-content-hash-on-every-sync-job-001
title: "What would go wrong if you used content-hash naming for an Argo CD Job that's meant to run on every sync instead?"
category: argocd
subcategory: sync-waves
technologies:
  - argocd
  - kubernetes
difficulty: intermediate
question_type:
  - conceptual
tags:
  - argocd
  - kubernetes
  - jobs
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Content-hash naming is the right pattern for a migration Job that should only run when its content changes. What would go wrong if you applied that same pattern to a Job that's meant to run on every single sync, regardless of whether anything changed?

## Short Answer

If the Job's manifest content doesn't change between syncs, its content hash doesn't change either — meaning it would produce the exact same Job name every time, and an unchanged Job manifest is a no-op to Argo CD (nothing to apply, since the object already matches what's declared), so the Job simply wouldn't run again on subsequent syncs where nothing changed. This is the opposite problem from the "run every sync" requirement — content-hash naming inherently defeats "run every time" for a Job whose content is otherwise identical run to run.

## Detailed Explanation

The content-hash naming pattern's entire mechanism relies on the Job's name changing if and only if its content changes — that's precisely what makes it correctly skip re-running an unchanged migration. Applying this same mechanism to a Job that's supposed to run unconditionally on every sync directly conflicts with that behavior: a "run every sync" reconciliation-style Job typically has the *same* content every time (the same script, same image, same configuration) — its purpose is to always execute, not to execute only when its own definition changes. Hashing content that doesn't change produces the same hash every time, meaning the same Job name every time, meaning Argo CD sees "this Job already exists and matches" on every subsequent sync and does nothing — the Job runs exactly once (on the first sync it's introduced) and then never again, despite the intent being for it to run on every single sync.

This is why the two patterns from the base sync-waves question use fundamentally different mechanisms, deliberately: "run every sync" needs `hook-delete-policy: BeforeHookCreation`, which forces Argo CD to delete the existing Job and create a genuinely new one on every sync regardless of content — sidestepping the "unchanged content = no-op" problem entirely by never comparing against the previous Job's content in the first place, just always replacing it. "Run only when changed" needs content-hash naming specifically because it wants exactly the no-op-on-unchanged behavior that would break the "every sync" case.

**The general principle**: choosing between these two patterns isn't a stylistic preference — it directly follows from whether the Job's *purpose* requires re-execution on unchanged content (reconciliation-style, needs delete-and-recreate) or requires skipping re-execution on unchanged content (migration-style, needs content-hash naming) — applying the wrong pattern to a given Job's actual intent produces exactly the wrong behavior, either running a one-time migration repeatedly and wastefully, or running an intended-every-time reconciliation Job exactly once and then silently never again.

## Key Takeaways

- Content-hash naming produces the same name for unchanged content, which Argo CD treats as a no-op — directly defeating a "run every sync" requirement.
- A Job meant to run unconditionally on every sync needs `hook-delete-policy: BeforeHookCreation`, not content-hash naming, since it needs to always be treated as new regardless of content.
- The two naming patterns are deliberately different because they solve opposite problems: skip-on-unchanged versus always-recreate.
- Choosing the wrong pattern for a Job's actual intent produces the exact opposite of the desired behavior, not just a minor inefficiency.

## Interview Follow-Up Questions

- How would you detect, after the fact, that a "run every sync" Job had accidentally been given content-hash naming and silently stopped running?
- Could a single Job need both behaviors depending on context — and if so, how would you handle that?
- How would you test that a newly-written sync hook actually has the intended re-execution behavior before relying on it in production?

## References

- [Argo CD: Resource hooks](https://argo-cd.readthedocs.io/en/stable/user-guide/resource_hooks/)
- [Kubernetes Docs: Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
