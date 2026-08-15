# @eidora/hono-zod-middleware

## 0.0.2

### Patch Changes

- [#9](https://github.com/zgid123/eidora/pull/9) [`778b8d7`](https://github.com/zgid123/eidora/commit/778b8d7371efd3a98c5174364f579d452211e9bc) Thanks [@zgid123](https://github.com/zgid123)! - Add cache-preserving per-property contextual transforms for Zod and ArkType schemas, export the shared serialization context type, and let Hono response middleware merge request variables with optional additional serialization context.

- Updated dependencies [[`778b8d7`](https://github.com/zgid123/eidora/commit/778b8d7371efd3a98c5174364f579d452211e9bc)]:
  - @eidora/zod@0.0.2
  - @eidora/core@0.0.2

## 0.0.1

### Patch Changes

- [#5](https://github.com/zgid123/eidora/pull/5) [`646b4e0`](https://github.com/zgid123/eidora/commit/646b4e04601273c9ebda05a80359b1947a0a8f27) Thanks [@zgid123](https://github.com/zgid123)! - Add Hono response serialization middleware backed by Eidora's Zod adapter,
  with support for object and array data envelopes while preserving response
  metadata, status, and headers.
- Updated dependencies [[`9652911`](https://github.com/zgid123/eidora/commit/965291120ebdde4da048d58bc4c5327e7cdf09c4), [`9652911`](https://github.com/zgid123/eidora/commit/965291120ebdde4da048d58bc4c5327e7cdf09c4)]:
  - @eidora/zod@0.0.1
  - @eidora/core@0.0.1
