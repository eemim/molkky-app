---
name: verify
description: Run the same quality checks as CI (format, lint, type-check, tests, build) to verify changes before committing or opening a PR.
---

Run these in order from the repo root, mirroring `.github/workflows/ci.yaml`. Stop at the first failure, fix it, and re-run from that step.

1. `npm run format:check` (if it fails, `npm run format` fixes it)
2. `npm run lint`
3. `npm run check` (svelte-check + tsc for node config)
4. `npm run test:run` (use this, not `npm test`, which starts watch mode)
5. `npm run build`

Report which steps passed, and for any failure show the relevant error output.
