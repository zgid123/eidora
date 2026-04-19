---
name: E2E Test
description: End-to-end test guidelines for Alpha's Vitest projects
---

# E2E Test

End‑to‑end (E2E) tests exercise the system as a whole through its public interfaces (HTTP, UI, etc.).

- **Controllers, adapters, and route handlers are always tested with E2E tests.** Never write an integration test for a controller or route — if you are testing an HTTP handler, a GraphQL resolver, or a gRPC handler, the test file must be `*.e2e.ts`.
- Filename convention: `*.e2e.ts`.
- Location: under `src/__tests__` (for example `src/__tests__/e2e/...`).
- Only mock 3rd‑party requests using [Mock Service Worker](https://mswjs.io/); keep application code and database real (or a real test schema).

## Hono framework

### With Drizzle ORM

```ts
import { HonoTest, serializeData } from '@alphacifer/hono/testing';

import { initHono, type TApp } from '~/adapters/restful';
import { BookEntity } from '~/domain/book';
import type { TBook } from '~/infrastructure/drizzle/schemas/books';

import { drizzle } from '../../../../config/drizzle';
import { bookFactory } from '../../../../factories/drizzle/BookFactory';

describe('[V1 API] Books', () => {
  let app: TApp;
  let book: TBook;

  beforeAll(async () => {
    app = await initHono({
      drizzle,
    });
  });

  beforeEach(async () => {
    book = await bookFactory.create();
  });

  describe('GET /api/v1/books', () => {
    suite('when book is existing', () => {
      it('returns list books', async () => {
        const response = await HonoTest.create(app).get('/api/v1/books');

        expect(response.jsonData.data).toEqual([serializeData(BookEntity.create(book).toJSON())]);
      });
    });
  });
});
```
