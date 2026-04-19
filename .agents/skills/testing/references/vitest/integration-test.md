---
name: Integration Test
description: Integration test guidelines for Alpha's Vitest projects
---

# Integration Test

Integration tests verify how multiple modules work together (for example repositories + database).

- Filename convention: `*.spec.ts`.
- Location: under `src/__tests__`, mirroring the source folder (for example `src/__tests__/infrastructure/...`).
- Only mock 3rd‑party requests using [Mock Service Worker](https://mswjs.io/); keep repositories and database real (or using a real test schema).

## Example: Drizzle ORM

```ts
import { eq } from '@alphacifer/drizzle/core';

import { BookEntity, BookTranslationEntity } from '~/domain/book';
import { BookRepositoryV1 } from '~/infrastructure/drizzle/repositories/book/BookRepositoryV1';
import { books, type TBook, type TBookTranslation } from '~/infrastructure/drizzle/schemas/books';

import { drizzle } from '../../../../config/drizzle';
import { bookFactory, bookTranslationFactory } from '../../../../factories/drizzle/BookFactory';

describe('#BookRepositoryV1', () => {
  let subject: BookRepositoryV1;
  let book: TBook;
  let bookTranslation: TBookTranslation;

  beforeEach(async () => {
    book = await bookFactory.create();
    bookTranslation = await bookTranslationFactory.create({
      bookId: book.id,
    });

    subject = new BookRepositoryV1(drizzle);
  });

  describe('.findAll', () => {
    suite('when book is existing', () => {
      it('returns book list', async () => {
        const result = await subject.findAll();

        expect(result).toEqual([
          BookEntity.create({
            ...book,
            translations: [BookTranslationEntity.create(bookTranslation)],
          }),
        ]);
      });
    });

    suite('when no book exists', () => {
      it('returns empty list', async () => {
        await drizzle.delete(books).where(eq(books.id, book.id));
        const result = await subject.findAll();

        expect(result).toEqual([]);
      });
    });
  });
});
```
