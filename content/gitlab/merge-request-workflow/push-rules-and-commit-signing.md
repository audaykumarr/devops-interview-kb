---
id: gitlab-merge-request-workflow-push-rules-signing-001
title: "A compliance requirement mandates that every commit merged into a regulated project be cryptographically signed and traceable to a verified author. How would you enforce this in GitLab?"
category: gitlab
subcategory: merge-request-workflow
technologies:
  - gitlab-ci
difficulty: advanced
question_type:
  - security
  - practical
tags:
  - gitlab
  - commit-signing
  - compliance
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A compliance requirement for a regulated project mandates that every commit merged into it be cryptographically signed and traceable to a verified, known author — protecting against commits being attributed to someone who didn't actually author them. How would you enforce this in GitLab, and what does "traceable to a verified author" actually require mechanically?

## Short Answer

Enable GitLab's push rules to reject unsigned commits (`Reject unsigned commits` under project push rules), which blocks any push containing a commit without a valid GPG or SSH signature — combined with each contributor registering their actual public key with their GitLab account, so a signature not only proves the commit wasn't tampered with, but also verifiably ties it to a specific, known GitLab user rather than just any arbitrary key.

## Detailed Explanation

The compliance requirement has two distinct components worth separating: cryptographic integrity (the commit content hasn't been altered after signing) and verified authorship (the signature is tied to a specific, known, real person) — GitLab's push rules and key registration together address both, but it's worth understanding they're solving related but genuinely different problems.

## Requirements

- Every commit reaching the protected branch must carry a valid cryptographic signature.
- Each signature must be verifiably tied to a specific, registered contributor's identity, not just any arbitrary key.
- The enforcement must be a genuine gate, not an optional convention that can be silently bypassed.

## Architecture

**Push rules configured to reject unsigned commits enforce the requirement structurally**: GitLab's project (or group-level, for consistency across many projects) push rules include a "Reject unsigned commits" option — once enabled, any push containing a commit without a valid signature is rejected outright at the push, not just flagged after the fact, meaning an unsigned commit structurally cannot reach the repository at all.

**Each contributor must register their actual public key (GPG or SSH) with their GitLab account**: a commit signed with a key GitLab doesn't recognize as belonging to a specific user shows as "Unverified" rather than genuinely confirming authorship — for the "traceable to a verified author" requirement to actually hold, every contributor needs to have their public key registered in their GitLab profile settings, which is what lets GitLab display a commit as verifiably signed by that specific person, not just signed by an anonymous key.

**GPG signing versus SSH signing both satisfy this, with different setup ergonomics**: GitLab supports commit verification via either GPG keys (the traditional approach) or SSH keys (a more recently added, often simpler option for teams already managing SSH keys for Git access) — either provides the same fundamental verification property; the choice is largely about which key management workflow is less friction for your specific team's existing tooling.

**Combine with protected branch settings requiring this specifically for the regulated branch**: push rules can be scoped project-wide, but pairing this with protected branch configuration ensures the signing requirement specifically applies to the branches under compliance scope, and that force-pushes or other bypasses of normal push flow don't circumvent it.

**Audit and reporting for compliance evidence**: beyond just enforcing the rule going forward, a compliance requirement typically also needs auditable evidence — GitLab's commit history UI shows verification status per commit, and this can be queried via the API for building compliance reports demonstrating the policy has actually been in effect and enforced over a given period, not just configured at some point.

## Trade-offs

Enforcing signed commits requires every contributor to actually set up commit signing correctly (generating/registering a key, configuring their local Git client to sign by default) — genuine onboarding friction, especially for contributors unfamiliar with the process, and a push containing even one unsigned commit (perhaps from an old, un-configured local clone) is rejected entirely, which can be a confusing initial experience without clear guidance provided alongside the requirement.

## Key Takeaways

- GitLab push rules can reject unsigned commits outright at push time, making signature enforcement a structural gate rather than an optional convention.
- Cryptographic signing alone (a valid signature) is distinct from verified authorship (the signature tied to a known, registered person) — both require the contributor's public key to be registered with their GitLab account.
- GPG and SSH signing both satisfy the underlying requirement; the choice is mainly about which fits your team's existing key management workflow with less friction.
- Combine push rules with protected branch scoping and audit reporting for genuine compliance evidence, not just point-in-time configuration.

## Interview Follow-Up Questions

- How would you handle onboarding new contributors to commit signing with minimal friction, given the setup burden it adds?
- How would you generate an audit report demonstrating this policy's enforcement over a specific compliance period?
- What's the risk if a contributor's private signing key is compromised, and how would you handle revocation and re-verification of their past commits?

## References

- [GitLab Docs: Push rules](https://docs.gitlab.com/ee/user/project/repository/push_rules.html)
- [GitLab Docs: Signed commits](https://docs.gitlab.com/ee/user/project/repository/signed_commits/)
