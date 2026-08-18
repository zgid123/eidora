# `@eidora/zod`

Lenient Zod object-schema serialization for `@eidora/core`.

## Installation

```sh
pnpm add @eidora/core @eidora/zod zod
```

## Basic Usage

Configure `Serializer` with `ZodAdapter` and pass a Zod object schema:

```ts
import { Serializer } from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  age: z.coerce.number(),
  address: z.string(),
});

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(
  {
    id: 'user-1',
    age: '30',
    password: 'secret',
  },
  {
    schema: UserSchema,
  },
);

// { id: 'user-1', age: 30 }
```

`age` is coerced, the missing `address` is omitted, and the unknown `password`
is omitted. The source object is not mutated.

## Lenient Property Projection

The adapter treats each property as optional and converts unhandled Zod
validation failures to `undefined`. Undefined properties are then removed from
the output. Defaults and catch fallbacks defined by the original property
schema remain effective.

| Source property                        | Output behavior                               |
| -------------------------------------- | --------------------------------------------- |
| Present and valid                      | Parsed and included                           |
| Present and coercible                  | Coerced and included                          |
| Missing                                | Omitted unless the schema supplies a default  |
| Present but invalid                    | Omitted unless the schema supplies a fallback |
| Not declared by the schema             | Omitted                                       |
| Throws an exception inside a transform | Exception propagates unchanged                |

For example, an invalid `id` does not prevent other valid properties from
being serialized:

```ts
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(
  {
    id: 123,
    name: 'Alpha',
  },
  {
    schema: UserSchema,
  },
);

// { name: 'Alpha' }
```

## Object Mapping

A direct object-to-object Zod transform can derive a different response shape:

```ts
const UserSchema = z
  .object({
    address: z.string(),
    lastName: z.string(),
    firstName: z.string(),
  })
  .transform(({ address, firstName, lastName }) => {
    return {
      address,
      fullName: `${firstName} ${lastName}`,
    };
  });

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(
  {
    firstName: 'Alpha',
    lastName: 'Cifer',
  },
  {
    schema: UserSchema,
  },
);

// { fullName: 'Alpha Cifer' }
```

The transform receives the successfully parsed partial input. Transform
functions must tolerate properties that the original Zod object declares as
required but that the adapter may omit at runtime.

## Per-Property Transforms

Use `createSchema` to derive selected top-level properties from raw source data
before Zod parses the output. Each callback receives the same read-only source
object and the current Eidora serialization context. Properties without
callbacks keep their raw values and pass through normal Zod parsing.

```ts
import { Serializer } from '@eidora/core';
import { createSchema, ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
  {
    transform: {
      name(data: Readonly<IUserSource>, context) {
        return (
          data.translations.find((translation) => {
            return translation.locale === context?.['locale'];
          })?.name ?? ''
        );
      },
    },
  },
);

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(
  {
    id: 'user-1',
    translations: [
      {
        locale: 'en',
        name: 'Alpha',
      },
      {
        locale: 'vi',
        name: 'An',
      },
    ],
  },
  {
    context: {
      locale: 'vi',
    },
    schema: UserSchema,
  },
);

// { id: 'user-1', name: 'An' }
```

Every declared callback runs, even when its target property is absent from the
source. Callback results are merged into a shallow source copy and then parsed
by Zod. Unknown source properties such as `translations` are omitted, invalid
callback results follow the adapter's normal lenient omission behavior, and
native defaults run after callbacks. Returning `undefined` deletes the
candidate property before parsing, so a native default may recreate it.

Annotate callback data when a transform needs source-only properties. Without
an annotation, callback data is typed as the partial native-schema input.
Transform keys and return values must match native input properties. Native
property and root transforms run after created-schema callbacks. Eidora's
recursive key casing runs last. Callbacks are synchronous, and thrown errors
propagate unchanged.

## Result Types

Serialization returns a partial output of the concrete schema because any
property can be omitted:

```ts
const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(data, {
  schema: UserSchema,
});

// { id?: string; role?: string }
```

The native Zod output owns every result property type, including transformed
properties. Callback return values are validated before reaching the result.

Eidora applies its configured recursive `camel`, `pascal`, or `snake` key
transform after Zod serialization. Camel case remains the default.

## Schema Caching

Users do not need to call `.optional()` or `.catch()` themselves. For each Zod
object schema, the adapter creates an internal schema whose properties are
wrapped with `optional().catch(undefined)`.

Each `ZodAdapter` instance caches these internal schemas in a `WeakMap` keyed by
the original `ZodObject`. Reusing the same schema avoids rebuilding it, while
unused schemas can still be garbage-collected.

Created schemas use the wrapped native schema as their cache key. Changing the
serialization context does not recreate the native schema or rebuild the
lenient schema.

## Supported Schemas

The adapter supports:

- Zod object schemas.
- Direct object-to-object transforms originating from a Zod object schema.
- Created schemas wrapping either supported native schema.
- Arbitrary Zod property schemas, including coercions, nested schemas,
  refinements, and property transforms.

Primitive, array, tuple, and other non-object root schemas are not supported.
Root-object strictness and refinements are not applied because the adapter
projects properties through its internally redefined schema. Nested property
schemas retain their own validation behavior.

An adapter-configured serializer continues to accept classes decorated with
`@ViewModel()`.
