---
id: aws-devops-interview-guide
title: "AWS DevOps Interview Guide"
description: "A focused path through AWS interview prep — IAM least privilege, Lambda reliability, and S3 security, the three areas this question bank goes genuinely deep on."
guide_type: interview
category: aws
categories:
  - aws
technologies:
  - aws
  - iam
  - lambda
  - s3
  - cloudwatch
interview_levels:
  - devops-engineer
  - senior-devops
  - cloud-engineer
  - devsecops
  - staff-principal
estimated_reading_minutes: 10
featured_questions:
  - aws-iam-least-privilege-migration-001
  - aws-iam-safe-rotation-overlap-window-001
  - aws-lambda-timeout-troubleshooting-001
  - aws-lambda-provisioned-concurrency-cost-latency-tradeoff-001
  - aws-lambda-idempotency-key-design-payments-001
  - aws-s3-public-bucket-exposure-001
  - aws-s3-block-public-access-vs-bucket-policy-001
  - aws-s3-public-exposure-fast-alerting-design-001
related_guides:
  - kubernetes-interview-guide
related_technologies:
  - terraform
  - cloud-architecture
  - github-actions
status: published
last_reviewed: 2026-08-23
last_updated: 2026-08-23
---

## Introduction

This guide is honest about what it is: a deep, scenario-driven path through three specific AWS domains — IAM, Lambda, and S3 — not a broad tour of every AWS service. That's not a limitation to apologize for. Interviewers rarely ask candidates to recite service lists; they ask candidates to reason through a specific, realistic production situation, and this bank's 39 questions are all built that way. Working through them well will teach you far more about how to *think* in an AWS interview than a shallower pass across twenty services ever would.

Concretely, this guide covers: IAM least-privilege design and credential lifecycle (the identity layer underneath everything else you do in AWS), Lambda reliability and performance (cold starts, concurrency, idempotency — the operational reality of serverless compute), and S3 exposure incident response (arguably the single most common real-world AWS security incident, and one this bank treats with real depth). If your interview also needs VPC networking, RDS, ECS/EKS, or CI/CD-specific AWS content, this guide will point you to the adjacent, AWS-tagged material that exists elsewhere in the bank rather than pretend it lives here.

## Who This Guide Is For

This guide assumes you already operate AWS day to day — it is **not** an AWS fundamentals or "getting started" guide, and it says so plainly rather than quietly failing to deliver on that promise. There are zero beginner-difficulty questions in this bank; the floor is intermediate, and most of it is advanced.

It's most directly useful for **DevOps Engineers**, **Senior DevOps Engineers**, and **Cloud Engineers** preparing for a role where AWS is a serious, daily responsibility — the three interview levels this specific bank actually covers in depth. **DevSecOps** engineers will find real value in the IAM and S3 security content specifically (both subcategories carry meaningful security-type coverage). If you're preparing for an **SRE** or **Platform Engineering** interview, the Lambda reliability questions (cold starts, retries, idempotency, tail latency) are directly relevant even though this bank doesn't yet have dedicated SRE-tagged AWS content — treat that overlap as a bonus, not the guide's core promise. This is not currently a strong fit for a junior/entry-level AWS interview; if that's you, build hands-on AWS familiarity first and come back once you're being asked "why," not just "what."

## Prerequisites

Before working through this guide, you should already be comfortable with:

