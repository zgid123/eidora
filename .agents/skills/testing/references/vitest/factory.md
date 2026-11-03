---
name: Test Factory
description: Guidelines for creating test data factories in Vitest projects
---

# Test Factory

Use `fishery` and `@faker-js/faker` to create reusable, realistic test data for Vitest tests.

## Factory boilerplate (generic)

```ts
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

interface IBook {
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

class BookFactory extends Factory<IBook> {
  trait(): this {
    return this.params({
      // property for this trait
    });
  }
}

export const bookFactory = BookFactory.define(({ params, onCreate }) => {
  onCreate(async (book) => {
    // insert book to db using ORM
    // return the record
    return book;
  });

  const {
    title = faker.book.title(),
    createdAt = new Date(),
    updatedAt = new Date(),
    ...book
  } = params;

  return {
    title,
    createdAt,
    updatedAt,
    ...book,
  };
});
```

## Drizzle factory

Factory boilerplate for Drizzle ORM entities, using a test schema.

```ts
// src/infrastructure/drizzle/schemas/books.ts
import { relations } from '@alphacifer/drizzle/core';
import { bigint, pgTable, timestamp, varchar } from '@alphacifer/drizzle/pg';

export const books = pgTable('books', {
  id: bigint({
    mode: 'bigint',
  })
    .primaryKey()
    .generatedAlwaysAsIdentity(),
  createdAt: timestamp({
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp({
    mode: 'date',
  })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  title: varchar().notNull(),
  type: varchar().notNull(),
});

export const booksRelations = relations(books, () => {
  return {};
});

export type TBook = typeof books.$inferSelect;

export type TNewBook = typeof books.$inferInsert;
```

```ts
// __tests__/factories/drizzle/BookFactory.ts
import { testSchema } from '@alphacifer/drizzle/testing';
import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import { books, type TBook } from '#/infrastructure/drizzle/schemas/books';

import { drizzle } from '../../config/drizzle';

class BookFactory extends Factory<TBook> {
  fantasy(): this {
    return this.params({
      type: 'Fantasy',
    });
  }
}

export const bookFactory = BookFactory.define(({ params, onCreate }) => {
  onCreate(async (book) => {
    await drizzle.$client.query(`SET search_path TO ${testSchema}`);
    const [insertedBook] = await drizzle
      .insert(books)
      .values({
        type: book.type,
        title: book.title,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      })
      .returning();

    return insertedBook;
  });

  const {
    id = BigInt(faker.number.int({ min: 1, max: 10_000 })),
    title = faker.book.title(),
    type = 'General',
    createdAt = new Date(),
    updatedAt = new Date(),
    ...book
  } = params;

  return {
    id,
    title,
    type,
    createdAt,
    updatedAt,
    ...book,
  };
});

export interface IBookTranslation {
  id: bigint;
  bookId: bigint;
  locale: string;
  title: string;
}

export const bookTranslationFactory = Factory.define<IBookTranslation>(({ params }) => {
  const {
    id = BigInt(faker.number.int({ min: 1, max: 10_000 })),
    bookId = BigInt(1),
    locale = 'en',
    title = faker.book.title(),
  } = params;

  return {
    id,
    bookId,
    locale,
    title,
  };
});
```
