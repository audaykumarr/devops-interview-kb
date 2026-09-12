---
id: azure-aks-loadbalancer-service-no-external-ip-001
title: "A new LoadBalancer-type Service in AKS has been stuck in 'Pending' with no external IP for twenty minutes. How do you actually diagnose this in Azure specifically?"
category: azure
subcategory: aks
technologies:
  - azure
  - kubernetes
  - aks
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - azure
  - aks
  - load-balancer
  - networking
estimated_time_minutes: 6
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-25
last_updated: 2026-08-25
---

## Question

A new `LoadBalancer`-type Kubernetes Service was created in an AKS cluster to expose a workload. Twenty minutes later, it's still showing `<pending>` for `EXTERNAL-IP`. Kubernetes-level troubleshooting (checking the Service and endpoint objects) shows nothing obviously wrong. What's actually happening, and how do you diagnose it on Azure specifically?

## Short Answer

In AKS, a `LoadBalancer` Service provisions an actual Azure Load Balancer (and often a public IP resource) behind the scenes, and that provisioning can fail or stall for reasons entirely outside Kubernetes itself — the most common are the subscription's public IP quota being exhausted, or the AKS cluster's managed identity lacking permission to create resources in the node resource group. Checking Kubernetes objects alone won't show this, because the failure is happening at the Azure resource layer the Kubernetes API doesn't have visibility into.

## Detailed Explanation

This is an infrastructure-provisioning problem hiding behind a Kubernetes-shaped symptom — the Service object itself is correctly configured, but the Azure resource it depends on never finished being created.

## Symptoms

- The Service object itself looks correctly configured — right selector, right ports, right type — and shows no error at the Kubernetes API level, just a perpetually pending external IP.
- The problem is specific to `LoadBalancer`-type Services; `ClusterIP` and `NodePort` Services in the same cluster work normally.
- No recent change was made to the Service definition itself that would explain a sudden provisioning failure.

## Possible Causes

- **The subscription's public IP address quota has been exhausted** — each `LoadBalancer` Service typically requests a new public IP by default, and once the quota limit is hit, new requests silently fail to provision from Kubernetes' point of view.
- **The AKS cluster's managed identity lacks the necessary permissions on the node resource group** (the separate, AKS-managed resource group holding the load balancer, public IPs, and related networking resources) — if that identity's role assignment was changed or is missing, it can't create the load balancer resource.
- **The configured Load Balancer SKU doesn't support what's being requested** — a `Basic` SKU load balancer has different capabilities and limits than `Standard`, and a cluster provisioned with one SKU can hit constraints the other wouldn't.

## Investigation Steps

**Check the events on the Service object itself** via `kubectl describe service <name>` — the cloud-provider integration frequently surfaces the actual Azure-side error (quota exceeded, permission denied) as a Kubernetes event, which is the fastest path to the real cause without leaving `kubectl` at all.

**Check the subscription's current public IP usage against its quota** in the Azure Portal's Usage + quotas view, or via `az network list-usages` scoped to the region — this directly confirms or rules out quota exhaustion as the cause.

**Check the AKS cluster's managed identity role assignments on the node resource group**, via `az role assignment list` scoped to that resource group — confirming the cluster's identity still has the expected `Network Contributor`-equivalent access rules out a permissions regression.

## Resolution

If quota-limited, request a quota increase for public IP addresses in the relevant region, or reconsider whether every Service genuinely needs its own public IP versus sharing ingress through a single load balancer/ingress controller. If it's a permissions issue, restore the AKS cluster identity's required role assignment on the node resource group. Once the underlying Azure-side blocker is resolved, the pending Service typically provisions automatically without needing to be recreated.

## Prevention

Monitor public IP quota utilization proactively rather than discovering exhaustion via a stuck deployment, and treat the AKS cluster identity's role assignments on the node resource group as a monitored, alerting-worthy configuration — a manual change there (intentional or accidental) has exactly this kind of silent, delayed-discovery failure mode.

## Key Takeaways

- A `LoadBalancer` Service in AKS provisions real Azure infrastructure behind the scenes — the failure can live entirely in Azure's resource layer, invisible to pure Kubernetes-level troubleshooting.
- `kubectl describe service` often surfaces the actual Azure-side error as a Kubernetes event — check this before assuming the problem requires deep Azure investigation.
- Public IP quota exhaustion and node-resource-group permission gaps are the two most common causes, and both are silent at the Kubernetes API level.
- The node resource group's permissions being correct is a standing operational assumption, not a one-time setup step — it can regress from an unrelated change elsewhere.

## Interview Follow-Up Questions

- How would you design a monitoring check that catches public IP quota exhaustion before it blocks a deployment?
- What would change about this diagnosis if the Service used `Standard` SKU with a static (reserved) public IP instead of a dynamically-provisioned one?
- How would you reduce public IP consumption across many Services without giving up external accessibility for each?

## References

- [AKS: Use a public standard load balancer](https://learn.microsoft.com/en-us/azure/aks/load-balancer-standard)
