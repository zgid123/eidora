# Vitest guideline

Vitest is the default test runner for all JavaScript and TypeScript projects that follow Alpha's standards. Use it together with the generic [testing skill](../../SKILL.md) for unit, integration, and E2E tests.

## Philosophy (JS/TS)

- Do **not** mock internal classes, functions, or modules just to make tests easier.
- Only stub or mock **3rd‑party requests** and external services.
- Prefer HTTP‑level mocking with **Mock Service Worker (MSW)** for outbound network calls.
- When verifying test-order independence, rerun the suite with explicit fixed shuffle seeds and record the seed values and observed outcomes so failures can be reproduced. Preserve the test runner's exit status when filtering output; a successful `grep` or `tail` does not establish that tests passed.

## File locations and naming

- All test files live under `src/__tests__`.
- Unit and integration tests: `*.spec.ts`.
- End‑to‑end tests: `*.e2e.ts`.

## Detailed guides

- [Convention](./convention.md) — how to structure and name test suites.
- [Factory](./factory.md) — creating reusable factories with `fishery` and `@faker-js/faker`.
- [Integration test](./integration-test.md) — examples using Drizzle repositories with Vitest.
- [End‑to‑end test](./end-to-end-test.md) — examples using Hono + Drizzle with Vitest.
