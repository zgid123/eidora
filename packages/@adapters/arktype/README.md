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

## Schema Caching

Each `ArkTypeAdapter` instance caches its lenient schemas in a `WeakMap` keyed by
the original schema. Reusing a schema avoids rebuilding its property wrappers,
while unused consumer schemas can still be garbage-collected.

The cached schema uses ArkType's `delete` undeclared-key behavior. The adapter
then removes top-level properties whose wrapped validator produced `undefined`.
Neither operation mutates the consumer's source object or original schema.

## Result Types

Serialization returns a partial inferred output of the concrete schema because
any property can be omitted:

```ts
const result = new Serializer({
  adapter: new ArkTypeAdapter(),
}).serialize(data, {
  schema: UserSchema,
});

// Partial<typeof UserSchema.infer>
```

Eidora applies its configured recursive `camel`, `pascal`, or `snake` key
transform after ArkType serialization. Camel case remains the default.

## Supported Schemas

The adapter supports ArkType object `Type`s with named properties and direct
object-to-object root morphs. Named properties may use constraints, defaults,
morphs, nested schemas, and intersections that expose ArkType's object-property
metadata.

Primitive, array, tuple, and union schemas are not supported. Root morphs must
infer an object output; an unexpected non-object runtime value normalizes to an
empty object. Root-level predicates, undeclared-key policies, and index
signatures are not applied because the adapter projects named properties
independently. Define those rules on nested property schemas when they must be
enforced during projection.

An adapter-configured serializer continues to accept classes decorated with
`@ViewModel()`.
