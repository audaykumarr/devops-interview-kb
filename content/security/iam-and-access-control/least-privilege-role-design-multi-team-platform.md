---
id: security-iam-and-access-control-least-privilege-multi-team-001
title: "You're designing the IAM/role structure for a shared platform used by 12 different teams. How do you avoid both 'everyone is admin' and a role-request bottleneck that blocks every team on you?"
category: security
subcategory: iam-and-access-control
technologies:
  - security
difficulty: advanced
question_type:
  - architecture
tags:
  - iam
  - least-privilege
  - rbac
  - platform-engineering
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You're designing the IAM/role structure for a shared internal platform used by 12 different teams. Grant everyone broad access and you have no real least-privilege boundary; route every permission change through a central security team and you become the bottleneck blocking every team's daily work. How do you design a structure that avoids both failure modes?

## Short Answer

Separate the two things people conflate: a fixed, small set of centrally-owned role *definitions* (what permissions a role grants) versus a self-service, team-owned process for *assigning* those roles to specific people or workloads within their own team's namespace or account boundary. Central ownership stays on the part that actually needs consistency and audit rigor (what a "deployer" role can do); day-to-day assignment — who on the platform team is a deployer this sprint — is delegated to each team, so no one has to file a ticket to onboard a new engineer.

## Detailed Explanation

The bottleneck failure mode almost always comes from conflating "who defines what a role can do" with "who decides which specific person gets that role" into a single centrally-gated process — when both go through the same queue, routine onboarding (assigning an existing role to a new team member) waits behind the same review as genuinely risky changes (creating a new role or widening an existing one's permissions). Splitting those two decisions onto different cadences and different owners is what removes the bottleneck without giving up the least-privilege boundary.

## Requirements

- No team should be blocked on a central team for routine, low-risk access changes (onboarding a new engineer to an existing role).
- Genuinely risky changes (new role definitions, permission widening) should still go through a real review.
- Every team's access should be scoped to its own resources by default, not the platform's full resource set.

## Architecture

**Centrally-owned role definitions, team-owned role assignment**: security or platform-engineering owns a small, deliberately curated set of role definitions (`deployer`, `read-only-viewer`, `on-call-responder`, etc.) — each precisely scoped to what that function actually needs. Each team then self-serves assigning those existing roles to their own people, through their own IAM group or namespace boundary, without needing central approval for the routine case.

**Resource-level scoping baked into the role, not the assignment**: a `deployer` role for Team A is scoped (via resource tags, namespace, or account boundary) so that assigning it within Team A's boundary can never reach Team B's resources — the scoping is structural, enforced by the platform, rather than relying on people remembering not to over-assign.

**A narrow, fast-tracked path for genuinely new access needs**: when a team needs something outside the existing role set, that's the one case that should route through central review — but because it's now a small minority of requests (new capability, not routine onboarding), the review queue stays short and central reviewers can actually give it real attention instead of rubber-stamping high volume.

**Periodic access review as the safety net, not the gate**: rather than gating every assignment upfront, a lighter-touch periodic review (quarterly, automated where possible) catches accumulated drift — people who changed teams and kept old access, roles that grew unused permissions over time — without slowing down day-to-day onboarding.

## Trade-offs

Delegating assignment to teams means trusting team leads to self-serve responsibly, which requires the underlying role definitions to be genuinely narrow — this model breaks down if role definitions themselves are too broad, since a team self-assigning a role that's secretly over-permissioned reintroduces the "everyone is admin" problem through a different door. It also requires investment in the platform-level scoping mechanism (namespaces, tagging, account boundaries) upfront, which is real work compared to just handing out one broad role to everyone.

## Key Takeaways

- Separate "who defines what a role can do" (centrally owned, low-frequency) from "who gets an existing role" (team-owned, high-frequency, self-service) — conflating them creates the bottleneck.
- Bake resource-level scoping into the role definition itself so self-service assignment can't cross team boundaries, rather than relying on manual discipline.
- Central review should be reserved for genuinely new access needs, not routine onboarding, so the review queue stays fast and meaningful.
- Use periodic access review as a drift-catching safety net rather than an upfront gate on every assignment.

## Interview Follow-Up Questions

- How would you detect a team quietly working around this system by requesting an overly broad custom role instead of using the existing set?
- How would this model change for a regulated environment where every access grant needs an audit trail with individual sign-off?
- What early warning signs would tell you the role definitions themselves have grown too broad over time?

## References

- [AWS: IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [NIST: Guide to Attribute Based Access Control](https://csrc.nist.gov/pubs/sp/800/162/final)
