# 0002 — Serializer Adapters and Zod

## Status

Implemented

## Summary

`@eidora/core` exposes a public adapter contract for external schema engines.
`@eidora/zod` implements that contract for Zod object schemas and direct
object-to-object transforms.

The Zod adapter provides lenient property projection. Consumers can supply
their original Zod schemas without making every property optional. Internally,
the adapter creates and caches a redefined object schema that converts
unhandled missing or invalid properties to `undefined`, then removes those
properties from the serialized result.

A serializer configured with `ZodAdapter` continues to accept decorated
view-model classes in addition to supported Zod schemas.

## Goals

- Add a type-safe adapter contract to `@eidora/core`.
- Accept Zod object schemas through the adapter contract.
- Accept direct object-to-object transforms originating from a Zod object.
- Let consumers use their original property schemas without adding lenient
  wrappers themselves.
- Omit unhandled missing, invalid, and unknown source properties without
  raising Zod validation errors.
- Preserve successful property coercions, nested parsing, refinements, and
  transforms.
- Infer a partial output type from each concrete Zod schema.
- Cache internally redefined schemas without retaining unused source schemas.
- Apply Eidora's recursive output-key transform after Zod serialization.
- Leave source data and consumer-owned schemas unchanged.

## Public Contracts

### Core adapter contract

The `@eidora/core` package root exports `IAdapter`, `IAdapterType`,
`IAdapterSerializeParams`, `TAdapterSchema`, and `TAdapterResult`.

```ts
interface IAdapterSerializeParams<TSchema extends object> {
  readonly data: object;
  readonly schema: TSchema;
  readonly context?: TSerializeContext;
}

interface IAdapterType {
  readonly schema: object;
  readonly result: object;
}

interface IAdapter<
  TSchema extends object = object,
  TType extends IAdapterType = IAdapterType,
> {
  readonly type: TType;

  supports(schema: unknown): schema is TSchema;
  serialize(params: IAdapterSerializeParams<TSchema>): object;
}
```

The `type` member is an associated-type carrier. `TAdapterSchema` extracts the
schema types accepted by an adapter. `TAdapterResult` combines a concrete
schema with the adapter's associated type to infer the corresponding result.

`Serializer` accepts an optional adapter at construction. Each serialization
call accepts either a decorated view-model constructor or a schema supported
by that adapter. Decorated view-model serialization takes precedence when a
schema could match both routes.

### Zod adapter contract

The `@eidora/zod` package root exports `ZodAdapter`.

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

// Runtime: { id: 'user-1', age: 30 }
// Type: { id?: string; age?: number; address?: string }
```

The required `address` property is absent from the source and is therefore
omitted. The unknown `password` property is also omitted. The valid `id` and
coercible `age` properties are included.

## Supported Schema Types

The adapter's internal schema union is equivalent to:

```ts
type TZodObjectTransform = ZodPipe<
  ZodObject,
  ZodTransform<Record<string, unknown>, Record<string, unknown>>
>;

type TZodSchema = ZodObject | TZodObjectTransform;
```

`ZodAdapter.supports` accepts:

- A `ZodObject` instance.
- A direct `ZodPipe` whose input is a `ZodObject` and whose output is a
  `ZodTransform`.

Primitive, array, tuple, and other non-object root schemas are not accepted.
Nested properties may use any Zod schema supported by the installed Zod
package.

## Result Type

The associated adapter type maps every supported schema to a partial Zod
output:

```ts
interface IZodAdapterType extends IAdapterType {
  readonly schema: TZodSchema;
  readonly result: Partial<output<this['schema']>>;
}
```

Every property is optional in the inferred result because runtime projection
may omit it when the source property is absent or its value fails validation.
This prevents the static type from claiming that an omitted property is always
present.

## Technical Design

### Adapter routing

`Serializer` processes schemas in this order:

1. If the schema is a registered view model, serialize it through the
   decorator resolver.
2. Otherwise, ask the configured adapter whether it supports the schema.
3. If supported, call the adapter with the source data, schema, and optional
   context.
4. If unsupported, throw the serializer's unsupported-schema `TypeError`.
5. Apply the selected recursive key transform to the returned object.

`ZodAdapter` does not currently consume the optional serialization context.

### Lenient schema redefinition

Consumers retain ownership of their original Zod schemas. The adapter never
mutates them. For each property in `ZodObject.shape`, the adapter creates a new
property schema equivalent to:

```ts
propertySchema.optional().catch(undefined);
```

The two wrappers have distinct responsibilities:

- `optional()` accepts a source object that does not contain the property.
- `catch(undefined)` converts an unsuccessful property parse into
  `undefined`.

The original property schema remains inside these wrappers. Existing behavior
such as `.default()` or `.catch(fallback)` can therefore recover a missing or
invalid value before the adapter's outer catch applies. Defined fallback values
are preserved in the output.

The adapter constructs a new Zod object from the redefined shape. Consequently,
unknown source properties use the reconstructed object's default filtering
behavior and are omitted.

### WeakMap cache

Each `ZodAdapter` instance owns:

```ts
readonly #lenientSchemaCache = new WeakMap<ZodObject, ZodObject>();
```

`#getLenientSchema` uses the consumer's original `ZodObject` as the weak key and
the internally redefined schema as its value. Repeated serialization with the
same adapter and schema reuses the cached schema.

