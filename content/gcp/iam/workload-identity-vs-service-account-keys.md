---
id: gcp-iam-workload-identity-vs-service-account-keys-001
title: "A GKE workload needs to call a GCP API — should it use Workload Identity or a mounted service account key file, and why?"
category: gcp
subcategory: iam
technologies:
  - gcp
  - gke
difficulty: intermediate
question_type:
  - practical
  - security
tags:
  - gcp
  - iam
  - gke
  - workload-identity
estimated_time_minutes: 7
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A pod running in GKE needs to call the Cloud Storage API. The two common ways to grant it credentials are mounting a downloaded service account JSON key as a Secret, or configuring Workload Identity so the pod's Kubernetes ServiceAccount maps directly to a GCP service account. Which would you use, and what's actually different about the security properties of each?

## Short Answer

Use Workload Identity — it eliminates the long-lived, exportable service account key entirely, issuing short-lived, automatically-rotated credentials tied to the pod's actual Kubernetes identity instead. A mounted key file is a long-lived static credential that, once created, exists indefinitely (until manually rotated or revoked) and can be copied, leaked, or exfiltrated just like any other file — Workload Identity removes that entire class of risk by never creating an exportable key at all.

## Detailed Explanation

**A mounted service account key is a long-lived, exportable static credential**: downloading a service account's JSON key and mounting it as a Kubernetes Secret gives the pod a credential that's valid indefinitely (by default) — anyone who can read that Secret, or who exfiltrates it from a compromised pod, has the same access as the service account for as long as the key remains valid, which for most organizations is "until someone remembers to rotate it," if ever.

**Workload Identity binds a Kubernetes ServiceAccount directly to a GCP service account, with no exportable key involved**: configuring the IAM binding (`roles/iam.workloadIdentityUser`) between a Kubernetes ServiceAccount and a GCP service account means pods using that Kubernetes ServiceAccount automatically receive short-lived, automatically-refreshed credentials from GCP's metadata server — there's no key file to create, mount, leak, or forget to rotate, because the mechanism doesn't involve a long-lived key at all.

**This mirrors the same underlying pattern as AWS's IRSA (IAM Roles for Service Accounts) for EKS**: both solve the identical problem (a Kubernetes workload needing cloud-provider credentials without a long-lived static key) using the same core mechanism — binding a Kubernetes-native identity to a cloud IAM identity, with the cloud provider's own infrastructure issuing short-lived tokens rather than a human ever handling or storing a long-lived credential.

**The blast radius of a compromised pod differs meaningfully between the two approaches**: with a mounted key, a compromised pod (or a leaked Secret) hands an attacker a credential valid far beyond the pod's own lifetime — they can use it from anywhere, indefinitely, until someone notices and revokes it. With Workload Identity, a compromised pod's attacker gets tokens that are short-lived and tied to that specific pod's identity, meaningfully narrowing both how long the access remains valid and how directly it's traceable back to the actual compromised source.

**Migration from key-based to Workload Identity is a common, worthwhile hardening project for existing clusters**: for a cluster still using mounted keys, moving to Workload Identity doesn't require changing application code (the GCP client libraries automatically discover and use whichever credential mechanism is available) — it's primarily an infrastructure/configuration change (enabling Workload Identity on the cluster, creating the IAM bindings, updating pod specs to use the mapped Kubernetes ServiceAccount), making it a relatively low-application-risk, high-value security improvement.

## Key Takeaways

- Workload Identity eliminates long-lived, exportable service account keys entirely, issuing short-lived credentials tied to the pod's actual Kubernetes identity instead.
- A mounted service account key is a long-lived static credential — anyone who reads or exfiltrates it has indefinite access until someone notices and rotates it.
- This is the GCP-native equivalent of AWS's IRSA pattern — both bind a Kubernetes-native identity to a cloud IAM identity to eliminate long-lived keys for workloads.
- Migrating an existing cluster from key-based auth to Workload Identity is typically a configuration change, not an application code change, making it a relatively low-risk, high-value hardening project.

## Interview Follow-Up Questions

- How would you migrate an existing GKE cluster's workloads from mounted service account keys to Workload Identity without a disruptive cutover?
- How would you audit a GKE cluster to find every pod still using a mounted service account key, rather than Workload Identity?
- What would you do for a workload running outside GKE entirely (a VM, or on-prem) that still needs to avoid long-lived service account keys?

## References

- [Google Cloud: Workload Identity](https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity)
- [Google Cloud: Best practices for using service accounts](https://cloud.google.com/iam/docs/best-practices-service-accounts)
