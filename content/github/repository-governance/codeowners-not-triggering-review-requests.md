---
id: github-repository-governance-codeowners-not-triggering-001
title: "A CODEOWNERS file lists a team as owner of a directory, but PRs touching that directory aren't automatically requesting review from that team. What's likely misconfigured?"
category: github
subcategory: repository-governance
technologies:
  - github
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - github
  - codeowners
  - code-review
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A `CODEOWNERS` file lists `@my-org/platform-team` as the owner of `/infra/`, expecting every PR touching that directory to automatically request review from that team. Some PRs get the automatic review request correctly, but others touching the same directory don't. What's likely misconfigured?

## Short Answer

The most common causes are pattern-matching order (CODEOWNERS uses "last matching pattern wins," so a later, broader pattern can silently override an earlier, more specific one) and team visibility/permission requirements (the team must have explicit write access to the repository, and for an organization, its membership visibility affects whether GitHub can actually resolve it as a valid reviewer) — CODEOWNERS matching is stricter and more order-sensitive than it initially appears, and a single misplaced or overly broad pattern later in the file can quietly override the intended ownership for specific files.

## Detailed Explanation

`CODEOWNERS` file matching follows gitignore-style pattern syntax, but with one specific, easy-to-miss rule: when multiple patterns in the file match the same file, the *last* matching pattern in the file takes precedence, not the most specific one and not the first one — this "last match wins" behavior is the source of a lot of confusing, inconsistent-seeming CODEOWNERS behavior.

## Symptoms

- Some PRs touching a directory correctly trigger the expected team's automatic review request; others touching what appears to be the same directory don't.
- The `CODEOWNERS` file appears syntactically correct and the pattern seems to match the affected files.
- The inconsistency doesn't correlate with anything obvious about the specific files, from a casual read of the CODEOWNERS file.

## Possible Causes

- A later, broader pattern in the `CODEOWNERS` file matches the same files and overrides the intended, more specific earlier pattern, due to the "last match wins" rule — a common structural mistake, especially in files that have grown organically with new patterns appended without full awareness of ordering implications.
- The referenced team (`@my-org/platform-team`) doesn't have explicit write access to the repository — GitHub requires the owning team or user to actually have write permission for CODEOWNERS review-request automation to function for them.
- The team (or user) referenced doesn't exist exactly as spelled, or a referenced individual user's GitHub username doesn't match exactly, causing GitHub to silently fail to resolve that entry rather than erroring loudly.
- The `CODEOWNERS` file itself is in the wrong location, or has a syntax issue in an unrelated section that GitHub's parser handles more permissively than expected, leading to partial, inconsistent application.

## Investigation Steps

1. Identify a specific file that failed to trigger the expected review request, and manually trace through the `CODEOWNERS` file top to bottom, checking every pattern that matches that file's path — the *last* matching pattern is the one actually in effect, not the one that looks most relevant.
2. Confirm the referenced team has actual write (or higher) access to the repository via the organization's team/repository permission settings.
3. Verify the exact spelling and format of the team/user reference in `CODEOWNERS` matches GitHub's expected format precisely (`@org/team-name` for teams, `@username` for individuals).
4. Use GitHub's own UI, which shows the resolved code owners for a specific file when viewing it in the repository (or via the PR's "Reviewers" section), to directly confirm what GitHub currently believes owns that file, rather than inferring from the raw CODEOWNERS text alone.

## Resolution

1. **Reorder or make patterns more specific to fix unintended "last match wins" overrides** — moving a more specific pattern below any broader pattern that would otherwise override it, or restructuring the file so intended overrides are explicit and deliberate, not an accidental consequence of file ordering.
2. **Grant the referenced team explicit write access to the repository** if that was the actual gap, since CODEOWNERS automation depends on the code owner already having sufficient permission.
3. **Fix any misspelled or incorrectly formatted team/user references**, verifying against the organization's actual team names and member usernames.
4. **Verify the fix** using GitHub's own "code owners" display for the specific affected file, confirming it now resolves to the intended team before relying on it across the whole repository.

## Prevention

- Document the `CODEOWNERS` file's ordering logic ("last match wins") as a team convention, and structure the file deliberately from broad-to-specific top-to-bottom (or add comments explaining any intentional overrides), rather than letting it grow ad hoc.
- Periodically audit `CODEOWNERS` against actual current team membership and permissions, since org restructuring can silently invalidate previously-correct entries.
- Test new `CODEOWNERS` patterns against representative sample files (using GitHub's own resolved-owners display) before assuming a new pattern works as intended.

## Key Takeaways

- CODEOWNERS uses "last matching pattern wins," not "most specific" or "first match" — a later, broader pattern can silently override an intended earlier, more specific one.
- The referenced team or user must have actual write access to the repository for CODEOWNERS automation to function for them.
- GitHub's own UI shows the resolved code owner for any specific file, which is a far more reliable way to debug this than manually reasoning through the raw pattern file.
- CODEOWNERS misconfigurations are typically silent — no error is raised, the automation just doesn't fire for affected files, making periodic auditing important.

## Interview Follow-Up Questions

- How would you structure a large `CODEOWNERS` file to minimize the risk of accidental "last match wins" overrides as it grows?
- How would you require CODEOWNERS review as a hard gate (not just an automatic request) via branch protection settings?
- How would you audit an entire repository's `CODEOWNERS` file for entries referencing teams or users that no longer exist or lack access?

## References

- [GitHub Docs: About code owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
