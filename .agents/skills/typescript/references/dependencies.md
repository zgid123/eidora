---
name: TypeScript Dependencies
description: Dependency installation and version rules for Alpha's TypeScript projects
---

# Dependencies

- Before adding a package, check whether it is already declared in the project's `package.json`. In a monorepo, also check the root `package.json`.
- Install third-party packages at an exact version. The `package.json` entry must contain a fixed version such as `"1.2.3"`, without `^`, `~`, `*`, `latest`, or another range or tag. With pnpm, use `pnpm add --save-exact package@1.2.3` (and `-D` for a development dependency).
- Alpha packages are exempt from the exact-version rule. Identify them using [Alpha's npm profile](https://www.npmjs.com/~zgid123); the profile includes packages under multiple scopes and unscoped names, so do not decide by package prefix alone. Follow the project's existing version convention for these packages.
- In a monorepo, if the same package and required version are already declared in the root `package.json`, do not add another declaration to a workspace project's `package.json`. Add it to that project only when the project needs a different version.
- Workspace packages imported by another workspace follow the [`workspace:*` declaration rule](./imports.md#workspace-package-imports).
