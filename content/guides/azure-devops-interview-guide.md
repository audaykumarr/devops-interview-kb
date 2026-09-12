---
id: azure-devops-interview-guide
title: "Azure DevOps Interview Guide"
description: "A focused path through Azure interview prep — identity/networking, compute, storage, and AKS, the four areas this question bank goes deep on."
guide_type: interview
category: azure
categories:
  - azure
technologies:
  - azure
  - aks
  - app-service
  - azure-functions
  - blob-storage
  - key-vault
  - kubernetes
interview_levels:
  - junior-devops
  - devops-engineer
  - senior-devops
  - cloud-engineer
  - devsecops
  - staff-principal
estimated_reading_minutes: 10
featured_questions:
  - azure-identity-networking-service-principal-secret-expiration-001
  - azure-identity-networking-conditional-access-blocking-cicd-001
  - azure-compute-scale-out-session-state-loss-001
  - azure-compute-app-service-private-endpoint-breaks-call-001
  - azure-storage-blob-access-tier-selection-001
  - azure-storage-archive-rehydration-urgent-access-001
  - azure-aks-azure-rbac-for-kubernetes-authorization-001
  - azure-aks-autoscaler-not-scaling-001
related_guides:
  - kubernetes-interview-guide
related_technologies:
  - cloud-architecture
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Introduction

This guide covers exactly what this bank's 34 Azure questions actually go deep on: Identity & Networking (managed identities, RBAC, Key Vault, private connectivity — the access layer everything else in Azure sits on top of), Compute (App Service and Azure Functions — deployment behavior, scaling, production troubleshooting), Storage (Blob Storage — access tiers, redundancy, security, and recovery), and AKS (Azure's managed Kubernetes — networking, identity integration, and production incidents specific to running Kubernetes on Azure). That's a deliberately concentrated set of four areas rather than a tour of every Azure service, matched to the same scenario-driven depth as this site's AWS and GCP coverage.

If your interview also needs Azure DevOps Pipelines specifically, Azure Monitor/Log Analytics as a standalone topic, or services outside these four areas, this guide will say so plainly rather than pretend that content lives here. What it does cover, it covers the way a real Azure interview actually probes: not "what is a managed identity," but "an App Service using managed identity to call a downstream storage account just started failing after a Private Endpoint was added — why, given identity wasn't touched?"

## Who This Guide Is For

This guide assumes you already operate Azure day to day — the floor is intermediate, and the large majority of the bank (32 of 34 questions) is intermediate or advanced. Unlike this site's AWS bank, there is one genuine beginner-difficulty question (Blob Storage access tiers) and one genuine expert-difficulty question (Key Vault zero-downtime rotation design), so the curve isn't quite as flat as "no fundamentals, no extremes" — but don't mistake that for a gentle guide overall.

It's most directly useful for **DevOps Engineers**, **Senior DevOps Engineers**, and **Cloud Engineers** working with Azure as a real, daily responsibility — every single question in this bank counts toward this bank's `cloud-engineer` interview level, since Azure work is cloud-engineering work by definition. **DevSecOps** engineers get real value from the identity, Key Vault, and storage-security content specifically (10 security-typed questions, the same count as troubleshooting-adjacent architecture content). **Staff/Principal** candidates get genuine depth from the Key Vault zero-downtime rotation design question — the bank's sole expert-tier entry, and a genuine system-design problem, not a harder version of a standard question. This is not a strong fit for a from-zero Azure interview; if you've never used the Azure Portal or `az` CLI, build that hands-on familiarity first.

## Prerequisites

Before working through this guide, you should already be comfortable with:

