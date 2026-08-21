---
id: jenkins-pipelines-docker-permission-denied-agent-001
title: "A Jenkins pipeline stage runs `docker build`. It works fine when run by hand on the agent, but fails in the pipeline with a permission denied error talking to the Docker daemon. Why?"
category: jenkins
subcategory: pipelines
technologies:
  - jenkins
  - docker
difficulty: intermediate
question_type:
  - troubleshooting
tags:
  - jenkins
  - docker
  - ci-cd
  - troubleshooting
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A Jenkins declarative pipeline stage runs `docker build ...`. Running that exact command by hand while SSH'd into the agent as the same user works fine. But the pipeline fails with a permission denied error connecting to `/var/run/docker.sock`. Why would the same command behave differently, and how do you fix it?

## Short Answer

The Jenkins agent process itself usually runs as a different user (or in a different group context) than an interactive SSH session, even when both are nominally "the same user" — most commonly the agent was started as a systemd service before the user's group membership (`docker` group) took effect, or the agent runs inside a container that never had the socket's group mapped in. The fix is ensuring the actual process running the pipeline step has both the `docker` group membership and a fresh session (or, in containerized agents, that the container's user/group is set up with access to the mounted `docker.sock`).

## Detailed Explanation

Access to `/var/run/docker.sock` is normally gated by Unix group membership — the socket is owned by `root:docker`, and any user in the `docker` group can talk to the daemon without `sudo`. Group membership, however, is only picked up at login/session time: adding a user to the `docker` group with `usermod -aG docker jenkins` doesn't retroactively affect processes already running as that user. If the Jenkins agent was started (as a systemd service, or as a long-lived daemon process) before that group change, the agent process — and therefore every pipeline step it runs — is still using the old group list and gets permission denied, even though a brand new interactive SSH session as the same user picks up the updated groups correctly and works fine.

The same failure shows up for a structurally different reason on containerized (e.g. Kubernetes) Jenkins agents: mounting the host's `docker.sock` into the agent container only works if the container's process UID/GID actually maps to a UID/GID with access to that socket on the host, since Unix permissions are UID/GID-based, not username-based, across that boundary. A container running as an arbitrary UID with no matching group entry will fail the same way regardless of what "docker group" means inside the container.

## Symptoms

- `docker build`/`docker run` steps fail in the Jenkins pipeline with `permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock`.
- The identical command succeeds when run manually via SSH as (nominally) the same user.
- `id jenkins` (or whatever the agent's OS user is) shows the `docker` group is in fact assigned.

## Possible Causes

- The Jenkins agent process (systemd service, or long-running daemon) was started before the user was added to the `docker` group, so it's running with a stale group list.
- The agent runs as a containerized pod and the host `docker.sock` is mounted in, but the container's UID/GID doesn't map to a group with access to that socket on the host.
- The pipeline step actually runs under a different effective user than expected (e.g. via `sudo`, or a different agent label than assumed).

## Investigation Steps

1. Confirm the actual OS user the agent process runs as, and compare against the user checked interactively: `ps -o user= -p <agent-pid>` on the agent host.
2. Check the agent process's actual current group membership, not just `/etc/group`: `cat /proc/<agent-pid>/status | grep Groups`, cross-referenced against `getent group docker`.
3. If groups don't match, this confirms the stale-session theory — the agent process needs restarting after the group change.
4. For containerized agents, check the pod/container spec for how `docker.sock` is mounted and what UID the container runs as, and compare against the host socket's owning group GID.

## Commands

```bash
id jenkins

ps -o user= -p <agent-pid>
cat /proc/<agent-pid>/status | grep Groups
getent group docker

sudo systemctl restart jenkins
sudo systemctl restart jenkins-agent

ls -l /var/run/docker.sock
```

## Resolution

For a standalone/VM-based agent: after confirming the group mismatch, restart the Jenkins agent process (`systemctl restart jenkins` or the agent service) so it re-reads group membership on startup — a fresh SSH session isn't enough, since the long-running agent daemon itself needs to restart, not just future shells. For containerized agents, fix the pod spec so the container's UID/GID is a member of a group with access to the mounted `docker.sock` (or run the container with an explicit `securityContext` group matching the host socket's GID), or switch to Docker-in-Docker / a rootless approach that doesn't depend on host socket permissions at all.

## Prevention

- When provisioning a new Jenkins agent, add the agent user to the `docker` group as part of initial setup, before the agent service is first started — order matters.
- After any group membership change to a service account, always restart the service that runs as it; don't assume a re-login is sufficient for a daemon.
- For Kubernetes-based agents, prefer not mounting the host Docker socket at all where avoidable (rootless Buildah/Kaniko/BuildKit) — it removes this whole class of permission mismatch along with the security concerns of exposing the host daemon to build containers.
- Document the agent's actual runtime user/UID in the agent provisioning config so this isn't rediscovered by trial and error during an incident.

## Interview Follow-Up Questions

- Why is mounting the host Docker socket into a build container considered a security risk beyond just permissions?
- How would Kaniko or BuildKit's rootless mode avoid this whole problem, and what do you give up by switching to it?
- If this were a Kubernetes-based Jenkins agent instead of a static VM, how would the troubleshooting steps differ?

## Key Takeaways

- Unix group membership changes don't retroactively apply to already-running processes — the process (not just the shell) needs to restart.
- A long-running Jenkins agent service is exactly this kind of already-running process, so group changes require restarting the agent, not just re-logging-in.
- Containerized agents fail for a related but distinct reason: UID/GID mapping across the host/container boundary, not stale sessions.
- Always compare the actual agent process's user/groups against what an interactive check shows — they can silently diverge.

## References

- [Docker: Manage Docker as a non-root user](https://docs.docker.com/engine/install/linux-postinstall/#manage-docker-as-a-non-root-user)
- [Jenkins: Docker Pipeline plugin](https://plugins.jenkins.io/docker-workflow/)
- [Kaniko: build container images without a Docker daemon](https://github.com/GoogleContainerTools/kaniko)
