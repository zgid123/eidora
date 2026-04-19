---
name: TypeScript Tooling
description: Tooling, tsconfig, and testing guidelines for Alpha's TypeScript projects
---

# Testing and Tooling

- **Use pnpm** as the package manager. Never use npm or yarn in TypeScript projects.
- Use the project's linter and formatter; run the project's check or format script when making changes.
- All tsconfig files must extend **`@alphacifer/tsconfig`**.
- Add only project-specific tsconfig overrides, such as `include` or `outDir`.
- Do not override or loosen strictness options unless the project documents an exception.
- If the project uses Biome, its Biome config must extend **`@alphacifer/biome`**.
- Keep only project-specific Biome overrides; do not replace Alpha's shared lint or formatting rules with unrelated local rules.
- Use the project's test runner and assertion style.
- For tests, follow [Testing Skill](../../testing/SKILL.md); prefer typed helpers and factories.
