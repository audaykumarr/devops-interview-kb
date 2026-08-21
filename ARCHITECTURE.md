# Architecture

This document records the reasoning behind the non-obvious decisions in this
repository, so "why is it built this way" doesn't have to be reverse-engineered
from the code later.

## Context

Content and website live in a single repository. There's no separate content
repo talking to a separate website repo over `repository_dispatch` or build
artifacts — one repo, one CI pipeline (validate → generate index → build →
deploy), no cross-repo tokens or artifact-passing to design and secure. If the
content corpus and the website's release cadence ever genuinely diverge, that
split is still available later; it's not worth the coordination overhead
upfront.

## Decisions

### 1. Content storage: Markdown + YAML frontmatter, not README-driven

Each question is its own file at `content/<category>/<subcategory>/<slug>.md`,
frontmatter defined by [schemas/question.schema.json](schemas/question.schema.json).
Flat `content/<category>/` (no `questions/` prefix segment) keeps generated
URLs short: `/questions/<category>/<subcategory>/<slug>`.

### 2. JSON Schema as the validation contract, not just TypeScript types

`schemas/question.schema.json` is the canonical definition of a valid
question, validated with `ajv`. Chosen over defining the shape only as a
TypeScript/Zod type because it's language-agnostic — any future tooling (a
linter in another language, a contribution bot, a CMS import script) can
validate against it without depending on this repo's TypeScript — and
`ajv` + `ajv-formats` gives real date/format validation, not just shape
checking.

### 3. Taxonomy as a separate registry file, not a hardcoded enum

`schemas/taxonomy.json` holds the list of valid top-level categories,
referenced by the validator rather than inlined into the JSON Schema's
`category` enum. Adding a new top-level category is a one-file, reviewable
change, and the website reuses the same registry for navigation without
re-deriving it from the schema.

### 4. Content validation covers structure and cross-references, not just shape

`scripts/validate-content.ts` checks JSON Schema conformance, taxonomy
membership, ID uniqueness, related-question reference integrity,
required-section presence per `question_type`, and placeholder-text
detection. It intentionally does not do arbitrary broken-internal-link
scanning across free-form Markdown links — that's a different, fuzzier
problem than the structural checks above and hasn't been worth the false-positive
risk yet.

### 5. Generated index/statistics are build output, not committed source

`generated/` is gitignored. `questions.json` and `statistics.json` are
produced from `content/` by a build step (locally, in CI, or by the deploy
pipeline), never maintained by hand or committed alongside it. This is the
mechanism that guarantees content is never kept in sync in two places — the
website reads the generated output, never the raw Markdown directly except
for a single question's body on its own page.

### 6. Website stack: Next.js + TypeScript

File-based routing maps cleanly onto `/questions/<category>/<subcategory>/<slug>`
and `/`, `/[category]` pages; static generation covers most pages, with
dynamic rendering only where URL-search-param filtering genuinely requires
it. Content authority stays in Git as plain Markdown, read by build scripts
this repo fully controls — no headless CMS, no Contentlayer (unmaintained)
sitting between the content and the site.

### 7. Package manager and tooling: npm, TypeScript via `tsx`

No assumption of `pnpm`/`yarn` being installed in a contributor's
environment; npm is the lowest-common-denominator default. Scripts run via
`tsx` directly against `.ts` source rather than requiring a compile step —
appropriate for short CLI scripts; worth revisiting only if the content
engine's tooling grows large enough to want compiled output.

### 8. Follow-up questions are a content-gap signal, not just prose

Each question's **Interview Follow-Up Questions** section is free prose —
unlike `related_questions` (a structured frontmatter field pointing at real,
fully-answered entries), a follow-up bullet like "How would this differ on
ECS instead of EC2?" isn't linked to anything, even if a question answering
exactly that already exists elsewhere in the corpus, or should.

Not every follow-up should become a full standalone question — many are
meant to simulate interview depth in the moment, not become a content
backlog. Instead, `npm run generate:related` treats these bullets as signal:

- Every follow-up bullet is compared against existing question
  `title`/`tags`/`technologies` using token-overlap similarity scoped to the
  same `category`/`technologies` (not naive substring matching — a generic
  phrase like "how would you handle failure" shouldn't false-match
  everything tagged `troubleshooting`).
