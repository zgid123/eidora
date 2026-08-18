# `@eidora/arktype`

Lenient ArkType object-schema serialization for `@eidora/core`.

## Installation

```sh
pnpm add @eidora/core @eidora/arktype arktype
```

## Basic Usage

Configure `Serializer` with `ArkTypeAdapter` and pass an ArkType object schema:

```ts
import { ArkTypeAdapter } from '@eidora/arktype';
import { Serializer } from '@eidora/core';
import { type } from 'arktype';

const UserSchema = type({
  id: 'string',
  age: 'string.numeric.parse',
  address: 'string',
});

const result = new Serializer({
  adapter: new ArkTypeAdapter(),
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

`age` is parsed by its ArkType morph, the missing `address` is omitted, and the
undeclared `password` is excluded. The source object and schema are unchanged.

## Lenient Property Projection

The adapter creates a lenient copy of the object schema through ArkType's
property-mapping API. Every named property becomes optional and its original
validator is wrapped so ArkType validation failures produce `undefined`. One
invalid or missing property therefore does not prevent other valid properties
from being serialized.

| Source property                   | Output behavior                              |
| --------------------------------- | -------------------------------------------- |
| Present and valid                 | Parsed and included                          |
| Present and accepted by a morph   | Transformed and included                     |
| Missing                           | Omitted unless the schema supplies a default |
| Present but invalid               | Omitted                                      |
| Not declared by the schema        | Omitted                                      |
| Throws inside a property callback | Exception propagates unchanged               |

Nested property validators retain ArkType's normal behavior. Leniency applies
only to the root object's named properties.

## Object Mapping

A direct object-to-object root morph can derive a different response shape:

```ts
const UserSchema = type({
  address: 'string',
  lastName: 'string',
  firstName: 'string',
}).pipe(({ address, firstName, lastName }) => {
  return {
    address,
    fullName: `${firstName} ${lastName}`,
  };
});

const result = new Serializer({
  adapter: new ArkTypeAdapter(),
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

The root morph receives the successfully parsed partial input. Morph callbacks
must tolerate properties that the original schema declares as required but the
adapter may omit at runtime.

## Per-Property Transforms

Use `createSchema` to derive selected top-level properties from raw source data
before ArkType parses the output. Each callback receives the same read-only
source object and the current Eidora serialization context. Properties without
callbacks keep their raw values and pass through normal ArkType parsing.

```ts
import { Serializer } from '@eidora/core';
import { ArkTypeAdapter, createSchema } from '@eidora/arktype';
import { type } from 'arktype';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  type({
    id: 'string',
    name: 'string',
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
  adapter: new ArkTypeAdapter(),
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
by ArkType. Unknown source properties such as `translations` are deleted,
invalid callback results follow the adapter's normal lenient omission behavior,
and native defaults run after callbacks. Returning `undefined` deletes the
candidate property before parsing, so a native default may recreate it.

Annotate callback data when a transform needs source-only properties. Without
an annotation, callback data is typed as the partial native-schema input.
Transform keys and return values must match native input properties. Native
property and root morphs run after created-schema callbacks. Eidora's recursive
key casing runs last. Callbacks are synchronous, and thrown errors propagate
unchanged.

## Schema Caching

Each `ArkTypeAdapter` instance caches its lenient schemas in a `WeakMap` keyed by
the original schema. Reusing a schema avoids rebuilding its property wrappers,
while unused consumer schemas can still be garbage-collected.

The cached schema uses ArkType's `delete` undeclared-key behavior. The adapter
then removes top-level properties whose wrapped validator produced `undefined`.
Neither operation mutates the consumer's source object or original schema.

Created schemas use the wrapped native schema as their cache key. Changing the
serialization context does not recreate the native schema or rebuild the
lenient schema.

## Result Types

Serialization returns a partial inferred output of the concrete schema because
any property can be omitted:

```ts
const result = new Serializer({
  adapter: new ArkTypeAdapter(),
}).serialize(data, {
  schema: UserSchema,
});

// { id?: string; role?: string }
```

The native ArkType output owns every result property type, including
transformed properties. Callback return values are validated before reaching
the result.

Eidora applies its configured recursive `camel`, `pascal`, or `snake` key
transform after ArkType serialization. Camel case remains the default.

## Supported Schemas

The adapter supports ArkType object `Type`s with named properties and direct
object-to-object root morphs. Named properties may use constraints, defaults,
morphs, nested schemas, and intersections that expose ArkType's object-property
metadata.

`createSchema` may wrap any supported native schema.

Primitive, array, tuple, and union schemas are not supported. Root morphs must
infer an object output; an unexpected non-object runtime value normalizes to an
empty object. Root-level predicates, undeclared-key policies, and index
signatures are not applied because the adapter projects named properties
independently. Define those rules on nested property schemas when they must be
enforced during projection.

An adapter-configured serializer continues to accept classes decorated with
`@ViewModel()`.
