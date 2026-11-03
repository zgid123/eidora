# Zod Adapter

`@eidora/zod` provides lenient Zod object schema serialization for `@eidora/core`.

Unlike standard `zodSchema.parse()`—which throws on missing, unexpected, or invalid fields—`@eidora/zod` performs **lenient projection**:

- Exposes only properties declared by the schema (allowlist).
- Safely omits missing or invalid properties (unless a `.default()` or `.catch()` fallback is configured).
- Applies Zod coercions (`z.coerce.*`).
- Leaves source objects unmutated.

## Installation

```sh
pnpm add @eidora/core @eidora/zod zod
```

## Basic Usage with `Serializer`

Pass `ZodAdapter` to `Serializer` and supply a Zod object schema to `.serialize()`:

> [!TIP]
> **Pass Original Data Directly (e.g. from Drizzle ORM)**: Avoid manual field-by-field mapping before serialization. Pass the raw database record or domain entity directly into `serializer.serialize(rawEntity, { schema })`. Eidora acts as the allowlist—stripping unannotated fields like password hashes, tokens, and internal database columns automatically.

```ts
import { Serializer } from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  age: z.coerce.number(),
  bio: z.string(),
});

// Pass raw entity directly (e.g. from Drizzle ORM) without manual mapping
const rawUser = {
  id: 'usr_123',
  age: '28',
  passwordHash: 'secret_hash',
};

const serializer = new Serializer({
  adapter: new ZodAdapter(),
});

const result = serializer.serialize(rawUser, {
  schema: UserSchema,
});

// Result: { id: 'usr_123', age: 28 }
```

## Lenient Property Projection Rules

| Source Property State           | Schema Configuration           | Output Behavior                       |
| ------------------------------- | ------------------------------ | ------------------------------------- |
| Present and valid               | `z.string()`                   | Parsed and included                   |
| Present and coercible           | `z.coerce.number()`            | Coerced and included                  |
| Missing                         | `z.string()`                   | Omitted                               |
| Missing                         | `z.string().default('N/A')`    | Emits default value `'N/A'`           |
| Present but invalid             | `z.string()`                   | Omitted                               |
| Present but invalid             | `z.string().catch('fallback')` | Emits catch fallback `'fallback'`     |
| Not in schema                   | Any                            | Omitted (sensitive fields masked)     |
| Exception in transform callback | Custom transform               | Thrown exception propagates unchanged |

## Source Transforms (`createSchema`)

When you need an output property derived from raw source data that should not exist in the output schema, use `createSchema`:

```ts
import { Serializer } from '@eidora/core';
import { createSchema, ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  z.object({
    id: z.string(),
    name: z.string(),
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
  adapter: new ZodAdapter(),
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

- **Execution Order**: Property transforms execute against the raw source object **before** Zod parses the value.
- **Contract Enforcement**: The derived value is validated and coerced by the property's Zod schema.
- **Source Hygiene**: Source-only properties (like `translations`) do not need to be declared in the output Zod schema and are never leaked.

## Key Transforms

Combine Zod schemas with Eidora's recursive key transforms:

```ts
const result = new Serializer({
  adapter: new ZodAdapter(),
  transform: 'snake',
}).serialize(rawUser, {
  schema: UserSchema,
});
```

## Hono Web Framework Integration

`@eidora/hono-zod-middleware` provides automatic response serialization for Hono route handlers:

```ts
import { serialize } from '@eidora/hono-zod-middleware';
import { Hono } from 'hono';
import { z } from 'zod';

const UserResponseSchema = z.object({
  id: z.string(),
  displayName: z.string(),
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

For advanced features including arrays, metadata envelopes, and context-aware transforms, see the complete [Hono Zod Middleware Reference](./hono-zod.md).
