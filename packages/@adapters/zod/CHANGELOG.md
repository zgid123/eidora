# @eidora/zod

## 0.0.3

### Patch Changes

- [#11](https://github.com/zgid123/eidora/pull/11) [`adcbae0`](https://github.com/zgid123/eidora/commit/adcbae074e2a0f97d4658626fd472ec0074069c7) Thanks [@zgid123](https://github.com/zgid123)! - Run created-schema property transforms against raw source data before native
  output parsing, with explicit callback annotations for typed source-only
  properties while preserving the existing `createSchema(schema, options)` API.
- Updated dependencies [[`7a02061`](https://github.com/zgid123/eidora/commit/7a02061438f1f6b334f1db31ba34d5c6596e2593)]:
  - @eidora/core@0.0.3

## 0.0.2

### Patch Changes

- [#9](https://github.com/zgid123/eidora/pull/9) [`778b8d7`](https://github.com/zgid123/eidora/commit/778b8d7371efd3a98c5174364f579d452211e9bc) Thanks [@zgid123](https://github.com/zgid123)! - Add cache-preserving per-property contextual transforms for Zod and ArkType schemas, export the shared serialization context type, and let Hono response middleware merge request variables with optional additional serialization context.

- Updated dependencies [[`778b8d7`](https://github.com/zgid123/eidora/commit/778b8d7371efd3a98c5174364f579d452211e9bc)]:
  - @eidora/core@0.0.2

## 0.0.1

### Patch Changes

- [#3](https://github.com/zgid123/eidora/pull/3) [`9652911`](https://github.com/zgid123/eidora/commit/965291120ebdde4da048d58bc4c5327e7cdf09c4) Thanks [@zgid123](https://github.com/zgid123)! - Add the Zod adapter with lenient property projection, cached schema
  redefinition, partial result inference, and direct object-to-object transforms.
- Updated dependencies [[`9652911`](https://github.com/zgid123/eidora/commit/965291120ebdde4da048d58bc4c5327e7cdf09c4)]:
  - @eidora/core@0.0.1
