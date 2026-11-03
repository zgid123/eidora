---
name: typescript
description: Guidelines for writing type-safe, readable TypeScript for Alpha's projects. Always use when creating, editing, or refactoring any TypeScript (.ts) files, types (T prefix), interfaces (I prefix), function parameter objects, path aliases (#/ imports), #private class members, tsconfig extending @alphacifer/tsconfig, Biome lint/format configurations, or installing dependencies in a TypeScript project. Enforces strict type safety, explicit return types on public APIs, no loose any, and small focused modules.
---

# Purpose

This skill defines how to write and structure TypeScript so that code is type-safe, readable, and consistent across Alpha's projects.

# General Principles

- **Braces for every conditional body**: Always write `if`, `else if`, and `else` bodies as multiline `{ ... }` blocks, even for a single call, assignment, or early return. This applies inside callbacks and nested functions too; an enclosing arrow-function block does not replace the conditional's own braces.
- **Statement spacing**: Separate an entire `if`/`else if`/`else` chain from adjacent statements with a blank line before and after it. Separate awaited statements (including declarations initialized with `await`) from adjacent non-awaited statements with a blank line; consecutive awaited statements may remain together. Do not add padding at the start or end of a containing block. See [Statement Spacing](./references/style.md#statement-spacing).
- **Arrow return style**: Use a concise arrow body (implicit return) only when it is both simple and short. If it is complex or too long, use a block body with an explicit `return`. Judge length using the whole containing statement, including indentation and surrounding call syntax. Object/array literals and multiline expressions require explicit returns. See [Arrow Function Returns](./references/style.md#arrow-function-returns).
- **Multiline objects**: Write every non-empty object literal with one property per line and a trailing comma, including objects passed as function or method arguments. This applies even to a single shorthand property: `findOne({ id })` and `delete({ id })` are violations; put `id,` on its own line. It also applies to options objects passed to third-party or framework APIs, nested objects, and objects inside chained calls or schema definitions: `.references(() => series.id, { onDelete: 'cascade' })` is a violation; put `onDelete: 'cascade',` on its own line. Formatters preserve expanded objects but never expand inline ones, so this must be applied by hand. See [Style and Formatting](./references/style.md#objects-and-object-arguments).
- **`@alphacifer/tsconfig`** is **required**. Every project must extend it; do not override or loosen options—fix code instead unless the project documents an exception.
- **`@alphacifer/biome`** is **required when Biome is used**. If a project has Biome configured, it must extend Alpha's Biome config instead of maintaining unrelated local lint or format rules.
- **Prefer types over `any`**: Use precise types, generics, and inference; use `unknown` and narrow when the type is dynamic.
- **Explicit over implicit**: Prefer explicit return types on public APIs and exports; rely on inference for locals and private helpers.
- **Small, focused modules**: Prefer small files and single responsibility; use barrel exports only when they clearly simplify the public API.
- **Semantic property ordering**: In interfaces, object-shaped types, and object literals (including function arguments), order properties by identifiers, core domain data, system/metadata fields, timestamps, then optional/extension fields. Keep related fields adjacent within each group, place all optional properties last, and do not sort by key length or alphabetically at the expense of meaning. Keep property blocks continuous without blank lines between groups. See [Style and Formatting](./references/style.md#property-ordering) for details and examples.
- **Public parameter objects**: Project-owned exported functions and public instance methods with inputs take one named interface parameter object. Keep zero-argument APIs parameterless. Preserve signatures required by framework or third-party contracts, including CQRS handlers, rather than wrapping their arguments or changing the contract. Destructure first-level properties in the signature when using individual properties; keep the object intact when it must be passed onward or its identity or behavior matters. Keep private helpers simple.

# Required Workflow

1. Before writing or editing TypeScript, read [Style and Formatting](./references/style.md). Load the other reference guides when their subjects apply.
2. Apply these rules while writing code, including short callbacks and guard clauses.
3. Before delivering changes, review the changed code against the loaded rules. Check every conditional body for multiline braces and every conditional chain and awaited statement for surrounding blank lines. Check arrow bodies for long containing statements, object/array literals, multiline expressions, or complex transformations that need an explicit `return`. Check every object literal and object argument, including single shorthand properties such as `{ id }` and options objects passed to library calls such as `{ onDelete: 'cascade' }`, for one property per line with a trailing comma, then check property ordering and public parameter objects. Fix violations introduced or touched by the change and run the project's available lint/format checks. Passing a formatter alone does not establish compliance with all skill rules.

# Reference Guides

- [Types and Interfaces](./references/types.md) - object shapes, unions, readonly values, branded types, and nullable modeling.
- [Modules and Imports](./references/imports.md) - ES modules, relative imports, and path aliases.
- [Style and Formatting](./references/style.md) - naming, enum alternatives, guard clauses, block braces, and object formatting.
- [Testing and Tooling](./references/tooling.md) - tsconfig, lint/format expectations, and testing conventions.
- [Dependencies](./references/dependencies.md) - exact versions, Alpha package exceptions, and monorepo root dependencies.