- Core AWS concepts: what IAM, S3, and Lambda each actually are, and basic familiarity with the AWS CLI or console.
- The general shape of a least-privilege access model (even if you haven't designed one yourself yet).
- Basic serverless/event-driven concepts — what "cold start" means at a high level, roughly how a managed compute service like Lambda differs from a server you provision yourself.
- General incident-response instincts (contain, investigate, remediate, prevent) — this bank's S3 questions assume you can follow that structure, not that you already know AWS-specific containment tools.

If any of these are shaky, that's a signal to get hands-on AWS experience first — this guide sharpens interview reasoning on top of operational familiarity, it doesn't build that familiarity from zero.

## Learning / Interview Path

Three stages, each deliberately deep rather than broad. Work through them in this order — later stages assume the reasoning built in earlier ones.

1. **IAM (13 questions).** Start here because everything else in AWS sits on top of identity and access. This bank's IAM questions are almost entirely about the *lifecycle* of least privilege in a real organization: migrating a workload off a static access key, designing a credential rotation process with a safe overlap window, auditing whether a role's granted permissions actually match what it uses, and handling the genuinely hard cases (a third-party app that can't use a role, an SCP exception process). Interviewers use IAM to test judgment under real constraints, not policy-JSON syntax — that's exactly what this section trains.

2. **Lambda (13 questions).** Once identity is solid, move to compute reliability. This bank's Lambda questions cluster around a few recurring, genuinely hard problems: diagnosing intermittent timeouts, distinguishing cold-start latency from a slow downstream dependency using CloudWatch metrics alone, the Provisioned Concurrency cost/latency trade-off (and how it differs from SnapStart), and idempotency design for a function that might legitimately run twice. These are the questions that separate "I've used Lambda" from "I've operated Lambda in production under real traffic."

3. **S3 (13 questions).** Public-write or public-read S3 exposure is one of the most common real-world AWS security incidents, and this bank treats it as a full incident-response arc rather than a single question: detection, containment (Block Public Access vs. a bucket policy — a distinction interviewers specifically probe), reconstructing what changed without versioning enabled, and designing alerting that catches the next one in minutes instead of via an external scanner. Doing this stage last means you bring the least-privilege thinking from stage 1 directly into how you reason about exposure and blast radius here.

## Key Concepts

A handful of ideas recur across all three areas — if you can explain each precisely, you're well prepared for most of what follows:

- **Least privilege is a process, not a policy document.** The hard part isn't writing a scoped IAM policy once — it's auditing whether a role's *actual* usage matches its granted permissions over time, safely rotating credentials without an outage, and handling the real exceptions (a legacy app, a break-glass process) without quietly reintroducing broad access.
- **AWS Block Public Access is a distinct, stronger containment mechanism than a bucket policy.** A bucket policy can still be misconfigured to allow public access; Block Public Access is an account/bucket-level override that blocks public access regardless of what any policy or ACL says. Interviewers use this distinction to check whether you actually understand AWS's own defense-in-depth model, not just "S3 buckets can be public."
- **A cold start and a slow downstream dependency produce similar-looking symptoms but need entirely different fixes.** CloudWatch's `InitDuration` metric is the direct signal that separates them — conflating the two is a common, costly misdiagnosis this bank specifically trains you out of.
- **Provisioned Concurrency, SnapStart, and simply raising the timeout are three different trade-offs, not interchangeable fixes.** Each has a different cost/latency/complexity profile; picking correctly (and explaining why) is exactly what a senior-level Lambda question is testing.
- **Without S3 versioning or access logging enabled *before* an incident, some questions about "what changed" are genuinely unanswerable after the fact.** Recognizing and stating that limitation honestly is itself a strong interview signal — better than confidently guessing.

## Interview Focus

What AWS interviewers are actually evaluating shifts with seniority, even when the surface topic looks the same:

- **DevOps Engineer:** Do you understand what each service does and can you operate it correctly day to day — configure an IAM policy correctly, diagnose a straightforward Lambda timeout, recognize an obviously public S3 bucket as a problem?
- **Senior DevOps / Cloud Engineer:** Can you reason about *why*, under real production constraints? This is where "rotate the credential" needs to become "here's how I'd design the rotation with a safe overlap window so nothing breaks mid-rotation," and "block the bucket" needs to become "here's the difference between Block Public Access and a policy fix, and why I'd reach for the first one during containment."
- **DevSecOps:** Expect more weight on the security mechanics specifically — CloudTrail-based detection, the actual blast radius of a given misconfiguration, and prevention design (SCPs, automated scanning) rather than just incident response after the fact.
- **Staff / Principal:** The two expert-tier questions in this bank (an EKS pod-identity comparison, and scaling S3 exposure alerting across hundreds of accounts) are both about designing a mechanism that works at organizational scale, not fixing one instance of a problem — that's the altitude staff-level AWS questions operate at.

Across every level, the strongest answers name the actual AWS mechanism — "CloudTrail data events," "Block Public Access," "`InitDuration`" — rather than describing the idea in the abstract.

## Practice Questions

The list below is generated live from the current AWS question bank — nothing here is a fixed list that goes stale as new questions are added. Start with **Must Practice** for a fast cross-section of all three areas, then use the subcategory, difficulty, and interview-level groupings to focus your remaining time.

## Scenario & Troubleshooting Focus

AWS troubleshooting questions rarely stay inside one service. A Lambda timeout might be a cold start, a slow downstream call, or a throttled dependency — you can't tell which without checking specific CloudWatch fields. An S3 exposure incident isn't "fix the bucket," it's contain (Block Public Access), investigate (CloudTrail or access logs, if they were enabled *before* the incident), and only then remediate — and the correct sequence itself is part of what's being evaluated, not just the eventual fix.

The full set of AWS troubleshooting questions is at [AWS Troubleshooting Questions](/type/troubleshooting?category=aws), and the open-ended, judgment-heavy scenario questions are at [AWS Scenario Questions](/type/scenario?category=aws). When practicing these, write down what you'd check first and why — specifically, which CloudWatch metric, which CloudTrail event, which AWS API call — before reading the question's own investigation steps. Producing that reasoning yourself is a different skill than recognizing it as correct once shown, and it's the one interviews actually test.

## Common Mistakes

- **Treating IAM as a one-time setup instead of an ongoing process.** A policy that was correctly scoped at creation time drifts as the workload changes; this bank's IAM questions are almost entirely about that drift — auditing actual usage, safe rotation, handling exceptions — not initial policy authoring.
- **Confusing "the bucket policy looks fine" with "the bucket is actually not public."** Legacy ACLs, account-level settings, and Block Public Access all interact — a candidate who checks only the bucket policy and declares victory is missing exactly the mechanism this bank's S3 questions are built to test.
- **Diagnosing Lambda latency by guessing instead of checking `InitDuration`.** "It's probably a cold start" is a hypothesis, not a diagnosis — strong answers say what they'd check to confirm it before proposing a fix.
- **Reaching for Provisioned Concurrency (or any fix) without naming its actual cost.** Every Lambda performance fix in this bank has a real trade-off attached; an answer that doesn't mention cost, complexity, or a limitation reads as incomplete at senior level.
- **Confusing durability with availability.** S3's eleven-nines durability claim says nothing about whether an object is currently reachable — conflating the two is a common, specific AWS misconception worth deliberately unlearning before an interview.
- **Proposing an elaborate architecture when the actual fix is a specific, existing AWS control.** Several questions in this bank have a surprisingly simple correct answer (enable Block Public Access; check one specific metric) — overcomplicating the response reads as not knowing the direct tool, not as sophistication.

## Recommended Preparation Path

This bank is small enough (39 questions) that an artificial multi-week schedule would be filler. A more honest plan:

1. **First session:** The eight Must Practice questions below — a genuine cross-section of all three areas and most question types, doable in well under two hours.
2. **Second session:** Pick whichever of IAM, Lambda, or S3 felt weakest during Must Practice, and work through that subcategory's remaining questions in full.
3. **Third session:** The other two subcategories, in the Learning Path order above.
4. **Before the interview:** Revisit the Common Mistakes list above and the troubleshooting/scenario links — these are the highest-density signal for how AWS interviewers actually probe, independent of which specific questions come up.

## Related Guides

If your interview also covers Kubernetes, the Kubernetes Interview Guide is a natural companion — many teams running AWS also run EKS. More guides — Terraform, GCP, Azure, and a general DevOps guide — are in progress and will be cross-linked here once published.

## References

- [AWS IAM: Security best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Lambda: Understanding Lambda function scaling](https://docs.aws.amazon.com/lambda/latest/dg/invocation-scaling.html)
- [AWS S3: Blocking public access to your Amazon S3 storage](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html)
