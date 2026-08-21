---
id: aws-s3-scaling-alerting-hundreds-of-accounts-001
title: "How would you scale S3 public-exposure alerting for an organization with hundreds of AWS accounts, where per-account Config rules alone don't scale operationally?"
category: aws
subcategory: s3
technologies:
  - aws
difficulty: expert
question_type:
  - architecture
tags:
  - aws
  - s3
  - alerting
  - multi-account
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

Per-account AWS Config rules work fine for a handful of accounts, but managing and monitoring them individually across hundreds of accounts doesn't scale operationally. How would you redesign the exposure-alerting architecture for that scale?

## Short Answer

Centralize both configuration and monitoring: use AWS Organizations' Config conformance packs (or an equivalent centrally-deployed policy) to enforce the same rule set across every account automatically as new accounts are created, and aggregate findings into a single, central security account/dashboard via Config's multi-account aggregation or a centralized EventBridge/Security Hub pipeline — rather than each account being independently configured and independently monitored, which is exactly what stops scaling past a handful of accounts.

## Detailed Explanation

A per-account Config rule setup requires someone to configure and monitor each account individually, which is manageable for a handful of accounts but becomes an unsustainable operational burden at hundreds — new accounts drift out of compliance simply because nobody remembers to set them up, and monitoring compliance means checking each account's console or API individually rather than having one place to look. The fix is to move both the configuration and the monitoring layers from per-account to organization-wide, so neither one requires per-account manual effort.

## Requirements

- New accounts must automatically inherit the exposure-detection configuration without manual per-account setup.
- Findings across all accounts must be visible from one central place, not requiring someone to check each account individually.
- The architecture must scale to hundreds of accounts without proportionally more operational effort per account.

## Architecture

**Conformance packs for automatic, organization-wide rule deployment**: AWS Config conformance packs, deployed at the AWS Organizations level, automatically apply the same set of Config rules (including the S3 public-access rules) to every account in the organization, including new accounts as they're created — removing the need for manual per-account Config rule setup entirely, which is the first scaling bottleneck at high account count.

**AWS Security Hub as the central aggregation layer**: Security Hub aggregates findings (including Config rule non-compliance) from every account in an organization into a single, central "administrator" account's view — giving one dashboard to monitor across the entire organization, rather than needing to check Config compliance status account-by-account.

**EventBridge-based centralized routing for real-time alerting**: rather than relying purely on Security Hub's dashboard (which someone still needs to actively check), an organization-wide EventBridge rule (using EventBridge's own cross-account event bus capability) can route Config compliance-change events from every account directly into a central alerting pipeline — achieving the same fast, event-driven alerting design discussed for a single account, but operating centrally across the whole organization rather than needing to be independently configured per account.

**Account-vending automation includes the alerting setup by default**: if the organization uses an automated account-vending process (a Landing Zone, Control Tower, or custom account-factory tooling) for creating new accounts, baking the conformance pack and EventBridge routing setup into that automated provisioning ensures every new account is covered from the moment it's created, with zero manual steps — the most robust way to guarantee the "automatically inherit configuration" requirement holds at scale, rather than depending on someone remembering to apply it.

**Tag-based routing for team-specific ownership**: at hundreds of accounts, a single central team can't realistically triage every finding across every account's specific context — routing findings to the actual owning team (via account or resource tags feeding into the alert routing logic, similar to the drift-alerting design discussed elsewhere) keeps response times fast despite the central aggregation, rather than bottlenecking everything through one central team regardless of scale.

## Trade-offs

Centralizing via conformance packs and Security Hub requires real upfront setup investment and ongoing administration of the aggregation infrastructure itself — a cost that pays off specifically at the scale where per-account management becomes impractical, but is unnecessary overhead for an organization with just a handful of accounts. Baking alerting setup into automated account-vending is the most robust approach but requires that vending process to already exist or be built — an organization without automated account provisioning would need to build that first, a larger prerequisite investment.

## Key Takeaways

- Conformance packs deployed at the AWS Organizations level automatically apply Config rules to every account, including new ones, removing manual per-account setup.
- Security Hub aggregates findings across an entire organization into one central dashboard.
- Organization-wide EventBridge routing (via cross-account event buses) achieves fast, event-driven central alerting at scale.
- Baking this setup into automated account-vending guarantees new accounts are covered from creation, and tag-based routing to owning teams keeps response times fast despite central aggregation.

## Interview Follow-Up Questions

- How would you handle an account that was created before the automated vending process existed, and doesn't yet have the conformance pack applied?
- What's the cost and complexity trade-off of Security Hub versus building a fully custom aggregation pipeline?
- How would you test that the entire pipeline (new account → conformance pack applied → finding generated → routed to the right team) actually works end to end?

## References

- [AWS Config: Conformance packs](https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html)
- [AWS Security Hub: Documentation](https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html)
- [AWS: Multi-Region multi-account monitoring with Amazon EventBridge](https://aws.amazon.com/blogs/mt/how-to-monitor-and-visualize-failed-ssh-access-attempts-to-amazon-ec2-linux-instances/)
