# Morphos

Morphos is a TypeScript serializer for projecting application data into small,
explicit view-model objects. Its decorator-based schemas make the output shape
easy to read while preventing undeclared properties, such as credentials or
internal state, from leaking into serialized results.

## Packages

| Package                            | Description                                                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| [`@morphos/core`](./packages/core) | View-model decorators, field mapping, serialization context, and recursive key transforms. |

Adapter packages for schema and validation libraries are planned under
`packages/@adapters`.

## Quick Start

Install the core package:

```sh
pnpm add @morphos/core
```

Define a view model and serialize an object:

```ts
import { Field, Serializer, ViewModel } from '@morphos/core';

interface IUser {
  readonly id: string;
  name: string;
  password: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field({ name: 'displayName' })
  name!: string;
}

const result = new Serializer().serialize(
  {
    id: 'user-1',
    name: 'Alpha',
    password: 'secret',
  },
  { schema: UserViewModel },
);

// { id: 'user-1', displayName: 'Alpha' }
```

Only fields marked with `@Field` are included. The result is typed as
`UserViewModel`, but is a plain object at runtime.

See the [`@morphos/core` README](./packages/core/README.md) for field mapping,
serialization context, key transforms, API details, and limitations.

## Repository Structure

```text
packages/core/       Core serializer package
packages/@adapters/  External library adapters
samples/             Buildable usage examples
specs/               Numbered technical specifications
```

The first design specification is
[`0001-core-serializer`](./specs/0001-core-serializer.md).

## Development

Morphos uses pnpm workspaces and requires the pnpm version declared in
`package.json`.

```sh
pnpm install

# Run the core tests
pnpm --filter @morphos/core exec vitest run

# Type-check the core package
pnpm --filter @morphos/core exec tsc --noEmit

# Build all workspace packages
pnpm build

# Check formatting and linting
pnpm exec oxfmt --check .
pnpm exec oxlint .
```

Build output is written to each package's `lib` directory.

## Contributing

Read [`AGENTS.md`](./AGENTS.md) for repository conventions, validation
expectations, and specification numbering. User-visible package changes should
include focused tests and a Changesets entry when they are prepared for
release.
