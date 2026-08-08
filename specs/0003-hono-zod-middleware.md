# 0003 — Hono Zod Serialization Middleware

## Status

Implemented

## Summary

`@eidora/hono-zod-middleware` exports a Hono middleware named `serialize`. It
rewrites the top-level `data` property of a JSON response with Eidora's
Zod-backed serializer after the route handler completes.

## Goals

- Keep route handlers responsible for returning ordinary Hono responses.
- Serialize a single object or every object in an array under `data`.
- Preserve response envelope properties, status, status text, and headers.
- Leave unrelated JSON and non-JSON responses unchanged.

## Public Contract

```ts
import { serialize } from '@eidora/hono-zod-middleware';

app.get('/', serialize(UserSchema), async (context) => {
  return context.json({
    data: user,
  });
});
```

`serialize` accepts a Zod object schema supported by `@eidora/zod` and uses
Hono's `createMiddleware` factory to return a `MiddlewareHandler`.

## Technical Design

The middleware calls `await next()` and then inspects `context.res`. Responses
whose media type is `application/json` or has a `+json` suffix are decoded. If
the decoded value is an object with a `data` property, the middleware serializes
that property and creates a replacement response.

- Object values are serialized once.
- Array values are serialized item by item, including nested arrays.
- `null` remains `null`.
- Primitive `data` values throw a `TypeError`.

All other top-level properties are copied unchanged. The original response
status, status text, and headers are retained. `Content-Length` is removed so
the runtime can calculate the length of the replacement body.

## Error Behavior

- A JSON body without a `data` property is returned unchanged.
- A non-JSON response is returned unchanged.
- Primitive `data` values throw
  `Serialized response data must be an object, array, or null.`
- Zod transform exceptions propagate through Hono's normal error handling.

## Required Behavior

- Unknown source properties are excluded by the Zod adapter.
- Eidora's default recursive camel-case key transformation is applied.
- Array order is preserved.
- Response envelope metadata is not serialized.
- Response status and custom headers are preserved.

## Non-Goals

- Serializing arbitrary properties outside the top-level `data` envelope.
- Changing request validation behavior.
- Inferring a rewritten Hono RPC response type from runtime middleware.
