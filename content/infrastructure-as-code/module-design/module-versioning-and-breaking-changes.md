---
id: infrastructure-as-code-module-design-versioning-001
title: "You need to make a breaking change to a shared infrastructure module used by 30 different projects. How do you version and roll this out without breaking everyone simultaneously?"
category: infrastructure-as-code
subcategory: module-design
technologies:
  - terraform
difficulty: advanced
question_type:
  - architecture
tags:
  - infrastructure-as-code
  - terraform
  - module-versioning
estimated_time_minutes: 8
companies: []
related_questions: []
status: published
last_reviewed: 2026-08-22
last_updated: 2026-08-22
---

## Question

You maintain a shared Terraform module (say, for provisioning a standard VPC configuration) used by 30 different project repositories. You need to make a genuinely breaking change — renaming a variable, changing a resource's structure in a way that forces replacement. How do you version and roll this out without breaking all 30 consumers simultaneously?

## Short Answer

Publish the breaking change as a new major version, keeping the old major version available and unchanged for existing consumers who haven't migrated yet — since each consumer pins an explicit module version (`source = "...//module?ref=v2.0.0"` or the registry-version equivalent), publishing a new major version doesn't affect anyone until they deliberately bump their own pin, turning "breaking change to a shared module" into "each of 30 consumers independently decides when to adopt it," rather than a simultaneous, forced break.

## Detailed Explanation

The core mechanism that makes this safe is the same principle as any other shared-dependency versioning: explicit version pinning means a change to the shared source doesn't propagate to consumers until they deliberately update their reference to it — the module's own versioning discipline is what turns a potentially catastrophic simultaneous break into a controlled, consumer-paced migration.

## Requirements

- Existing consumers must not be affected by the breaking change until they explicitly opt in.
- Consumers need clear guidance on what changed and how to migrate.
- The module maintainer needs visibility into which consumers have and haven't migrated, to avoid indefinitely maintaining two versions with no path to consolidation.

## Architecture

**Semantic versioning applied rigorously to the module**: a breaking change (renamed variable, resource restructuring, anything requiring a consumer to change their own calling code) bumps the major version; non-breaking additions bump the minor version; fixes bump the patch version — this isn't just a convention, it's the actual signal consumers rely on to know whether bumping their pinned version is safe to do without reading the full changelog first.

**The old major version remains available and unmodified**: publishing `v3.0.0` with the breaking change doesn't touch or remove `v2.x.x` — consumers still pinned to `v2.x.x` continue working exactly as before, completely unaffected by the new version's existence, since Terraform module sourcing resolves to whatever specific version/ref each consumer's own configuration declares.

**A clear migration guide accompanies the breaking release**: documenting exactly what changed and the specific steps to migrate (the old variable name maps to this new one, this resource change requires this manual state operation) reduces the friction for each of the 30 consumers when they do decide to migrate, and reduces the volume of support questions the module maintainer would otherwise field individually.

**Track adoption across consumers to know when the old version can actually be deprecated**: without visibility into which of the 30 consumers have migrated, the module maintainer has no way to know whether it's safe to eventually stop maintaining the old major version — a lightweight tracking mechanism (a dashboard, or even a simple checklist), similar in spirit to the golden-path deviation tracking discussed elsewhere, gives the maintainer the data needed to eventually consolidate.

**For state-affecting changes, provide explicit state migration guidance, not just code changes**: some breaking changes to a module (particularly ones causing resource replacement, like a renamed resource or a change to a resource's `for_each` key) require consumers to run `terraform state mv` or similar operations to avoid an unwanted destroy-and-recreate — a migration guide that only shows the code diff, without addressing the state implications, leaves consumers to discover this the hard way during their own `terraform plan`.

## Trade-offs

Maintaining two major versions simultaneously (old and new) means real ongoing maintenance burden for the module maintainer — bug fixes may need to be backported to the old version if consumers haven't migrated yet, and this can't continue indefinitely without eventually forcing consolidation. Setting a deprecation timeline for the old major version (with adequate notice) balances giving consumers real migration time against not maintaining two versions forever.

## Key Takeaways

- Explicit version pinning by each consumer is what makes a breaking module change safe — publishing a new major version doesn't affect anyone until they deliberately bump their own reference.
- Rigorous semantic versioning gives consumers a reliable signal for whether bumping their pin is safe without reading the full changelog.
- A clear migration guide, including explicit state-migration steps for changes causing resource replacement, reduces friction and support burden across many consumers.
- Track adoption across consumers to know when the old major version can actually be deprecated, rather than maintaining it indefinitely with no visibility into remaining usage.

## Interview Follow-Up Questions

- How would you handle a consumer who's stuck on a very old major version and unable to migrate due to their own unrelated technical debt?
- How would you communicate a breaking change and migration deadline to 30 different teams effectively?
- How would you test that the new major version actually works correctly before publishing it, given you can't test against every consumer's specific configuration?

## References

- [Terraform: Module versioning](https://developer.hashicorp.com/terraform/language/modules/sources#selecting-a-revision)
- [Semantic Versioning](https://semver.org/)