- **Above threshold** ("this follow-up is basically already answered
  elsewhere"): reported in `generated/related-suggestions.json` as a
  candidate `related_questions` link — a human still confirms and adds it,
  never auto-applied to content.
- **Below threshold** ("no existing question really answers this"): reported
  in `generated/content-gaps.json` as a genuine content gap — a prioritized
  candidate list for future content, so the follow-ups readers actually want
  answered don't get silently dropped.

### 9. The website reads the generated index, not raw content, at request time

Pages read `generated/questions.json`/`generated/statistics.json` for
metadata/listing/filtering, and go back to the raw Markdown file (via
`lib/questions.ts`'s `getQuestionDetail`) only for a single question's full
body — keyed off the route's own `category`/`subcategory`/`slug` params, not
the index's `content_path` field, so the file read stays statically scoped
to `content/` for Turbopack's file-tracing analysis instead of tracing the
whole project into the server bundle.

Filtering on category/technology/difficulty pages is URL-search-param-driven
(server-rendered, shareable, no client JS required to see a filtered list);
`/search` is fully client-side for instant-feedback interactivity. Both
share the same filter logic (`lib/search.ts`) so behavior can't drift
between them.

### 10. Theme: class-based dark mode with a persisted manual override

Tailwind's `dark:` variant was switched from its default `prefers-color-scheme`
media query to class-based (`@custom-variant dark (&:where(.dark, .dark *));`
in `globals.css`), so a manual choice can coexist with following the OS
setting. `lib/theme.ts` stores the choice (`light`/`dark`/`system`) in
`localStorage`; a `beforeInteractive` inline script (`THEME_INIT_SCRIPT`,
injected via `next/script` in the root layout) applies the right class
before first paint to avoid a flash of the wrong theme, which is why
`<html>` carries `suppressHydrationWarning` — React's own markup doesn't
include the class the script adds. "System" doesn't just resolve once; the
toggle listens for OS-level theme changes and re-applies while "system" is
selected.

### 11. SEO metadata goes through one function; OG images are generated, not fabricated

Every page builds its `Metadata` object via `buildMetadata()` (`lib/seo.ts`),
so canonical URL / OpenGraph / Twitter fields are structurally impossible to
forget on any individual page — a new page type gets them by construction,
not by remembering to copy boilerplate. `SITE_URL` (`lib/site.ts`) drives all
of it, defaulting to `http://localhost:3000` and reading
`NEXT_PUBLIC_SITE_URL` in production (see `.env.example`) — no production
domain is hardcoded anywhere in the codebase.

OpenGraph preview images are generated at build time with `next/og`
(`ImageResponse`), not static placeholder assets: a shared branded default
(`app/opengraph-image.tsx`) for most pages, and a real per-question card
(`app/questions/.../opengraph-image.tsx`) rendering that question's actual
title/category/difficulty. Both need their own `generateStaticParams` — an
`opengraph-image` route doesn't inherit one from a sibling `page.tsx` in the
same segment, so omitting it silently falls back to on-demand (dynamic)
rendering instead of build-time generation.

Structured data (`lib/structured-data.ts`, rendered via `components/JsonLd.tsx`)
is scoped deliberately: `BreadcrumbList` wherever the visible breadcrumb
trail already exists (reusing the same items array so the two can't drift),
and `QAPage`/`Question`/`Answer` on question pages specifically, since Q&A is
exactly what this content is and what that schema type is for — not applied
speculatively to every page type.

`/search` is crawlable in its unparameterized form (a legitimate full
listing) but `/search?*` is disallowed in `robots.txt` and excluded from the
sitemap: the page has no server-side query filtering (search happens
entirely client-side over a prop), so a crawler hitting a parameterized URL
sees identical initial HTML to the bare page — indexing every query
combination would be pure duplicate-content risk for no benefit.

### 12. Deploy target: Vercel via CLI

Several pages (`/[category]`, `/technologies/[technology]`, `/difficulty/[level]`)
render dynamically because their filters are URL search params, which a pure
static host (e.g. GitHub Pages) can't serve without reworking those pages to
client-only filtering. Vercel — or any host that runs Next.js's own server —
needs no such rework, which is why it's the target.

Deployment uses the Vercel CLI (`vercel pull` → `vercel build` → `vercel
deploy --prebuilt --prod`) driven from GitHub Actions, rather than Vercel's
native Git integration, so production deploys are gated behind this
repo's own validation job first (typecheck, content validation, unit tests)
— defense-in-depth in case `main` is ever updated outside a PR that already
ran `pr-validation.yml`. Vercel's native Git integration is a simpler
alternative for anyone who'd rather not manage the three Vercel secrets
(documented in the README) — just don't enable both at once, or every push
deploys twice.

`NEXT_PUBLIC_SITE_URL` (decision 11) is set as a **Vercel project
environment variable**, not a GitHub secret — `vercel build` reads it from
the Vercel project's own configuration via `vercel pull`, not from the
GitHub Actions environment. Getting this distinction wrong is the most
likely deploy misconfiguration, so it's called out explicitly in the
README's setup steps.

### 13. License and attribution

MIT license, copyright held by "DevOps Interview Knowledge Base Contributors"
rather than a named individual, since this is intended as a community
project and no specific legal entity was specified. Change the copyright
line in [LICENSE](LICENSE) if a specific person or org should hold it
instead.

## Roadmap

The core platform — content model, validation, generated index, website,
SEO, and CI/CD — is built and working end to end. What's left is growing the
question bank itself: more categories, more depth per category, and letting
the content-gap report (decision 8) surface what to write next.
