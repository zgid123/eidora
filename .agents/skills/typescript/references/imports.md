---
name: TypeScript Imports
description: Module and import guidelines for Alpha's TypeScript projects
---

# Modules and Imports

- Use **ES modules** only (`import`/`export`); avoid `require` unless integrating with CommonJS.
- Use **relative imports** when the target is in the same folder or same path root.
- Prefer `package.json` **`imports`** aliases with the `#/` prefix when the project defines them.
- Use a **tsconfig path alias** only when the target is in `compilerOptions.paths`.
- When importing **across** path roots (for example `src/app` to `src/utils`), use `#/` imports first when available; otherwise use the alias from `paths`.
- Follow the prefix the project defines, preferring `#/` over `~/` or `@/`; match the editor's shortest path and keep the bundler in sync.

```ts
// Do:

// ✅ Same folder / same root -> relative; across roots -> #/ imports when package.json defines them
// File: src/app/user/user.service.ts
import { IUser } from './user.entity';
import { TUserId } from '../types';
import { formatDate } from '#/utils/date';

// Don't:

// ❌ Same folder: use relative
import { IUser } from '~/app/user/user.entity';

// ❌ Across roots: prefer #/ imports when package.json imports define them
import { formatDate } from '../../../utils/date';

// ❌ Prefer #/ imports over ~/ or @/ when both are available
import { formatDate } from '~/utils/date';
```

## Workspace Package Imports

When importing from a workspace package (e.g., `@domain/orders` in a monorepo), import through the package name — not through relative paths into `packages/` and not through tsconfig path aliases that fake the package resolution.

```ts
// ✅ Import through the declared workspace package name
import { Order, OrderRepository } from '@domain/orders';

// ❌ Never import domain packages via relative paths across package boundaries
import { Order } from '../../packages/@domain/orders/src/entities/order';

// ❌ Never fake workspace imports with a tsconfig path alias
import { Order } from '@domain/orders'; // backed by paths: { "@domain/orders": ["../../packages/@domain/orders/src"] }
```

Declare the dependency in `package.json` using `workspace:*`:

```json
{
  "dependencies": {
    "@domain/orders": "workspace:*"
  }
}
```

For domain isolation rules, dependency direction, and what the domain package must not import, see the [DDD TypeScript Monorepo reference](../../domain-driven-design/references/typescript-monorepo.md).
