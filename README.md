# Eidora

**Eidora** (**/aɪˈdɔː.rə/**, **eye-DOOR-ah**) is a coined name inspired by the
Ancient Greek **εἶδος** (_eidos_), meaning _form_, _appearance_, or
_representation_. For this project, **Eidora** means **the form in which an
object is presented**.

Eidora is a type-safe serializer for TypeScript. It projects domain objects into
explicit view models defined with decorators or supported schema engines,
giving each use case the data shape it needs without mutating the source or
exposing undeclared fields.

A domain model can have many valid representations: a public response, an admin
view, or a context-specific payload. Eidora lets you define each representation
as a small schema and serialize the same object into the appropriate form while
the domain model stays unchanged.

## Features

- Explicit field allowlists through decorators
- Renamed and computed output fields
- Read-only context for request-specific mapping
- Context-aware per-property transforms for ArkType and Zod schemas
- Recursive `camel`, `pascal`, and `snake` key transforms
- Plain-object output with no schema construction or source mutation
- Strongly typed schema results
- Extensible schema adapters for ArkType and Zod

## Quick Start

Install the core package:

```sh
pnpm add @eidora/core
```

Define the representation you want to expose:

```ts
import { Field, Serializer, ViewModel } from '@eidora/core';

interface IUser {
  readonly id: string;
  name: string;
  email: string;
  passwordHash: string;
}

@ViewModel()
class PublicUser {
  @Field
  id!: string;

  @Field({ name: 'displayName' })
  name!: string;
}

const user: IUser = {
  id: 'user-1',
  name: 'Alpha',
  email: 'alpha@example.com',
  passwordHash: 'private',
};

const result = new Serializer().serialize(user, {
  schema: PublicUser,
});

// { id: 'user-1', displayName: 'Alpha' }
```

Only fields marked with `@Field` appear in the result. Sensitive or internal
properties remain excluded unless a schema explicitly exposes them. The result
is typed as `PublicUser`, but remains a plain object at runtime.

See the [`@eidora/core` documentation](./packages/core/README.md) for computed
fields, serialization context, key transforms, API details, and current
limitations.

## Packages

| Package                                           | Description                                                                                |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`@eidora/core`](./packages/core)                 | View-model decorators, field mapping, serialization context, and recursive key transforms. |
| [`@eidora/arktype`](./packages/@adapters/arktype) | ArkType object-schema validation and serialization through the core adapter API.           |
| [`@eidora/zod`](./packages/@adapters/zod)         | Zod object-schema validation and serialization through the core adapter API.               |

## Repository

```text
packages/core/       Core serializer package
packages/@adapters/  External library adapters
samples/             Buildable usage examples
specs/               Technical specifications and design decisions
```

- [Core package documentation](./packages/core/README.md)
- [ArkType adapter documentation](./packages/@adapters/arktype/README.md)
- [Zod adapter documentation](./packages/@adapters/zod/README.md)
- [Core serializer specification](./specs/0001-core-serializer.md)
- [Zod adapter specification](./specs/0002-zod-adapter.md)
- [ArkType adapter specification](./specs/0004-arktype-adapter.md)
- [Core runnable examples](./samples/src/core)
- [ArkType per-property transform example](./samples/src/arktype/transform.ts)
- [Zod per-property transform example](./samples/src/zod/transform.ts)

## Development

This repository uses the pnpm version declared in `package.json`.

```sh
pnpm install

# Test and type-check the core package
pnpm --filter @eidora/core exec vitest run
pnpm --filter @eidora/core exec tsc --noEmit

# Build the workspace
pnpm build

# Check formatting and linting
pnpm exec oxfmt --check .
pnpm exec oxlint .
```

See [`AGENTS.md`](./AGENTS.md) for contribution conventions, validation
expectations, and specification requirements.
