---
name: testing
description: Guidelines for writing deterministic unit, integration, and end-to-end tests for Alpha's projects. Use when creating, reviewing, or refactoring automated tests, test data factories, Vitest suites, integration tests, or E2E tests.
---

# Purpose

This skill defines how to write automated tests (unit, integration, and end‑to‑end) across all of Alpha's projects.

# Testing Principles

- **Behavior‑focused**: Test observable behavior and outcomes, not private implementation details.
- **Layered safety net**:
  - **Unit tests** validate small, isolated pieces of logic.
  - **Integration tests** validate how components collaborate (for example, services + database).
  - **End‑to‑end tests** validate critical flows through the system as a whole.
- **Deterministic and repeatable**: Tests must be reliable, independent, and produce the same result every run.
- **Realistic, maintainable**: Use factories/builders/helpers for test data and setup to keep tests expressive and easy to change.

# When to Use Each Test Type

- **Unit tests**:
  - Use for pure functions, domain logic, and small classes or methods.
  - Isolate the unit using simple stubs/fakes where needed.
- **Integration tests**:
  - Use when behavior depends on multiple modules or infrastructure (for example repositories, messaging, caching, persistence).
  - Prefer running against real or test instances of infrastructure (for example a test database) instead of heavy mocking.
  - **Do not use for controllers, adapters, or route handlers.** Those are tested exclusively with E2E tests.
- **End‑to‑end tests**:
  - **Always use for controllers, adapters, and route handlers** (HTTP routes, GraphQL resolvers, gRPC handlers). This is not optional — never write an integration test for a controller.
  - Use for other high‑value flows (for example sign‑up, checkout, critical APIs).
  - Keep scenarios focused; avoid duplicating coverage that is already well tested at lower levels.

# Structure and Naming (General)

- Group tests logically alongside the codebase structure (for example by module, feature, or package).
- Use clear file and suite names that describe the subject under test and its behavior.
- Prefer consistent patterns across languages (for example `describe`/`context`/`it`, or their closest equivalents) so tests read like documentation.

# Test Data and Factories

- Avoid large, inline object literals repeated across tests.
- Use:
  - **Factories** (for example builder objects, factory functions/classes, libraries like `fishery` in JS) to create realistic entities.
  - **Traits/modifiers** to express variations (for example “with admin role”, “with invalid email”).
- Keep factories close to tests (for example dedicated `test` or `__tests__` factories directory).

# External Dependencies and Mocking

- Do not mock internal code boundaries just to make tests easier; prefer testing through public interfaces.
- Prefer:
  - **Fakes** or in‑memory implementations for internal dependencies when needed.
  - **Mocks/stubs** only for true externals (for example 3rd‑party APIs, payment providers, email gateways).
- For HTTP or network‑heavy interactions, use appropriate tooling per language (for example HTTP mock servers, in‑process test harnesses) instead of ad‑hoc monkey‑patching.

# Language / Framework‑Specific Guides

- [Vitest Implementation Guide](./references/vitest/ref.md) - testing framework for all JavaScript/TypeScript projects.
