# Hono ArkType Middleware Reference

`@eidora/hono-arktype-middleware` provides route-level JSON response serialization for the [Hono](https://hono.dev) web framework using ArkType schemas.

It intercepts outgoing responses, filters fields against an allowlist defined by your ArkType schema, masks sensitive data, and applies coercions and transforms.

## Installation

```sh
pnpm add @eidora/core @eidora/arktype @eidora/hono-arktype-middleware hono arktype
```

## How the Middleware Works

The `serialize()` middleware runs after your route handler completes (`await next()`):

1. **Content-Type Filter**: Inspects `context.res`. Only responses with an `application/json` or `*+json` media type are intercepted. Non-JSON responses pass through unchanged.
2. **Envelope Requirement**: Checks if the JSON body is an object containing a top-level `data` key (`{ data: ... }`). JSON responses without a `data` key pass through unchanged.
3. **Data Serialization**:
   - **Single Object**: Serialized using the ArkType schema via `@eidora/arktype`.
   - **Array of Objects**: Each item in the array is serialized preserving order.
   - **Null**: `null` inside `data` is preserved as `null`.
   - **Primitive**: Throws a `TypeError` (`Serialized response data must be an object, array, or null.`).
4. **Preserved Envelope Metadata**: Any properties outside `data` (e.g., `meta`, `pagination`, `links`) are preserved untouched.
5. **Headers and Status**: HTTP status codes, status text, and custom response headers are preserved. `Content-Length` is recalculated automatically.

## Core Recommendation: Pass Original Data Directly (e.g., Drizzle ORM)

> [!TIP]
> **Never manually map fields in route handlers**: When using `@eidora/hono-arktype-middleware`, do not write manual boilerplate to transform database records into response objects. Pass the original database query result (such as a Drizzle ORM record) directly to `context.json({ data: result })`.
>
> The middleware automatically strips unexposed columns (like `password_hash` or `two_factor_secret`), coerces types, and formats key casing.

```ts
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from './db';
import { users } from './schema';

const UserResponseSchema = type({
  id: 'string',
  displayName: 'string',
  email: 'string.email',
});

export const app = new Hono();

// Single record: fetch from Drizzle and return directly
app.get('/api/users/:id', serialize(UserResponseSchema), async (context) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, context.req.param('id')),
  });

  if (!user) {
    return context.json(
      {
        error: 'User not found',
      },
      404,
    );
  }

  // Return the raw Drizzle record directly!
  // Eidora extracts id, displayName, email and omits sensitive columns.
  return context.json({
    data: user,
  });
});

// Array of records: fetch from Drizzle and return directly
app.get('/api/users', serialize(UserResponseSchema), async (context) => {
  const allUsers = await db.query.users.findMany();

  return context.json({
    data: allUsers,
  });
});
```

## Core Recommendation: Pass Original Data Directly (e.g., Drizzle ORM)

> [!TIP]
> **Never manually map fields in route handlers**: When using `@eidora/hono-arktype-middleware`, do not write manual boilerplate to transform database records into response objects. Pass the original database query result (such as a Drizzle ORM record) directly to `context.json({ data: result })`.
>
> The middleware automatically strips unexposed columns (like `password_hash` or `two_factor_secret`), coerces types, and formats key casing.

```ts
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { db } from './db';
import { users } from './schema';

const UserResponseSchema = type({
  id: 'string',
  displayName: 'string',
  email: 'string.email',
});

export const app = new Hono();

// Single record: fetch from Drizzle and return directly
app.get(
  '/api/users/:id',
  serialize(UserResponseSchema),
  async (context) => {
    const user = await db.query.users.findFirst({
      where: eq(users.id, context.req.param('id')),
    });

    if (!user) {
      return context.json(
        {
          error: 'User not found',
        },
        404,
      );
    }

    // Return the raw Drizzle record directly!
    // Eidora extracts id, displayName, email and omits sensitive columns.
    return context.json({
      data: user,
    });
  },
);

// Array of records: fetch from Drizzle and return directly
app.get(
  '/api/users',
  serialize(UserResponseSchema),
  async (context) => {
    const allUsers = await db.query.users.findMany();

    return context.json({
      data: allUsers,
    });
  },
);
```

## Basic Usage

```ts
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { Hono } from 'hono';

const UserResponseSchema = type({
  id: 'string',
  displayName: 'string',
  email: 'string.email',
});

interface IUserEntity {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly internalNotes: string;
}

export const app = new Hono();

app.get('/api/users/:id', serialize(UserResponseSchema), (context) => {
  const user: IUserEntity = {
    id: context.req.param('id'),
    displayName: 'Alpha Cifer',
    email: 'alpha@example.com',
    passwordHash: '$2b$12$e8x...',
    internalNotes: 'Confidential employee data',
  };

  return context.json({
    data: user,
  });
});

// Client receives:
// {
//   "data": {
//     "id": "usr_100",
//     "displayName": "Alpha Cifer",
//     "email": "alpha@example.com"
//   }
// }
// (passwordHash and internalNotes are excluded)
```

## Array Serialization with Envelope Metadata

The middleware serializes every item in an array when `data` is an array. Top-level envelope fields like `meta` remain untouched:

```ts
app.get('/api/users', serialize(UserResponseSchema), (context) => {
  const users: ReadonlyArray<IUserEntity> = [
    {
      id: 'usr_1',
      displayName: 'Alpha',
      email: 'alpha@example.com',
      passwordHash: 'secret_1',
      internalNotes: 'note_1',
    },
    {
      id: 'usr_2',
      displayName: 'Beta',
      email: 'beta@example.com',
      passwordHash: 'secret_2',
      internalNotes: 'note_2',
    },
  ];

  return context.json({
    meta: {
      page: 1,
      total: 2,
    },
    data: users,
  });
});

// Client receives:
// {
//   "meta": { "page": 1, "total": 2 },
//   "data": [
//     { "id": "usr_1", "displayName": "Alpha", "email": "alpha@example.com" },
//     { "id": "usr_2", "displayName": "Beta", "email": "beta@example.com" }
//   ]
// }
```

## Context-Aware Transforms with `createSchema`

Combine `createSchema` with Hono to compute fields from raw source entities and runtime context:

```ts
import { createSchema } from '@eidora/arktype';
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { Hono } from 'hono';

interface IProductEntity {
  readonly id: string;
  readonly basePrice: number;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly title: string;
  }>;
}

const ProductResponseSchema = createSchema(
  type({
    id: 'string',
    title: 'string',
    formattedPrice: 'string',
  }),
  {
    transform: {
      title(product: Readonly<IProductEntity>, context) {
        const locale = context?.['locale'];

        return (
          product.translations.find((item) => {
            return item.locale === locale;
          })?.title ?? 'Untitled'
        );
      },
      formattedPrice(product: Readonly<IProductEntity>, context) {
        const currency = context?.['currency'];
        const symbol = currency === 'EUR' ? '€' : '$';

        return `${symbol}${product.basePrice.toFixed(2)}`;
      },
    },
  },
);

export const app = new Hono();

// Extract locale and currency in upstream middleware
app.use('*', async (context, next) => {
  context.set('locale', context.req.header('accept-language') ?? 'en');
  context.set('currency', 'USD');

  await next();
});

// context.var is automatically passed into the serialization context!
app.get('/api/products/:id', serialize(ProductResponseSchema), (context) => {
  const product: IProductEntity = {
    id: 'prod_1',
    basePrice: 49.99,
    translations: [
      {
        locale: 'en',
        title: 'Mechanical Keyboard',
      },
      {
        locale: 'vi',
        title: 'Bàn phím cơ',
      },
    ],
  };

  return context.json({
    data: product,
  });
});
```

## Passing Explicit Additional Context

You can also pass `additionalContext` as the second argument to `serialize`:

```ts
app.get(
  '/api/products/:id',
  serialize(ProductResponseSchema, {
    currency: 'EUR',
  }),
  (context) => {
    return context.json({
      data: product,
    });
  },
);
```

The serialization context merges `context.var` with `additionalContext`, with `additionalContext` taking precedence.

## Sub-Router and Path-Level Registration

Apply serialization to all routes matching a path pattern:

```ts
const api = new Hono();

api.use('/users/*', serialize(UserResponseSchema));

api.get('/users/:id', (context) => {
  return context.json({
    data: fetchUser(context.req.param('id')),
  });
});
```
