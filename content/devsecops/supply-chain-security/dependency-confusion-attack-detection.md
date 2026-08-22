---
id: devsecops-supply-chain-security-dependency-confusion-001
title: "Your build just pulled in a package from the public npm registry instead of your internal package with the same name, and it wasn't the version your team published. What's happening, and how do you respond?"
category: devsecops
subcategory: supply-chain-security
technologies:
  - devsecops
difficulty: advanced
question_type:
  - troubleshooting
tags:
  - dependency-confusion
  - supply-chain-security
  - package-management
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

A build unexpectedly pulls in a package from the public npm registry instead of your organization's internal package of the same name, and it's not a version your team ever published. What's happening, and how do you respond?

## Short Answer

This is very likely a dependency confusion attack: someone published a package with the same name as your internal, private package to the public registry, and your package manager's resolution order picked the public one over your internal one — potentially executing attacker-controlled code during install. Respond by immediately treating any system that pulled the malicious package as compromised, removing the malicious public package (report it to the registry), and fixing the actual root cause — the resolution ambiguity — so this can't recur.

## Detailed Explanation

Dependency confusion exploits a specific, common misconfiguration: when a package manager is set up to check multiple registries (an internal/private one and the public one) without an explicit, enforced priority or scoping rule, some resolvers will pick whichever registry reports the higher version number, or default to the public registry under certain conditions — an attacker who knows or guesses your internal package's name can publish a same-named package publicly with a deliberately higher version number, and your build system may pull theirs instead of yours, running whatever install-time code they included.

## Symptoms

- A build or install pulls a package version nobody on the team published.
- The installed package's content doesn't match what's in your internal package repository.
- Unexpected network activity or behavior during or immediately after a build/install step, if the malicious package includes an install-time payload.

## Possible Causes

- Package manager configuration checks the public registry either before or alongside the internal one, without an explicit scope or priority rule preventing public packages from shadowing internal ones.
- An internal package's name was never reserved or published (even as an empty stub) on the public registry, leaving the name available for anyone to claim.
- A new build environment or CI runner was provisioned without inheriting the same registry-priority configuration as the rest of the fleet.

## Investigation Steps

1. Confirm the installed package's actual origin (registry URL, publish timestamp, publisher identity) versus your internal package's expected details.
2. Identify every system/pipeline that resolved to the malicious package, not just the one where it was first noticed — this may have been pulled by multiple builds before detection.
3. Inspect the malicious package's contents for what it actually does — install scripts (`postinstall` hooks and similar) are the most common vector for executing code during install, and need to be reviewed to understand actual impact.
4. Check whether any credentials, tokens, or secrets were present in the environment of an affected build, since a malicious install script could have exfiltrated them.

## Resolution

1. **Treat every affected build/system as compromised**, not just inconvenienced — rotate any credentials that were present in the environment during the affected install, and rebuild/redeploy from a known-clean state rather than trusting the affected environment.
2. **Report and request removal of the malicious package** from the public registry.
3. **Fix the resolution ambiguity that allowed this**: explicitly scope your package manager configuration so internal package names can never resolve to the public registry (most ecosystems support registry scoping — e.g., npm scoped packages tied to a specific registry, or an explicit allowlist).
4. **Claim your internal package names on the public registry too** (even as empty stub packages) for any internal package name where scoping alone isn't a complete guarantee, removing the name from being available for an attacker to claim.

## Prevention

- Explicitly scope internal/private package resolution so it can never fall back to or be shadowed by the public registry, rather than relying on version-number ordering.
- Reserve your internal package names on the public registry as empty stub packages, closing the name-squatting opportunity.
- Audit new build environments and CI runners against the same registry-configuration baseline as the rest of your fleet, since a missed environment is a common way this gap reappears.
- Pin exact dependency versions (and use lockfiles) so an unexpected version substitution is more likely to be caught by a diff or checksum mismatch before it reaches a build.

## Key Takeaways

- Dependency confusion exploits ambiguous registry resolution order — an attacker publishing a same-named, higher-versioned public package can shadow your internal one.
- Treat any affected build environment as compromised: rotate exposed credentials and rebuild from clean, don't just remove the malicious package and move on.
- The durable fix is explicit registry scoping, not just cleaning up this one incident — otherwise the same ambiguity can be exploited again with a different package name.
- Claiming internal package names on the public registry closes the underlying opportunity even if a scoping misconfiguration slips through somewhere.

## Interview Follow-Up Questions

- How would you audit your entire dependency tree for other internal package names that might be vulnerable to the same attack?
- How would you detect this kind of attack automatically, rather than relying on someone noticing an unexpected version?
- What's the trade-off between registry scoping and simply not using a public/private registry mix at all?

## References

- [Dependency Confusion: How I Hacked Into Apple, Microsoft and Dozens of Other Companies (Alex Birsan)](https://medium.com/@alex.birsan/dependency-confusion-4a5d60fec610)
- [npm Docs: Scoped packages](https://docs.npmjs.com/cli/v10/using-npm/scope)
