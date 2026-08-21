---
id: aws-iam-eks-pod-identity-comparison-001
title: "How does the workload-identity comparison extend to EKS, where pod identity is yet another mechanism (IRSA or Pod Identity)?"
category: aws
subcategory: iam
technologies:
  - aws
  - eks
  - kubernetes
difficulty: expert
question_type:
  - comparison
tags:
  - aws
  - iam
  - eks
  - kubernetes
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

EC2 instance profiles, ECS task roles, and Lambda execution roles each deliver AWS credentials differently. EKS adds yet another mechanism — IAM Roles for Service Accounts (IRSA) or the newer EKS Pod Identity. How do these fit into the comparison, and how do they work?

## Short Answer

IRSA uses OIDC federation — the EKS cluster runs an OIDC identity provider, and a Kubernetes ServiceAccount is annotated with an IAM role ARN; when a Pod using that ServiceAccount starts, a mutating webhook injects a projected service account token and environment variables, and the AWS SDK exchanges that Kubernetes-issued OIDC token for temporary AWS credentials via STS `AssumeRoleWithWebIdentity` — similar in spirit to how GitHub Actions' OIDC-to-AWS pattern works. EKS Pod Identity, the newer mechanism, simplifies this by removing the OIDC-token-exchange dance entirely — an EKS-managed agent handles credential vending directly to Pods based on a simpler ServiceAccount-to-IAM-role association, without needing to configure or reason about OIDC federation at all.

## Detailed Explanation

**IRSA (IAM Roles for Service Accounts)**: this was the original mechanism for fine-grained, per-Pod AWS identity in EKS, and it works via OIDC federation — each EKS cluster has its own OIDC issuer URL, registered as an identity provider in IAM. A Kubernetes ServiceAccount gets annotated with `eks.amazonaws.com/role-arn`, and the IAM role's trust policy is scoped to trust that specific OIDC provider and ServiceAccount (similar in structure to the GitHub Actions OIDC trust-policy pattern discussed elsewhere). When a Pod using that ServiceAccount starts, an EKS-managed mutating webhook automatically injects a projected, short-lived Kubernetes service account token as a mounted file, plus environment variables telling the AWS SDK where to find it; the SDK then calls STS `AssumeRoleWithWebIdentity`, presenting that Kubernetes-issued token, to obtain temporary AWS credentials scoped to the IAM role — genuinely per-Pod-identity credentials, following the same underlying "exchange a workload-specific token for AWS credentials" pattern as GitHub Actions OIDC, just with Kubernetes as the token issuer instead of GitHub.

**EKS Pod Identity (the newer, simpler mechanism)**: rather than requiring OIDC federation configuration (registering the cluster's OIDC provider, precise trust-policy conditions referencing OIDC claims), EKS Pod Identity uses an EKS-managed agent (running as a DaemonSet) that intercepts credential requests from Pods and vends temporary credentials directly, based on a simpler association between a Kubernetes ServiceAccount and an IAM role managed through the EKS API itself — removing the need to understand or configure OIDC federation details at all, at the cost of being a newer, EKS-specific mechanism (versus IRSA's foundation on the more general, portable OIDC-federation pattern also used elsewhere, like GitHub Actions).

**How this fits the broader comparison**: EC2 (pull via network-accessible IMDS), ECS (task-scoped metadata endpoint, more granular than EC2's instance-wide IMDS), Lambda (push via pre-populated environment variables, no network call), and now EKS via IRSA (OIDC-token-exchange, network call to STS) or Pod Identity (EKS-agent-mediated vending) — each represents a different point on the trade-off between granularity (how finely scoped is the identity — per-Pod for both EKS mechanisms, similar to ECS's per-task granularity, versus EC2's coarser per-instance granularity) and mechanism complexity (Lambda's simplicity versus IRSA's OIDC-federation setup).

**Practical decision point**: IRSA remains widely used and well-understood, with broader compatibility across EKS versions and tooling; Pod Identity is the newer, simpler-to-configure option AWS is pushing as the modern default for new clusters, trading some of IRSA's OIDC-federation generality for EKS-specific operational simplicity.

## Key Takeaways

- IRSA uses OIDC federation — a Kubernetes-issued token exchanged via STS `AssumeRoleWithWebIdentity` for temporary AWS credentials, following the same underlying pattern as GitHub Actions OIDC.
- EKS Pod Identity simplifies this via an EKS-managed agent vending credentials directly, without needing OIDC federation configuration.
- Both provide per-Pod-scoped identity, similar in granularity to ECS's per-task roles, more granular than EC2's per-instance IMDS.
- The choice between IRSA and Pod Identity trades OIDC-federation generality/maturity against EKS-specific operational simplicity.

## Interview Follow-Up Questions

- How would you migrate an existing IRSA-based EKS setup to Pod Identity, and what would change in the trust policy configuration?
- Why does IRSA's OIDC-based pattern generalize to other identity providers (GitHub Actions, GitLab CI) while Pod Identity is EKS-specific?
- What's the security implication of a compromised Pod being able to assume its ServiceAccount's associated role under either mechanism?

## References

- [AWS: IAM roles for service accounts](https://docs.aws.amazon.com/eks/latest/userguide/iam-roles-for-service-accounts.html)
- [AWS: EKS Pod Identity](https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html)
