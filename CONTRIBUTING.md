# Contributing

Thanks for helping build this. The workflow is intentionally simple: content
lives in Git, gets validated automatically, and merges like any other code
change.

## Workflow

1. **Fork** the repository and clone your fork.
2. **Create a branch**: `git checkout -b add/aws-lambda-cold-start-question`.
3. **Add your question**:
   - Copy [templates/question.md](templates/question.md) into
     `content/<category>/<subcategory>/<your-slug>.md`.
   - `<category>` must match a slug in [schemas/taxonomy.json](schemas/taxonomy.json).
     If your topic doesn't fit an existing category, open an issue to discuss
     adding one before submitting content for it.
   - `<subcategory>` and `<your-slug>` are your choice, lowercase kebab-case.
   - Give it a unique `id` following the convention
     `<category>-<subcategory>-<short-topic>-<3-digit-sequence>`.
4. **Follow the schema**: fill in every required frontmatter field (see
   [README.md](README.md#content-model)) and every required body section for
   your question's `question_type`.
5. **Run validation**:

   ```bash
   npm install
   npm run validate
   ```

   Fix anything it flags before opening a PR — CI runs the same check and will
   block the merge otherwise.
6. **Submit a PR** against `main`. Describe what the question covers and why
   it's a good addition.
7. **Automated checks** run on the PR (schema validation, structure checks,
   duplicate/placeholder detection).
8. **Review**: a maintainer reviews for technical accuracy, originality, and
   quality — not just "did it pass validation."
9. **Merge**: once approved and green, it's merged and becomes part of the
   knowledge base.

## What makes a good question

- **Specific over generic.** "What is Docker?" is not a good question. "Your
  Docker container works locally but repeatedly gets OOMKilled in Kubernetes —
  how would you investigate it?" is.
- **Practical over textbook.** Prefer questions that test judgment and
  troubleshooting ability over rote definitions.
- **Answerable, not open-ended trivia.** A strong candidate should be able to
  give a real answer in the `estimated_time_minutes` you set.
- **Version-aware.** If your answer depends on a specific tool version, set
  `technology_version` in the frontmatter rather than baking an assumption
  into the prose.
- **Documented, not fabricated.** Reference official documentation only (AWS
  docs, Kubernetes docs, HashiCorp docs, etc.) — never invent a URL.

## Originality

All content in this repository must be **written by you, for this
repository**. Do not:

- Copy questions or answers from other interview-prep repositories, blogs,
  paid courses, or books.
- Lightly reword someone else's question while keeping their framing or
  example.
- Submit AI-generated content that reproduces a specific existing source's
  structure or wording.

Common technical concepts (how Kubernetes probes work, what IAM least
privilege means, etc.) are fair game — everyone draws on the same underlying
technology. What must be original is *your specific question, scenario, and
explanation*. If you're inspired by a real interview experience, that's
great — write it from your own understanding rather than transcribing
something you read elsewhere.

## Validation reference

`npm run validate` checks:

- Frontmatter against [schemas/question.schema.json](schemas/question.schema.json)
- `category` exists in [schemas/taxonomy.json](schemas/taxonomy.json)
- `id` is unique across the whole repository
- `related_questions` doesn't reference itself and only points at IDs that exist
- Required body sections are present and non-empty for the question's `question_type`
- No obvious placeholder text (`TODO`, `TBD`, `FIXME`, `Lorem ipsum`, "coming soon")
- Near-duplicate titles within the same category (printed as a non-fatal warning)

`npm run build:content` additionally generates the content index, statistics,
related-question suggestions, and the follow-up-question content-gap report —
see [README.md](README.md#content-engine) and
[ARCHITECTURE.md](ARCHITECTURE.md) (decision 8). Broken internal Markdown-link
scanning across free-form links isn't implemented — it's a fuzzier problem
than the structural checks above and hasn't been worth the false-positive risk.

## Code of Conduct

This project follows the [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you're expected to uphold it.
