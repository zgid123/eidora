---
name: typescript
description: Guidelines for writing type-safe, readable TypeScript for Alpha's projects. Use when creating, reviewing, or refactoring TypeScript code, module structure, imports, naming, tsconfig usage, or testable TypeScript APIs.
---

# Purpose

This skill defines how to write and structure TypeScript so that code is type-safe, readable, and consistent across Alpha's projects.

# General Principles

- **`@alphacifer/tsconfig`** is **required**. Every project must extend it; do not override or loosen options—fix code instead unless the project documents an exception.
- **`@alphacifer/biome`** is **required when Biome is used**. If a project has Biome configured, it must extend Alpha's Biome config instead of maintaining unrelated local lint or format rules.
- **Prefer types over `any`**: Use precise types, generics, and inference; use `unknown` and narrow when the type is dynamic.
- **Explicit over implicit**: Prefer explicit return types on public APIs and exports; rely on inference for locals and private helpers.
- **Small, focused modules**: Prefer small files and single responsibility; use barrel exports only when they clearly simplify the public API.

# Reference Guides

- [Types and Interfaces](./references/types.md) - object shapes, unions, readonly values, branded types, and nullable modeling.
- [Modules and Imports](./references/imports.md) - ES modules, relative imports, and path aliases.
- [Style and Formatting](./references/style.md) - naming, enum alternatives, guard clauses, block braces, and object formatting.
- [Testing and Tooling](./references/tooling.md) - tsconfig, lint/format expectations, and testing conventions.