- Core Azure concepts: what a resource group, a managed identity, and an RBAC role assignment each are, and basic familiarity with the Azure Portal or `az` CLI.
- The general shape of least-privilege access (even if you haven't designed one from scratch).
- Basic Kubernetes fundamentals — the AKS section assumes you already know what a pod, a Service, and a Deployment are; it does not re-teach core Kubernetes concepts, only what's genuinely different about running them on Azure.
- General incident-response instincts (contain, investigate, remediate, prevent) — this bank's troubleshooting questions assume you can follow that structure, not that you already know Azure's specific diagnostic tools.

If any of these are shaky, get hands-on Azure experience first — this guide sharpens interview reasoning on top of operational familiarity, it doesn't build that familiarity from zero.

## Learning / Interview Path

Four stages, ordered fundamentals → practical usage → production troubleshooting/architecture, each building on the reasoning from the one before it.

1. **Identity & Networking (10 questions).** Start here for the same reason the AWS and GCP guides start with identity: everything else in Azure sits on top of it. This subcategory's questions span the genuinely Azure-specific mechanics — managed identity vs. service principal, Azure RBAC, Key Vault's dual permission model, Conditional Access, private/service endpoints — and two of AKS's own hardest questions (Workload Identity, Azure RBAC for Kubernetes Authorization) directly assume this material. Skipping this stage means the AKS stage will feel like it's introducing identity concepts from scratch, when it's actually applying them.

2. **Compute (8 questions).** With identity settled, move to actually running things. App Service and Azure Functions questions here are almost entirely about production behavior that only shows up once something is deployed and live: deployment-slot swap gotchas, scale-out session state, Consumption-vs-Premium cost trade-offs, and a networking-meets-identity failure mode (a Private Endpoint breaking a Managed-Identity-authenticated call) that only makes sense once you understand both halves from stage 1.

3. **Storage (7 questions).** Another core resource type, and where this bank's only beginner-difficulty question lives (Blob access tier selection) — a deliberate change of pace before the hardest stage. From there it moves quickly into real production judgment: replication strategy, SAS vs. Managed Identity (which ties directly back to stage 1), soft delete vs. versioning recovery, and immutable storage design for compliance.

4. **AKS (9 questions).** Doing Azure's managed Kubernetes last is deliberate: this subcategory has the highest concentration of advanced-difficulty content in the bank (5 of 9 questions, and zero beginner-difficulty ones), and its two identity-heavy questions — Workload Identity federation and Azure RBAC for Kubernetes Authorization — are genuinely harder to reason about without stage 1's foundation already in place. This is the capstone: applying identity, networking, and production judgment from the first three stages to cluster-level incidents and architecture decisions.

## Key Concepts

A handful of ideas recur across all four areas — if you can explain each precisely, you're well prepared for most of what follows:

- **Identity and network path are two separate concerns that fail independently.** A Managed Identity being correctly configured says nothing about whether the request can physically reach the target resource — a Private Endpoint added to a downstream service can break connectivity while identity stays completely correct, and vice versa.
- **Azure CNI and kubenet make a genuinely different trade-off, not just a naming difference.** Azure CNI gives every pod a real, VNet-routable IP (consuming real address space per node); kubenet conserves address space but routes pod traffic through an extra hop. The choice is effectively locked in at cluster creation.
- **A "deployment slot setting" stays attached to the slot, not the code, during a swap.** This is the single most common cause of "worked in staging, broke immediately after swap" — and it can fail in either direction depending on which slot the sticky setting actually lives on.
- **Soft delete and versioning protect against two different mistakes.** Soft delete recovers a *deleted* blob; versioning recovers an *overwritten* one. Reaching for "undelete" when a blob was overwritten, not deleted, finds nothing to restore.
- **A locked time-based retention policy cannot be shortened — including by the account owner.** That's the entire point of it satisfying a compliance requirement, but it also means getting the duration right before locking matters, since the mechanism is a deliberate one-way door.

## Interview Focus

What Azure interviewers are actually evaluating shifts with seniority, even when the surface topic looks the same:

- **DevOps Engineer:** Do you understand the service correctly and can you operate it day to day — configure a role assignment correctly, recognize why a deployment slot swap needs a sticky-setting check, choose a sensible Blob access tier?
- **Senior DevOps / Cloud Engineer:** Can you reason about trade-offs under real constraints? "Add a Private Endpoint" needs to become "here's specifically what breaks for existing consumers, and why," and "use Managed Identity" needs to become "here's the federation mechanism and exactly what it removes from the pod's credential surface."
- **DevSecOps:** Expect more weight on the security mechanics specifically — Key Vault's RBAC-vs-access-policies model, the trusted-Microsoft-services firewall exception, immutable storage's legal-hold-vs-time-based-retention distinction, Workload Identity's federated trust chain.
- **Staff/Principal:** The bank's sole expert-tier question (designing zero-downtime Key Vault secret rotation for a live, high-traffic application) is about designing a mechanism — an active-refresh strategy plus a credential-overlap window — not fixing one instance of a problem. That's the altitude staff-level Azure questions operate at.

Across every level, the strongest answers name the actual Azure mechanism — "Workload Identity Federation," "trusted Microsoft services exception," "deployment slot setting," "stored access policy" — rather than describing the idea in the abstract or translating loosely from another cloud provider.

## Practice Questions

The list below is generated live from the current Azure question bank — nothing here is a fixed list that goes stale as new questions are added. Start with **Must Practice** for a fast cross-section of all four areas, then use the subcategory, difficulty, and interview-level groupings to focus your remaining time.

## Scenario & Troubleshooting Focus

Azure's troubleshooting questions in this bank (15 of 34, plus 10 architecture and 10 security) cluster around a small number of recurring patterns, and recognizing the pattern is most of the battle:

- **"Identity is fine, but the request still can't get through."** The App Service Private Endpoint question is the sharpest example: Managed Identity's role assignment never changed, but a Private Endpoint added to the downstream storage account removed the App Service's network path to it. The reasoning approach: check network path and DNS resolution *before* assuming an identity regression, since the failure signature (connection error, not auth error) tells you which half broke.
- **"It worked in staging, and broke the instant it became live."** Deployment slot swap failures almost always trace back to a "Deployment slot setting" — a sticky value that stayed with the slot instead of moving with the code. The signal to check: compare the slot-specific flags on both slots' configuration before assuming the swap mechanism itself is broken.
- **AKS networking and identity failures compound each other.** A private AKS cluster's API server is only reachable via Private Link and resolves only through a linked private DNS zone — a "kubectl just stopped working" report is almost always a DNS/network-boundary problem, not an RBAC problem, and the specific failure type (resolution failure vs. auth error) tells you which one immediately.
- **Storage recovery incidents split on one question: deleted, or overwritten?** Soft delete answers the first; versioning answers the second. Reaching for the wrong one wastes time in an incident that's otherwise straightforward once the right mechanism is identified.
- **Production trade-off to name explicitly, every time:** Premium Functions plans trade continuous cost for eliminated cold starts; Azure CNI trades VNet address space for native pod routability; a locked immutability policy trades flexibility for an auditable compliance guarantee. Naming the trade-off, not just the fix, is what separates a mid-level answer from a senior one.

The full set of Azure troubleshooting questions is at [Azure Troubleshooting Questions](/type/troubleshooting?category=azure), and the scenario questions are at [Azure Scenario Questions](/type/scenario?category=azure). When practicing these, write down what you'd check first and why — specifically, which Azure Portal blade, which role assignment, which DNS zone — before reading the question's own investigation steps.

## Common Mistakes

- **Assuming identity correctness implies network reachability, or vice versa.** These are separate failure surfaces in Azure, and several of this bank's hardest troubleshooting questions exist specifically to test whether a candidate checks both.
- **Treating "Deployment slot setting" as an edge case instead of the first thing to check.** It's the single most common cause of post-swap production breakage in this bank's compute content.
- **Confusing soft delete with versioning, or assuming either covers both failure modes.** They protect against different mistakes; picking the wrong recovery path costs real time during an actual incident.
- **Reaching for a broad, shared identity instead of a scoped one.** Whether it's a Managed Identity, a Key Vault access policy, or an AKS Workload Identity binding, this bank's identity questions repeatedly test whether a candidate defaults to least privilege or to "broad enough that it works."
- **Believing Azure CNI and kubenet are interchangeable configuration options.** The choice is effectively permanent at cluster creation and has real VNet address-space consequences — treating it as a minor setting is a common, costly assumption.
- **Locking an immutability policy without being certain of the duration.** A locked time-based retention policy can't be shortened by anyone, including the account owner — this bank's storage-security content specifically tests whether a candidate understands that constraint before recommending it.

## Recommended Preparation Path

This bank is small enough (34 questions) that an artificial multi-week schedule would be filler. A more honest plan:

1. **First session:** The eight Must Practice questions below — a genuine cross-section of all four areas, doable in under two hours.
2. **Second session:** Pick whichever of Identity & Networking, Compute, Storage, or AKS felt weakest during Must Practice, and work through that subcategory's remaining questions in full.
3. **Third session:** The other three subcategories, in the Learning Path order above.
4. **Before the interview:** Revisit the Common Mistakes list and the Scenario & Troubleshooting Focus section above — these are the highest-density signal for how Azure interviewers actually probe, independent of which specific questions come up.

## Related Guides

If your interview also covers Kubernetes, the Kubernetes Interview Guide is a natural companion — this bank's entire AKS subcategory is Kubernetes running on Azure, and its Workload Identity and Azure RBAC for Kubernetes Authorization questions both assume real Kubernetes fluency on top of the Azure-specific mechanics.

## References

- [Microsoft Entra ID: Workload identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [Azure App Service: Set up staging environments](https://learn.microsoft.com/en-us/azure/app-service/deploy-staging-slots)
- [Azure Blob Storage: Access tiers overview](https://learn.microsoft.com/en-us/azure/storage/blobs/access-tiers-overview)
- [AKS: Use Azure RBAC for Kubernetes Authorization](https://learn.microsoft.com/en-us/azure/aks/manage-azure-rbac)
