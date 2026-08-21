---
id: security-secrets-management-leaked-credential-response-001
title: "A developer just committed a live database password directly into a public GitHub repository. It's been merged and pushed. What do you do, in order?"
category: security
subcategory: secrets-management
technologies:
  - security
  - github
difficulty: advanced
question_type:
  - troubleshooting
  - security
  - scenario
tags:
  - secrets-management
  - incident-response
  - credential-rotation
  - github
estimated_time_minutes: 10
companies: []
related_questions:
  - github-actions-security-oidc-migration-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A developer just committed a live database password directly into a public GitHub repository. It's already been merged to `main` and pushed. What do you do, in order?

## Short Answer

Rotate the credential first, before doing anything else — deleting the commit or the file doesn't un-expose a secret that's already public, and the moment it was pushed to a public repo you have to assume it's compromised, since it can be scraped in seconds by automated bots that watch public GitHub pushes. Only after rotation do you worry about cleaning history, since removing it from Git history is about hygiene and future scanning noise, not actual containment.

## Detailed Explanation

The core mistake in responding to a leaked secret is treating it like a data-privacy problem (where you'd rush to delete/hide it) instead of a compromised-credential problem (where deleting it from view does nothing about the fact that it's already been seen). Public GitHub repositories are actively scanned by both defenders (GitHub's own secret scanning) and attackers (automated scrapers specifically looking for exactly this pattern) within seconds to minutes of a push — by the time you've noticed and started responding, you should already assume the credential is known to someone who shouldn't have it, regardless of how quickly you act afterward.

That's why rotation comes first: change the database password (or better, if the architecture allows it, replace static password auth with a non-static mechanism like IAM database authentication or short-lived tokens) so the leaked value is worthless the moment it's rotated, independent of whether it's still sitting in Git history somewhere. Only once the live credential is no longer valid does the order of operations stop being urgent — everything else is important but not time-critical in the same way.

Cleaning the leaked value out of Git history (via `git filter-repo`, BFG Repo-Cleaner, or GitHub's own secret-removal tooling) is still worth doing, both to stop the same value from continuously tripping secret scanners and to remove it from anyone's future casual access to the repo's history — but it's meaningfully lower priority than rotation, and history-rewriting on a shared branch has its own risks (breaking other people's local clones, requiring a coordinated force-push) that shouldn't be rushed ahead of the actual containment step.

## Symptoms

- A secret-scanning alert (GitHub's native scanning, or a third-party tool) flags a credential pattern in a commit.
- Or, more concerning: the credential's actual use shows unexpected activity (unfamiliar connections, unexpected data access) before anyone noticed the leaked commit at all.

## Possible Causes

- A developer hardcoded a credential directly in application code or a config file instead of using a secrets manager or environment variable injected at runtime.
- A `.env` file or similar wasn't actually excluded by `.gitignore` (or was force-added despite it), and got committed along with legitimate changes.
- A credential was pasted into a commit message, PR description, or code comment rather than the file content itself — still fully exposed, but easy to miss when scanning only file diffs.

## Investigation Steps

1. Confirm exactly which credential was exposed and what it grants access to (read-only, admin, which systems).
2. Check whether the credential has already been used from an unfamiliar source (database connection logs, cloud provider access logs) since the commit was pushed.
3. Determine how long the repository has been public and how long the secret has actually been exposed, since a repo made public recently versus one long-public changes the urgency but not the rotate-first order of operations.
4. Identify every place the credential might be reused (the same DB password on a staging environment too? the same pattern hardcoded elsewhere?), since leaked-credential incidents often reveal a broader pattern, not a one-off mistake.

## Commands

```bash
# Confirm exactly which commit(s) contain the secret
git log -p --all -S 'the-leaked-value' -- .

# After rotation, remove the secret from history (coordinate a force-push first)
git filter-repo --path path/to/file --invert-paths
# or, for a single sensitive string across history:
git filter-repo --replace-text <(echo 'the-leaked-value==>REMOVED')
```

## Resolution

1. **Rotate the credential immediately** — this is the actual containment step; nothing else matters until this is done.
2. **Assess for misuse** — check logs for the affected system for any access from unfamiliar sources during the exposure window.
3. **Remove the secret from Git history** — via `git filter-repo`, BFG Repo-Cleaner, or GitHub's secret-removal support, then coordinate a force-push and have collaborators re-clone (rewriting shared history has real coordination cost, which is why it comes after rotation, not before).
4. **Fix the root cause** — move the credential to a proper secrets manager (AWS Secrets Manager, HashiCorp Vault, GitHub Actions secrets, etc.) or, better, eliminate the static credential entirely in favor of short-lived, identity-based auth where the architecture allows it.

## Prevention

- Enable secret scanning (GitHub's native feature, or a pre-commit hook using a tool like `gitleaks` or `trufflehog`) so this is caught before merge, not after a public push.
- Add a pre-commit or pre-push hook that blocks common secret patterns locally, catching the mistake before it ever reaches a shared branch.
- Default new services to short-lived, identity-based credentials (IAM roles, OIDC-issued tokens, database IAM auth) instead of long-lived static passwords wherever the platform supports it — a credential that can't be meaningfully "leaked" in a reusable way is a stronger fix than catching leaks faster.
- Treat any `.env`, credentials file, or similar as excluded by default in a repository's `.gitignore` template, applied at repo-creation time rather than added reactively.

## Interview Follow-Up Questions

- How would your response differ if the repository were private rather than public?
- What's the tradeoff between rewriting Git history to remove a secret versus simply rotating it and leaving the (now-worthless) value in history?
- How would you design credential architecture so that a hardcoded secret, if it happens again, has a much smaller blast radius?

## Key Takeaways

- Rotate first — deleting or hiding an already-public secret doesn't undo the exposure; assume it's compromised the moment it's pushed publicly.
- History-rewriting to remove the secret is real hygiene work, but it's lower priority and higher-coordination-cost than rotation, so it comes second.
- A leaked credential is often a symptom of a pattern (hardcoding, missing `.gitignore` entries) worth auditing for elsewhere, not just a one-off mistake.
- The strongest long-term fix is eliminating static, reusable credentials in favor of short-lived, identity-based auth wherever possible.

## References

- [GitHub Docs: About secret scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [GitHub Docs: Removing sensitive data from a repository](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [OWASP: Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
