# AGENTS.md

## Project Overview

Morphos is a pnpm workspace for TypeScript serialization libraries. The main
package, `@morphos/core`, creates plain view-model objects from decorated schema
classes. The repository uses ESM, Stage 3 decorators, strict shared TypeScript
configuration, Vitest, tsdown, Oxc tooling, and Turbo.

## Repository Layout

- `packages/core`: Core decorators, registries, resolvers, and serializer.
- `packages/@adapters`: Reserved for integrations with external schema or
  validation libraries.
- `samples`: Buildable examples that consume workspace packages through their
  public APIs.
- `specs`: Numbered technical specifications and design decisions.
- `.agents/skills`: Repository-specific TypeScript and testing instructions.
- `.github`: CI, release workflows, and shared GitHub Actions.

Generated `lib` directories and dependency directories are build artifacts. Do
not edit them directly.

## Instruction Priority

- Follow this file for all repository work.
- For TypeScript changes, also follow `.agents/skills/typescript/SKILL.md` and
  only load the reference pages relevant to the task.
- For test changes, also follow `.agents/skills/testing/SKILL.md` and its
  relevant Vitest reference pages.
- A more deeply nested `AGENTS.md`, if introduced later, takes precedence for
  files in its directory tree.

## Working Practices

- Preserve existing user changes. Do not discard, rewrite, or reformat
  unrelated work.
- Keep changes scoped to the requested behavior.
- Inspect the affected package's `package.json`, TypeScript configuration, and
  nearby implementation before editing.
- Prefer public package entry points in samples and cross-package imports.
- Keep implementation details internal unless they are intentionally part of a
  package's supported API.
- Update the corresponding spec when a change alters documented architecture,
  public behavior, errors, or constraints.

## TypeScript Conventions

- Extend `@alphacifer/tsconfig`; do not loosen compiler options to make code
  compile.
- Use precise types and generics. Use `unknown` plus narrowing for dynamic data;
  do not introduce `any`.
- Add explicit return types to exported APIs and public class methods.
- Prefer `readonly` for data that is not intended to change.
- Use interfaces for object contracts and type aliases for unions, mapped
  types, primitives, and function-oriented compositions.
- Use ESM imports and exports. Use `import type` for type-only dependencies.
- Keep modules focused and expose supported APIs through package barrel files.
- Prefer guard clauses to deeply nested conditionals.
- Preserve the repository's existing naming patterns, including `I` for
  interfaces and `T` for type aliases.
- Do not edit emitted declarations or JavaScript in `lib`; update `src` and
  rebuild instead.

## Core Package Architecture

- Decorators in `packages/core/src/decorators` validate their targets and
  register metadata.
- Registries in `packages/core/src/registries` own decorator state. Use weak
  collections when state should not retain constructors or metadata.
- Resolvers in `packages/core/src/resolvers` turn registry data into immutable,
  reusable runtime descriptions.
- `packages/core/src/serializer.ts` orchestrates validation, field resolution,
  value mapping, and output-key transformation.
- `packages/core/src/index.ts` is the public package boundary. Export only APIs
  intended for consumers.
- Serialization returns a plain object. Do not instantiate schema classes or
  mutate source data unless a future specification explicitly changes that
  contract.

## Testing

- Use Vitest and place core tests under
  `packages/core/src/__tests__/*.spec.ts`.
- Test observable behavior through public APIs rather than private registries or
  implementation details.
- Keep tests deterministic, independent, and explicit about expected output and
  error messages.
- Cover successful behavior, precedence rules, invalid input, immutability, and
  error propagation when relevant.
- Keep compile-time assertions in focused `*.types.ts` files when runtime tests
  cannot verify a type contract.
- Add a regression test for every bug fix.
- Avoid snapshots for small structured values; prefer direct assertions.

## Validation Commands

Run the narrowest relevant checks first, then the workspace build when the
change affects package boundaries or public types.

```sh
# Run the core test suite once
pnpm --filter @morphos/core exec vitest run

# Type-check the core package without emitting files
pnpm --filter @morphos/core exec tsc --noEmit

# Build every workspace package
pnpm build

# Check formatting without modifying files
pnpm exec oxfmt --check .

# Run the linter
pnpm exec oxlint .
```

If a command is unavailable or the repository configuration changes, inspect
the current package scripts and use their supported equivalent. Do not claim a
check passed unless it was actually run.

## Samples

- Keep samples minimal and focused on one supported capability.
- Import from published-style package entry points such as `@morphos/core`, not
  from another package's `src` directory.
- Samples must compile as part of the workspace build.
- Never put behavior only in a sample; production behavior belongs in a
  package, with tests.

## Technical Specifications

- Store specifications in `specs`.
- Name files with a four-digit, zero-padded, monotonically increasing prefix:
  `0001-topic-name.md`, `0002-topic-name.md`, and so on.
- Do not reuse an existing number.
- Include status, goals, public contracts, technical design, error behavior,
  required behavior or acceptance criteria, and non-goals when applicable.
- Keep specifications synchronized with implementation changes.

## Dependency and Release Changes

- Use pnpm for dependency operations; do not use npm or Yarn.
- Add dependencies to the narrowest package that needs them.
- Keep `pnpm-lock.yaml` synchronized with manifest changes.
- Do not hand-edit generated lockfile sections.
- Add a Changesets entry for user-visible package changes when preparing work
  intended for release.
- Do not publish packages, create releases, or change versions unless explicitly
  requested.

## Completion Checklist

Before handing off a change:

1. Review the diff for unrelated edits and accidental generated files.
2. Run focused tests and type checks for affected packages.
3. Run the workspace build when exports, declarations, or package integration
   changed.
4. Confirm tests cover new and changed behavior.
5. Update samples, specs, and Changesets when the nature of the change requires
   them.
6. Report which checks ran and any checks that could not be completed.
