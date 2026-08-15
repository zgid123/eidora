---
'@eidora/arktype': patch
'@eidora/zod': patch
'@eidora/core': patch
'@eidora/hono-zod-middleware': patch
'@eidora/hono-arktype-middleware': patch
---

Add cache-preserving per-property contextual transforms for Zod and ArkType schemas, export the shared serialization context type, and let Hono response middleware merge request variables with optional additional serialization context.
