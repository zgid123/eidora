# `@eidora/hono-arktype-middleware`

Hono response serialization middleware backed by Eidora's ArkType adapter.

## Installation

```sh
pnpm add @eidora/hono-arktype-middleware arktype hono
```

## Basic Usage

Pass an ArkType object schema to `serialize` before the route handler:

```ts
import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { Hono } from 'hono';

const UserSchema = type({
  id: 'string',
  display_name: 'string',
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
| Object             | Serialized with the supplied ArkType schema  |
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
import { createSchema } from '@eidora/arktype';

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

Serialization failures, including exceptions from ArkType morphs, propagate
through Hono's normal error handling and can be handled with `app.onError`.

## ArkType Serialization Semantics

The middleware uses `@eidora/arktype`. Unknown, missing, and invalid root
properties are omitted, while successful constraints, morphs, defaults, and
nested validation are preserved. See the
[ArkType adapter documentation](https://www.npmjs.com/package/@eidora/arktype)
for its complete schema support and validation behavior.
