# `@eidora/hono-zod-middleware`

Hono response serialization middleware backed by Eidora's Zod adapter.

## Installation

```sh
pnpm add @eidora/hono-zod-middleware hono zod
```

## Basic Usage

Pass a Zod object schema to `serialize` before the route handler:

```ts
import { serialize } from '@eidora/hono-zod-middleware';
import { Hono } from 'hono';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

const app = new Hono();

app.get('/users/:id', serialize(UserSchema), (context) => {
  return context.json({
    data: {
      id: context.req.param('id'),
      display_name: 'Alpha',
      password: 'secret',
    },
    meta: {
      requestId: 'request-1',
    },
  });
});
```

The response body is:

```json
{
  "data": {
    "id": "user-1",
    "displayName": "Alpha"
  },
  "meta": {
    "requestId": "request-1"
  }
}
```

The schema excludes `password`, and Eidora's default recursive camel-case
transform changes `display_name` to `displayName`. Properties outside `data`
are preserved without serialization.

## Response Behavior

After the downstream handler completes, the middleware inspects the response
and serializes its top-level `data` property when the response has an
`application/json` or `+json` media type.

| `data` value       | Behavior                                     |
| ------------------ | -------------------------------------------- |
| Object             | Serialized with the supplied Zod schema      |
| Array              | Every item is serialized; order is preserved |
| Nested array       | Items are serialized recursively             |
| `null`             | Preserved as `null`                          |
| Primitive          | Throws a `TypeError`                         |
| Property is absent | The response is returned unchanged           |

Non-JSON responses are also returned unchanged. When a response is rewritten,
its status, status text, headers, and other envelope properties are preserved.
The existing `Content-Length` header is removed so the runtime can calculate
the replacement body's length.

## Array Responses

Use the same object schema for an array under `data`:

```ts
app.get('/users', serialize(UserSchema), (context) => {
  return context.json({
    data: [
      {
        id: 'user-1',
        display_name: 'Alpha',
        password: 'secret-1',
      },
      {
        id: 'user-2',
        display_name: 'Beta',
        password: 'secret-2',
      },
    ],
  });
});
```

Each item is serialized independently with `UserSchema`.

## Serialization Context

The middleware merges Hono's request-scoped variables (`context.var`) with an
optional serialization context passed as the second argument to `serialize`.
Additional values override request variables with the same key. Populate
request variables with `context.set(...)`, then read both sources from a
contextual schema transform:

```ts
import { createSchema } from '@eidora/zod';

const ContextUserSchema = createSchema(UserSchema, {
  transform: {
    id(data, context) {
      return `${String(context?.['tenantId'])}:${data.id}:${String(context?.['audience'])}`;
    },
  },
});

app.get(
  '/users/:id',
  serialize(ContextUserSchema, {
    audience: 'public',
  }),
  (context) => {
    context.set('tenantId', 'tenant-1');

    return context.json({
      data: {
        id: context.req.param('id'),
        display_name: 'Alpha',
      },
    });
  },
);
```

## Error Handling

A primitive `data` value throws with this message:

```text
Serialized response data must be an object, array, or null.
```

Serialization failures, including exceptions from Zod transforms, propagate
through Hono's normal error handling and can be handled with `app.onError`.

## Zod Serialization Semantics

The middleware uses `@eidora/zod`. Unknown properties are omitted, coercions
and property transforms are applied, and properties that fail ordinary Zod
validation are omitted. See the
[Zod adapter documentation](../../../@adapters/zod/README.md) for its complete
schema support and validation behavior.
