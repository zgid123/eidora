---
'@eidora/arktype': patch
'@eidora/zod': patch
'@eidora/hono-arktype-middleware': patch
'@eidora/hono-zod-middleware': patch
---

Run created-schema property transforms against raw source data before native
output parsing, with explicit callback annotations for typed source-only
properties while preserving the existing `createSchema(schema, options)` API.
