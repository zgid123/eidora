---
name: eidora
description: Type-safe TypeScript serialization and view-model projection with @eidora/core, Stage 3 decorators (@ViewModel, @Field), and adapters for Zod and ArkType. Use whenever defining view models, projecting domain entities into DTOs, masking sensitive fields, creating API response schemas, transforming object key casing (camel, snake, pascal), or integrating response serialization with Hono middleware in TypeScript applications.
---

# Eidora

Eidora (`@eidora/core`) is a type-safe serialization library for TypeScript. It projects domain entities into explicit view-model representations without mutating source objects or executing view-model constructors.

## When to Use Eidora

- Defining clean API response payloads and view models.
- Masking sensitive properties (passwords, internal IDs, tokens) via an allowlist model.
- Renaming or computing derived fields from source data and runtime context.
- Converting object key casing recursively (`camelCase`, `PascalCase`, `snake_case`).
- Serializing domain models with Stage 3 decorators or schema adapters (Zod, ArkType).
- Integrating automatic response serialization in Hono applications.

## Core Recommendation: Use Raw Data, Avoid Manual Mapping

> [!TIP]
> **Do not write manual field-by-field mapping**: A common anti-pattern in controllers and services is manually picking and constructing response DTO objects (e.g. `{ id: user.id, name: user.name }`).
>
> With Eidora, always pass the **original raw data** directly (e.g., query results from Drizzle ORM, Prisma, or your domain repository). Eidora enforces an allowlist: unannotated and sensitive fields (such as `passwordHash`, `twoFactorSecret`, or internal database flags) are excluded automatically.
>
> In Hono applications with Eidora middleware, route handlers simply fetch from the database and return the raw record wrapped in `{ data: rawRecord }`—no manual mapping needed:
>
> ```ts
> const user = await db.query.users.findFirst({
>   where: eq(users.id, id),
> });
>
> return context.json({
>   data: user,
> });
> ```

## Packages

| Package                           | Purpose                                                | Documentation                                          |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `@eidora/core`                    | Core decorators, `Serializer`, key transforms, context | This skill                                             |
| `@eidora/zod`                     | Lenient Zod object projection & `createSchema`         | [Zod Reference](./references/zod.md)                   |
| `@eidora/arktype`                 | Lenient ArkType object projection & `createSchema`     | [ArkType Reference](./references/arktype.md)           |
| `@eidora/hono-zod-middleware`     | Hono route serialization for Zod                       | [Hono Zod Reference](./references/hono-zod.md)         |
| `@eidora/hono-arktype-middleware` | Hono route serialization for ArkType                   | [Hono ArkType Reference](./references/hono-arktype.md) |

## Installation

```sh
pnpm add @eidora/core
# or npm install @eidora/core / yarn add @eidora/core
```

> [!NOTE]
> Eidora uses standard ECMAScript (Stage 3) decorators, supported natively in TypeScript 5.0+ without requiring `experimentalDecorators`.

## Quick Start (Decorators)

```ts
import { Field, Serializer, ViewModel } from '@eidora/core';

interface IUser {
  readonly id: string;
  name: string;
  email: string;
  passwordHash: string;
}

@ViewModel()
class PublicUserViewModel {
  @Field
  id!: string;

  @Field({
    name: 'displayName',
  })
  name!: string;
}

const user: IUser = {
  id: 'usr_100',
  name: 'Alpha Cifer',
  email: 'alpha@example.com',
  passwordHash: '$2b$12$e8x...',
};

const serializer = new Serializer();
const result = serializer.serialize(user, {
  schema: PublicUserViewModel,
});

// Result: { id: 'usr_100', displayName: 'Alpha Cifer' }
// Note: email and passwordHash are omitted; result is a plain object typed as PublicUserViewModel.
```

## Core Decorators

### `@ViewModel()`

Marks a class as an Eidora view-model schema.
Passing an undecorated class to `serialize()` throws a `TypeError`.

```ts
@ViewModel()
class OrderViewModel {
  // ...
}
```

### `@Field`

Exposes a class property in the serialized output:

```ts
@Field
id!: string;
```

Properties without `@Field` are excluded from serialized output.

### `@Field(options)`

Customizes output field name and value transformation:

| Option      | Type                                                      | Description                                                  |
| ----------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| `name`      | `string`                                                  | Output property name before key casing transformation.       |
| `transform` | `(data: TSource, context?: TSerializeContext) => unknown` | Derives field value from source object and optional context. |

#### Renaming Fields

```ts
@Field({
  name: 'accountIdentifier',
})
id!: string;
```

#### Computed and Transformed Fields

Supply the source entity type as a generic parameter to `Field` for type-safe transforms:

```ts
interface IUserSource {
  firstName: string;
  lastName: string;
}

@ViewModel()
class UserViewModel {
  @Field<IUserSource>({
    transform(user, context) {
      const separator = context?.['separator'];
      const sep = typeof separator === 'string' ? separator : ' ';

      return `${user.firstName}${sep}${user.lastName}`;
    },
  })
  fullName!: string;
}
```

## Serialization Context

Pass runtime contextual information (e.g., active user, locale, formatting options) to `serialize`:

```ts
const result = new Serializer().serialize(user, {
  schema: UserViewModel,
  context: {
    separator: ' · ',
  },
});
```

Context has type `TSerializeContext` (`Readonly<Record<string, unknown>>`). Always narrow context values before using them.

## Key Casing Transforms

The serializer recursively transforms output object keys to `'camel'`, `'pascal'`, or `'snake'` case. Camel case is the default.

```ts
// Set default casing at instance creation
const serializer = new Serializer({
  transform: 'snake',
});

// Or override per serialization call
const result = serializer.serialize(data, {
  schema: UserViewModel,
  transform: 'pascal',
});
```

For nested objects, arrays, and naming interactions, see [Key Transforms Reference](./references/key-transforms.md).

## Critical Rules and Constraints

1. **Plain Object Output**: Output is a plain JavaScript object. View-model constructors and property initializers **do not run** (`instanceof Schema` is `false`).
2. **Return Type**: Inferred statically as `InstanceType<TSchema>`.
3. **Allowlist Principle**: Any property not decorated with `@Field` is omitted.
4. **Undefined Preservation**: Decorated fields whose values evaluate to `undefined` remain present in the output.
5. **Declaration Order**: Serialized fields are emitted in class property declaration order.
6. **Property Target Restrictions**: Private (`#field`), `static`, and symbol-keyed properties cannot be decorated with `@Field`.
7. **Error Propagation**: Any exception thrown inside a getter or `transform` callback propagates unchanged.
8. **Immutability**: Source objects and context objects are never mutated.

## Schema Adapters & Ecosystem

- **Zod Schemas**: See [Zod Reference](./references/zod.md) for `@eidora/zod` (`ZodAdapter`, `createSchema`, and lenient projection).
- **ArkType Schemas**: See [ArkType Reference](./references/arktype.md) for `@eidora/arktype` (`ArkTypeAdapter`, `createSchema`, and lenient projection).
- **Hono with Zod**: See [Hono Zod Reference](./references/hono-zod.md) for `@eidora/hono-zod-middleware` response serialization.
- **Hono with ArkType**: See [Hono ArkType Reference](./references/hono-arktype.md) for `@eidora/hono-arktype-middleware` response serialization.
- **Custom Adapters**: See [Adapters Reference](./references/adapters.md) for implementing `IAdapter` with other schema libraries.
