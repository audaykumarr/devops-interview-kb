---
id: helm-releases-upgrade-stuck-in-progress-001
title: "A `helm upgrade` gets interrupted (CI job killed, network blip) and now every subsequent `helm upgrade` or `helm rollback` fails with \"another operation (install/upgrade/rollback) is in progress\". How do you recover?"
category: helm
subcategory: releases
technologies:
  - helm
  - kubernetes
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - helm
  - kubernetes
  - releases
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A `helm upgrade` was interrupted midway (the CI job that ran it was killed, or there was a network blip to the cluster). Now every subsequent `helm upgrade` or `helm rollback` for that release fails immediately with `Error: UPGRADE FAILED: another operation (install/upgrade/rollback) is in progress`. How do you recover the release?

## Short Answer

Helm tracks release state as a Kubernetes Secret (or ConfigMap) per revision, and an interrupted operation leaves the latest revision stuck in `pending-upgrade` (or `pending-install`/`pending-rollback`) status — Helm refuses to start a new operation while one looks "in progress," even though nothing is actually running anymore. The fix is `helm rollback <release> <last-good-revision>`, or if there's no good prior revision, manually patching the stuck revision's Secret status to `failed` so Helm treats it as recoverable.

## Detailed Explanation

Helm 3 stores release history as Kubernetes Secrets in the release's namespace, one per revision, labeled with `owner=helm` and the release name. Each revision has a status: `deployed`, `superseded`, `failed`, `pending-install`, `pending-upgrade`, or `pending-rollback`. Before starting any new operation, Helm checks whether the latest revision is in one of the `pending-*` states — this is how it prevents two concurrent operations from racing on the same release. If a `helm upgrade` process gets killed (CI runner OOM, pod eviction, network partition to the API server) after Helm has already written the `pending-upgrade` Secret but before it updates that Secret to `deployed` or `failed`, the release is left permanently "pending" from Helm's point of view — there's no process actually running, but nothing ever told Helm the operation ended, so the lock is never released.

This is a known rough edge of Helm 3's storage-backend-as-lock design: it works well for genuinely concurrent operations (a second `helm upgrade` correctly fails fast instead of racing), but it has no timeout or liveness check for a stuck lock, so any hard interruption leaves it wedged until a human intervenes.

## Symptoms

- `helm upgrade` or `helm rollback` fails immediately (no cluster work attempted) with `another operation (install/upgrade/rollback) is in progress`.
- `helm history <release>` shows the latest revision's `STATUS` as `pending-upgrade`, `pending-install`, or `pending-rollback`.
- The workload in the cluster may actually be fine — pods running the intended new version — because the interruption happened after Kubernetes objects were applied but before Helm recorded success.

## Possible Causes

- The process running `helm upgrade`/`helm install` was killed (CI job timeout, OOM, manual cancellation) mid-operation.
- A network interruption between the Helm client and the Kubernetes API server during the operation.
- Two automated pipelines triggered a deploy for the same release concurrently, and one was killed after acquiring the pending state.

## Investigation Steps

1. Check the release's revision history and current status: `helm history <release> -n <namespace>`.
2. Identify the latest revision's status — if it's any `pending-*` state, that's the stuck lock.
3. Check whether the underlying Kubernetes resources actually reflect the intended change (`kubectl get deploy,svc -n <namespace> -l app.kubernetes.io/instance=<release>`) to judge whether the interrupted operation actually succeeded at the cluster level before it was cut off.
4. Decide recovery path: if a previous revision was healthy, roll back to it; if this is a fresh install with no prior good revision, the stuck Secret needs manual correction.

## Commands

```bash
helm history <release> -n <namespace>

helm rollback <release> <last-good-revision> -n <namespace>

kubectl get secrets -n <namespace> -l "owner=helm,name=<release>"
kubectl get secret sh.helm.release.v1.<release>.v<N> -n <namespace> -o yaml

kubectl label secret sh.helm.release.v1.<release>.v<N> -n <namespace> \
  status=failed --overwrite
```

## Resolution

If a prior revision was healthy, `helm rollback <release> <N>` to that revision is the cleanest fix — Helm records a new revision restoring the known-good state, and the stuck pending revision no longer matters. If there is no healthy prior revision (e.g. this was the first install and it got interrupted), the stuck Secret's `status` label needs to be manually changed from `pending-upgrade`/`pending-install` to `failed`, after which Helm treats the release as recoverable and a fresh `helm upgrade`/`helm install --replace` will proceed. Always confirm what's actually running in the cluster before choosing rollback versus re-apply, since the interrupted operation may have already partially or fully applied the intended change.

## Prevention

- Give CI jobs running Helm operations a timeout comfortably longer than a normal deploy, and prefer graceful cancellation (`SIGTERM` with a grace period) over hard kills where the CI platform allows it.
- Avoid triggering concurrent deploys of the same release from multiple pipelines; serialize deploys per release (e.g. a concurrency group in the CI config).
- Consider `helm upgrade --atomic`, which automatically rolls back on failure, reducing (though not eliminating) the window where a release is left in a genuinely ambiguous state.
- Monitor for releases stuck in `pending-*` status longer than a normal deploy takes, so this is caught by alerting rather than the next person who tries to deploy.

## Interview Follow-Up Questions

- How does `--atomic` change this failure mode, and what window of risk does it not cover?
- Why does Helm use Kubernetes Secrets as its storage backend by default instead of an external database, and what does that trade off?
- How would you design a deploy pipeline so that a killed CI job can never leave a release ambiguously stuck?

## Key Takeaways

- Helm 3 stores release state (including an implicit operation lock) as Kubernetes Secrets, keyed by revision.
- An interrupted operation leaves the latest revision in a `pending-*` status with no automatic timeout, blocking all future operations on that release.
- `helm rollback` to a known-good revision is the normal fix; manually patching the stuck Secret's status is the fallback when no good revision exists.
- The underlying Kubernetes resources may already reflect the intended change even though Helm considers the release failed — always check cluster state before choosing how to recover.

## References

- [Helm: Release Metadata / Storage backends](https://helm.sh/docs/topics/advanced/#storage-backends)
- [Helm CLI: helm rollback](https://helm.sh/docs/helm/helm_rollback/)
- [Helm CLI: helm upgrade](https://helm.sh/docs/helm/helm_upgrade/)