The cache is scoped to an adapter instance. A `WeakMap` ensures that the cache
does not keep an otherwise unreachable original schema alive. The adapter does
not cache source data or serialized results.

### Object parsing

`#parseObject` performs the following steps:

1. Resolve the cached lenient schema with `#getLenientSchema`.
2. Call Zod's synchronous `safeParse` with the source data.
3. Return an empty object if parsing is unsuccessful.
4. Normalize successful data with `#normalizeResult`.

Property validation failures normally become successful parses with
`undefined` values because every property is wrapped in `catch(undefined)`.
The empty-object fallback protects the serializer from failures outside those
property wrappers.

### Result normalization

`#normalizeResult` guarantees an object compatible with Eidora's serializer:

- `null`, arrays, primitives, and other non-object results become `{}`.
- Own enumerable properties whose value is `undefined` are removed.
- All other own enumerable properties are preserved.

Undefined removal is shallow. Nested objects retain the behavior of their own
property schemas and Eidora's later recursive key transformation.

### Direct object transforms

For a supported direct object transform, serialization proceeds as follows:

1. Parse `schema.in` through the cached lenient-object path.
2. Pass the successfully parsed partial object to `schema.out` with
   `safeParse`.
3. Return `{}` when the output transform reports a Zod parsing failure.
4. Normalize the successful transform output.

The transform callback is declared by Zod against the original object output,
but the adapter intentionally supplies a partial runtime value. Transform
implementations must tolerate required properties being `undefined` when those
properties were absent or invalid in the source.

### Key transformation

After adapter serialization, `Serializer` applies the configured recursive key
transform. Supported values are `camel`, `pascal`, and `snake`; `camel` is the
default. A per-call transform overrides the serializer constructor default.

## Error Behavior

- Missing properties do not produce an error. They are omitted unless the
  original property schema supplies a defined fallback.
- Zod validation failures for individual properties do not produce an error;
  the properties are omitted unless the original property schema recovers the
  failure with a defined value.
- Unknown source properties do not produce an error; they are omitted.
- A direct transform that reports a Zod parsing failure produces `{}`.
- A direct transform that produces a non-object runtime value produces `{}`.
- Exceptions explicitly thrown by property or object transform callbacks
  propagate unchanged. Zod's safe-parse API does not convert arbitrary thrown
  exceptions into validation results.
- Unsupported root schemas are rejected by `Serializer` with
  `Serializer schema must be decorated with @ViewModel() or supported by the configured adapter.`

## Required Behavior

- Consumers can use required Zod properties without adding `.optional()` or
  `.catch()` themselves.
- Unhandled missing, invalid, and unknown source properties are omitted.
- Defined defaults and catch fallbacks produced by original property schemas
  are preserved.
- Valid values, successful coercions, property transforms, nested parses, and
  property refinements are preserved.
- Reusing a schema with the same adapter reuses its cached lenient schema.
- Source objects and consumer-owned schemas are not mutated.
- Runtime results are non-null, non-array objects.
- Inferred adapter results are partial outputs of their concrete schemas.
- Direct object transforms receive the successfully parsed partial input.
- Undefined top-level transform output properties are omitted.
- Recursive key transforms run after adapter serialization.
- Decorated view-model schemas continue to work when `ZodAdapter` is
  configured.

## Implementation Map

| Concern                                   | Location                                                   |
| ----------------------------------------- | ---------------------------------------------------------- |
| Core adapter contracts and result typing  | `packages/core/src/adapter.ts`                             |
| Adapter routing and output transformation | `packages/core/src/serializer.ts`                          |
| Core public exports                       | `packages/core/src/index.ts`                               |
| Zod adapter                               | `packages/@adapters/zod/src/zodAdapter.ts`                 |
| Zod package public exports                | `packages/@adapters/zod/src/index.ts`                      |
| Runtime specifications                    | `packages/@adapters/zod/src/__tests__/zodAdapter.spec.ts`  |
| Compile-time specifications               | `packages/@adapters/zod/src/__tests__/zodAdapter.types.ts` |
| Runnable examples                         | `samples/src/zod`                                          |

## Non-Goals

- Supporting multiple adapters in one serializer instance.
- Supporting primitive, array, tuple, or other non-object root schemas.
- Returning Zod issues as part of the serialized result.
- Wrapping or translating exceptions thrown explicitly by transform callbacks.
- Applying original root-object strictness or root-object refinements after
  schema redefinition.
- Recursively removing nested `undefined` values during adapter normalization.
- Asynchronous Zod parsing or asynchronous transforms.
- Caching source objects or serialization results.

Zod compatibility ranges are maintained by the package implementation and
manifest rather than fixed by this specification.
