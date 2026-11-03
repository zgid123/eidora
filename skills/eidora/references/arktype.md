# ArkType Adapter

`@eidora/arktype` provides lenient ArkType schema serialization for `@eidora/core`.

It couples ArkType's concise syntax and high runtime performance with Eidora's view-model projection:

- Exposes only properties declared in the ArkType schema.
- Safely omits missing or invalid properties (unless defaults are configured).
- Applies native ArkType morphs and coercions.
- Retains source immutability.

## Installation

```sh
pnpm add @eidora/core @eidora/arktype arktype
```

## Basic Usage with `Serializer`

Pass `ArkTypeAdapter` to `Serializer` and supply an ArkType schema:

> [!TIP]
> **Pass Original Data Directly (e.g. from Drizzle ORM)**: Avoid manual field-by-field mapping before serialization. Pass the raw database record or domain entity directly into `serializer.serialize(rawEntity, { schema })`. Eidora acts as the allowlist—stripping unannotated fields like password hashes, tokens, and internal database columns automatically.

```ts
import { Serializer } from '@eidora/core';
import { ArkTypeAdapter } from '@eidora/arktype';
import { type } from 'arktype';

const UserSchema = type({
  id: 'string',
  name: 'string',
  'age?': 'number',
});

// Pass raw entity directly (e.g. from Drizzle ORM) without manual mapping
const rawUser = {
  id: 'usr_456',
  name: 'Alpha',
  passwordHash: 'secret_hash',
};

const serializer = new Serializer({
  adapter: new ArkTypeAdapter(),
});

const result = serializer.serialize(rawUser, {
  schema: UserSchema,
});

// Result: { id: 'usr_456', name: 'Alpha' }
```

## Lenient Property Projection Rules

| Source Property State           | Schema Configuration            | Output Behavior                       |
| ------------------------------- | ------------------------------- | ------------------------------------- |
| Present and valid               | `'string'`                      | Parsed and included                   |
| Present and coercible           | Native ArkType morph / coercion | Coerced and included                  |
| Missing                         | Declared property               | Omitted                               |
| Missing                         | Property with default value     | Emits configured default              |
| Present but invalid             | Declared property               | Omitted                               |
| Not declared in schema          | Any                             | Omitted (sensitive fields masked)     |
| Exception in transform callback | Custom transform                | Thrown exception propagates unchanged |

## Source Transforms (`createSchema`)

When an output property must be computed from raw source data that shouldn't appear in the output schema:

```ts
import { Serializer } from '@eidora/core';
import { ArkTypeAdapter, createSchema } from '@eidora/arktype';
import { type } from 'arktype';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  type({
    id: 'string',
    name: 'string',
  }),
  {
    transform: {
      name(data: Readonly<IUserSource>, context) {
        const locale = context?.['locale'];

        return (
          data.translations.find((item) => {
            return item.locale === locale;
          })?.name ?? ''
        );
      },
    },
  },
);

const serializer = new Serializer({
  adapter: new ArkTypeAdapter(),
});

const result = serializer.serialize(
  {
    id: 'user-1',
    translations: [
      {
        locale: 'en',
        name: 'Alpha',
      },
      {
        locale: 'vi',
        name: 'An',
      },
    ],
  },
  {
    schema: UserSchema,
    context: {
      locale: 'vi',
    },
  },
);

// Result: { id: 'user-1', name: 'An' }
```

### Key Behaviors of `createSchema`

- **Execution Order**: Property transforms execute against the raw source object **before** ArkType validates the value.
- **Contract Enforcement**: The transformed value is validated against the property's ArkType definition.
- **Source Hygiene**: Intermediate source fields (like `translations`) are kept out of the output schema.

## Key Transforms

Combine ArkType schemas with recursive casing transforms:

```ts
const result = new Serializer({
  adapter: new ArkTypeAdapter(),
  transform: 'snake',
}).serialize(rawUser, {
  schema: UserSchema,
});
```

## Hono Web Framework Integration

`@eidora/hono-arktype-middleware` provides automatic response serialization for Hono route handlers:

```ts
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { Hono } from 'hono';

const UserResponseSchema = type({
  id: 'string',
  displayName: 'string',
});

export const app = new Hono().get(
  '/api/users/:id',
  serialize(UserResponseSchema),
  (context) => {
    return context.json({
      data: {
        id: context.req.param('id'),
        displayName: 'Alpha',
        passwordHash: 'secret_hash',
      },
    });
  },
);
```

For advanced features including arrays, metadata envelopes, and context-aware transforms, see the complete [Hono ArkType Middleware Reference](./hono-arktype.md).
