---
id: docker-images-native-binary-dependencies-size-001
title: "How would you further reduce a Docker image's size if the runtime still needs native binary dependencies, beyond what a multi-stage build alone achieves?"
category: docker
subcategory: images
technologies:
  - docker
difficulty: advanced
question_type:
  - practical
tags:
  - docker
  - image-optimization
  - native-dependencies
estimated_time_minutes: 7
companies: []
related_questions:
  - docker-images-multi-stage-optimization-001
status: published
last_reviewed: 2026-08-21
last_updated: 2026-08-21
---

## Question

A multi-stage build already separates build tooling from the runtime image, but the application still needs native binary dependencies (compiled C extensions, native libraries) present at runtime. How would you reduce image size further given that constraint?

## Short Answer

Copy only the specific compiled artifacts and their actual runtime shared-library dependencies into the final stage (not the whole build toolchain that produced them), use a minimal base image whose libc and system libraries are actually compatible with what was compiled against, and explicitly audit what's really needed at runtime with a tool like `ldd` rather than assuming "just copy the whole build output directory" captures the minimal necessary set.

## Detailed Explanation

The core principle multi-stage builds establish — the final image should contain only what's needed to *run* the application, not what was needed to *build* it — extends further for native dependencies specifically: even within "what's needed to run," a native binary typically only needs its own compiled artifact plus the specific shared libraries it's actually linked against, not the full development headers, compilers, and build-time libraries used to produce it.

**Audit actual runtime dependencies explicitly**: `ldd <binary>` lists the shared libraries a compiled binary actually needs at runtime — use this to determine the minimal set of `.so` files that need to be present in the final image, rather than assuming the entire build environment's library set is necessary. Copying only those specific shared libraries (via targeted `COPY --from=builder` statements) instead of broader library directories keeps the final image genuinely minimal.

**Match base image libc carefully**: this is the most common source of "works in the build stage, breaks in the runtime stage" pain — if the build stage uses glibc (a standard Debian/Ubuntu-based image) but the runtime stage uses an Alpine-based image (musl libc instead of glibc), a binary compiled against glibc will fail at runtime on the musl-based image, sometimes with a confusing error rather than an obvious "missing library" message. Either use the same libc family for both stages (or a distroless variant matching the build stage's libc), or deliberately compile in the build stage using a target that matches the intended minimal runtime's libc (e.g. compiling in an Alpine-based build stage if the runtime will also be Alpine-based).

**Consider static linking where practical**: for some native dependencies, statically linking the binary (bundling its dependencies directly into the compiled artifact rather than relying on shared libraries at runtime) eliminates the shared-library-matching problem entirely, at the cost of a larger individual binary — a worthwhile trade for a `distroless`/`scratch`-based final image where there's no libc or shared library ecosystem present at all to depend on.

**Use distroless or scratch as the final base where the dependency set allows**: once the exact minimal runtime dependency set is known (via the `ldd` audit), a `distroless` base (providing just enough libc and system libraries for common cases) or even `FROM scratch` (for a fully static binary with zero runtime dependencies) gets the image about as small and minimal as it can be, since there's no unused base-OS content at all beyond what's explicitly copied in.

## Key Takeaways

- Use `ldd` to determine the actual minimal set of shared libraries a native binary needs at runtime, rather than assuming the full build environment is necessary.
- Mismatched libc between build and runtime stages (glibc vs musl) is the most common source of confusing native-dependency failures — match them deliberately or compile against the target runtime's libc.
- Static linking eliminates the shared-library-matching problem entirely, trading a larger binary for compatibility with a fully minimal (`scratch`) base image.
- `distroless` or `scratch` as the final base, combined with an explicit minimal dependency copy, achieves the smallest practical image size for a native-dependency workload.

## Interview Follow-Up Questions

- How would you debug a native binary that fails at runtime with an unhelpful error, only in the minimal final image and not in the build stage?
- What's the trade-off of static linking beyond image size — does it affect security patching for the linked libraries?
- How would you automate the `ldd`-based dependency audit as part of the CI build process, rather than doing it manually once?

## References

- [Docker Docs: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Google: Distroless Container Images](https://github.com/GoogleContainerTools/distroless)
