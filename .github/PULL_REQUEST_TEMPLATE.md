## What this PR does

<!-- One or two sentences. If this adds a question, name it; if it's a code change, say what it fixes or adds. -->

## Checklist

Run the full suite locally before opening this PR — it's what CI runs, and a
content-only change can still break a page or an e2e test via the generated
index:

- [ ] `npm run validate`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] For a new/edited question: content is original (see [CONTRIBUTING.md](../CONTRIBUTING.md#originality)), not copied or lightly reworded from another source
