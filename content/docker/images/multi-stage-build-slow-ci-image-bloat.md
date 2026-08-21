---
id: docker-images-multi-stage-optimization-001
title: "Your CI pipeline's Docker build takes 12 minutes and produces a 1.8GB image for a small Node.js service. How would you diagnose and fix it?"
category: docker
subcategory: images
technologies:
  - docker
  - nodejs
  - ci-cd
difficulty: intermediate
question_type:
  - practical
tags:
  - docker
  - multi-stage-builds
  - image-optimization
  - build-cache
estimated_time_minutes: 10
companies: []
related_questions:
  - docker-images-native-binary-dependencies-size-001
  - docker-images-ci-layer-caching-ephemeral-runners-001
  - docker-images-alpine-vs-slim-vs-distroless-nodejs-001
status: published
last_reviewed: 2026-08-19
last_updated: 2026-08-19
---

## Question

A teammate reports that the Docker build for a small Node.js API in CI takes 12 minutes and produces a 1.8GB image, even though the app itself is a few hundred lines of code. How would you diagnose what's driving the size and build time, and what would you change?

## Short Answer

Inspect the image's layer history to find what's actually taking up space (usually `node_modules` with dev dependencies and build tooling baked in, or an unnecessarily large base image), then restructure the Dockerfile into a multi-stage build that installs and compiles in one stage and copies only the production artifacts into a slim runtime stage — and fix layer ordering so dependency installation is cached separately from source code changes.

## Detailed Explanation

Two separate problems usually hide behind "the image is huge and slow to build": the final image contains things it doesn't need at runtime, and the build isn't using Docker's layer cache effectively so every CI run reinstalls everything from scratch.

For size, `docker history <image>` shows the size contribution of each layer. Common culprits for a "small app, huge image" situation are: using a full `node:20` base image (which includes build tools, npm, and a full Debian userland) instead of a slim or distroless variant; running `npm install` instead of `npm ci --omit=dev`, which pulls in devDependencies (test frameworks, bundlers, type definitions) that are never used at runtime; and not cleaning up build artifacts (like a TypeScript `src/` directory or a `.git` folder) that get copied into the final layer via a broad `COPY . .`.

For build time, the usual cause is cache invalidation: if `COPY . .` happens before `npm install` in the Dockerfile, then *any* source code change — even a one-line fix — invalidates the layer cache for the dependency install step, forcing a full reinstall on every build. Reordering so `package.json`/`package-lock.json` are copied and installed first, before the rest of the source is copied, means dependency installation is only re-run when the lockfile actually changes.

A multi-stage build addresses both at once: a `build` stage based on a full Node image installs all dependencies (including dev) and runs the TypeScript compile or bundle step, then a separate, slim `runtime` stage copies over only the compiled output and production `node_modules` (or better, uses `npm ci --omit=dev` in the final stage against the already-resolved lockfile). The build tools, dev dependencies, and source TypeScript never end up in the shipped image at all.

## Real-World Approach

1. Run `docker history --no-trunc <image>` to identify which layer(s) contribute most of the 1.8GB.
2. Check the base image: `node:20` (~1GB+) vs `node:20-slim` or `node:20-alpine` (both dramatically smaller) vs a distroless Node runtime image.
3. Check whether `npm install` or `npm ci` is used, and whether `--omit=dev` (or `NODE_ENV=production`) is set for the final install.
4. Check the Dockerfile's instruction order — confirm dependency files are copied and installed before the rest of the source, and add a `.dockerignore` to exclude `node_modules`, `.git`, test files, and CI config from the build context.
5. Restructure into a multi-stage build: a build stage compiles/bundles, a runtime stage copies only the artifacts and production dependencies.
6. Rebuild and compare `docker history`/`docker images` size and total build time, both cold and with cache warm.
7. If CI runs on ephemeral runners with no persistent Docker cache, add explicit CI-level layer caching (e.g. registry cache export/import or a build-cache action) so the dependency layer survives between runs.

## Example

```dockerfile
# syntax=docker/dockerfile:1

# ---- build stage ----
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

Paired with a `.dockerignore`:

```
node_modules
.git
*.test.ts
Dockerfile
.dockerignore
dist
```

## Common Mistakes

- Copying the entire build context (`COPY . .`) before installing dependencies, which defeats layer caching on every source change.
- Shipping devDependencies (test runners, linters, type packages) in the production image because `npm install` was used instead of `npm ci --omit=dev`.
- Choosing a full OS-based base image out of habit when a slim or distroless variant would work with no code changes.
- Not adding a `.dockerignore`, so the local `node_modules` and `.git` directory get sent to the build context (and sometimes copied into layers) even when the Dockerfile "shouldn't" need them.
- Running the container as root by default instead of switching to a non-root user in the final stage.

## Interview Follow-Up Questions

- How would you further reduce the image size if the runtime still needs native binary dependencies?
- How does layer caching behave differently on CI runners without a persistent Docker daemon between builds, and how would you mitigate that?
- What's the tradeoff between `alpine` and `slim`/`distroless` base images for a Node.js service?

## Key Takeaways

- Diagnose before optimizing: `docker history` tells you exactly which layer is heavy.
- Multi-stage builds separate "what's needed to build" from "what's needed to run" — only the runtime stage ships.
- Dockerfile instruction order controls cache invalidation; copy dependency manifests before source code.
- A `.dockerignore` is as important for build speed and image cleanliness as the Dockerfile itself.

## References

- [Docker docs: Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker docs: Dockerfile best practices](https://docs.docker.com/build/building/best-practices/)
- [npm docs: npm ci](https://docs.npmjs.com/cli/v10/commands/npm-ci)
