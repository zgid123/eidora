# `@morphos/core`

Decorator-driven TypeScript utilities for serializing application data into
explicit view-model objects.

## Installation

```sh
pnpm add @morphos/core
```

## Basic Usage

Decorate the schema class with `@ViewModel()` and each output field with
`@Field`:

```ts
import { Field, Serializer, ViewModel } from '@morphos/core';

interface IUser {
  readonly id: string;
  name: string;
  password: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field({ name: 'displayName' })
  name!: string;
}

const user: IUser = {
  id: 'user-1',
  name: 'Alpha',
  password: 'secret',
};

const result = new Serializer().serialize(user, {
  schema: UserViewModel,
});

// { id: 'user-1', displayName: 'Alpha' }
```

Undecorated properties are omitted. The source object is not mutated.

## Computed Fields and Context

A field mapper receives the complete source object and optional read-only
serialization context. Supply its source type to `Field` for strongly typed
mapping:

```ts
interface IUser {
  readonly id: string;
  firstName: string;
  lastName: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field<IUser>({
    map(user, context) {
      const separator = context?.['separator'];

      return [user.firstName, user.lastName].join(
        typeof separator === 'string' ? separator : ' ',
      );
    },
  })
  displayName!: string;
}

const result = new Serializer().serialize(
  {
    id: 'user-1',
    firstName: 'Alpha',
    lastName: 'Cifer',
  },
  {
    schema: UserViewModel,
    context: { separator: ' · ' },
  },
);

// { id: 'user-1', displayName: 'Alpha · Cifer' }
```

Context has the type `Readonly<Record<string, unknown>>`, so mapped fields must
narrow context values before using them.

## Key Transforms

The serializer recursively transforms keys to `camel`, `pascal`, or `snake`
case. Camel case is the default.

```ts
@ViewModel()
class ProfileViewModel {
  @Field
  profile_details!: {
    display_name: string;
  };
}

const serializer = new Serializer({ transform: 'snake' });

const result = serializer.serialize(
  {
    profile_details: {
      display_name: 'Alpha',
    },
  },
  {
    schema: ProfileViewModel,
    transform: 'pascal',
  },
);

// { ProfileDetails: { DisplayName: 'Alpha' } }
```

A transform passed to `serialize` overrides the constructor setting for that
call.

## API

### `@ViewModel()`

Registers a class as a serialization schema. Passing an undecorated schema to
`serialize` throws a `TypeError`.

### `@Field`

Includes a public instance field under its property name.

```ts
@Field
id!: string;
```

### `@Field(options)`

Accepts these options:

| Option | Type                          | Description                                                           |
| ------ | ----------------------------- | --------------------------------------------------------------------- |
| `name` | `string`                      | Output name before key transformation.                                |
| `map`  | `(data, context?) => unknown` | Computes the field value from the source object and optional context. |

Private, static, and symbol-keyed fields cannot be decorated with `@Field`.

### `new Serializer(options?)`

Creates a reusable serializer.

```ts
interface ISerializerOptions {
  readonly transform?: 'camel' | 'pascal' | 'snake';
}
```

The default transform is `camel`.

### `serializer.serialize(data, options)`

Serializes a non-null source object with the selected schema.

```ts
interface ISerializeOptions<TSchema> {
  readonly schema: TSchema;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly transform?: 'camel' | 'pascal' | 'snake';
}
```

The return type is `InstanceType<TSchema>`. The runtime value is deliberately a
plain object rather than an instance of the schema class; schema constructors
and field initializers are not executed.

## Behavior

- Fields are emitted in declaration order.
- Decorated fields remain present when their value is `undefined`.
- Field mappings and source getters may throw; their errors propagate unchanged.
- Output-key transforms apply recursively to nested objects.
- View-model registrations are isolated by class and cached in memory.

## Current Limitations

- Field mapping is synchronous.
- Field values are not validated or coerced at runtime.
- Circular references are not handled during recursive key transformation.
- Only public, non-static, string-keyed class fields are supported.

## Related Documentation

- [Core serializer technical specification](../../specs/0001-core-serializer.md)
- [Repository development guide](../../AGENTS.md)
- [Runnable samples](../../samples/src/core)
