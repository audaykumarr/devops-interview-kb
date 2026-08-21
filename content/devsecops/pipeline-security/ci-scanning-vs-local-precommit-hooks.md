---
id: devsecops-pipeline-security-ci-scan-vs-precommit-hook-001
title: "What's the trade-off between running security scans as a separate CI job versus as a local pre-commit/pre-push hook?"
category: devsecops
subcategory: pipeline-security
technologies:
  - devsecops
difficulty: intermediate
question_type:
  - comparison
tags:
  - devsecops
  - pre-commit
  - ci-cd
estimated_time_minutes: 6
companies: []
related_questions:
  - devsecops-pipeline-security-scanning-without-slowdown-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Security scans (secrets scanning especially) can run as a CI job on every PR, or as a local pre-commit/pre-push hook on a developer's machine before code ever leaves it. What's the actual trade-off between these two placements?

## Short Answer

A local pre-commit/pre-push hook catches problems earliest — before a secret or vulnerable pattern ever leaves the developer's machine, which matters enormously for secrets specifically, since a secret pushed to a remote repository (even briefly, even if later removed) should generally be treated as compromised and rotated. CI-based scanning is centrally enforced and can't be bypassed or skipped locally, but by the time it runs, the code has already left the developer's machine — for secrets, that's already the damage done. The two aren't mutually exclusive: local hooks provide the earliest, fastest feedback loop; CI scanning provides the guaranteed, unbypassable backstop.

## Detailed Explanation

**Local pre-commit/pre-push hooks** run entirely on the developer's own machine before anything is pushed. For secrets scanning specifically, this timing matters enormously: once a secret is pushed to a remote repository — even to a private repo, even if the commit is later force-removed — the standard security posture is to treat it as compromised and rotate it, because it may have been cached, mirrored, or briefly visible to CI systems, other collaborators, or automated scanning tools before removal. A pre-commit hook that catches the secret before the `git push` ever happens avoids this problem entirely, rather than catching it after the fact and then needing rotation anyway. The trade-off: local hooks are inherently bypassable (`git commit --no-verify` skips them entirely) and only run on developer machines that actually have the hook installed and configured — there's no central enforcement guarantee.

**CI-based scanning** runs centrally, on infrastructure the team controls, and can't be skipped by an individual developer's local configuration or a `--no-verify` flag — it's the enforcement backstop that guarantees the check actually happens regardless of what any individual developer's local setup does or doesn't have installed. The trade-off is timing: by the time CI runs, the code (and any secret in it) has already left the developer's machine and reached the remote repository, meaning the "treat it as compromised" problem for secrets has already occurred even if CI catches and blocks the PR from merging.

The practical answer: use both, for complementary reasons. Pre-commit hooks give the fastest, earliest feedback (and for secrets specifically, prevent exposure in the first place rather than just catching it after) — but since they're bypassable and not universally installed, they can't be the *only* line of defense. CI-based scanning provides the guaranteed, centrally-enforced backstop that catches anything a bypassed or missing local hook let through, ensuring the check happens regardless of any individual developer's local environment. Neither replaces the other; they cover different failure modes.

## Key Takeaways

- Pre-commit/pre-push hooks catch problems before code leaves the developer's machine — critical for secrets, since a pushed secret should generally be treated as compromised even if later removed.
- Local hooks are bypassable (`--no-verify`) and depend on being installed on every developer's machine — no central enforcement guarantee.
- CI-based scanning is centrally enforced and unbypassable, but by the time it runs, the code (and any secret) has already left the developer's machine.
- The two are complementary, not competing — local hooks for earliest feedback and secret-exposure prevention, CI as the guaranteed backstop.

## Interview Follow-Up Questions

- How would you handle a developer who habitually uses `--no-verify` to bypass local hooks under deadline pressure?
- What would you do differently for secrets scanning specifically, given the "already compromised once pushed" consideration, versus SAST findings which don't carry that same urgency?
- How would you roll out pre-commit hooks across an organization without it becoming a friction point developers actively resent?

## References

- [pre-commit: A framework for managing git hooks](https://pre-commit.com/)
- [GitHub: About secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
