# 0004 — ArkType Adapter

## Status

Implemented

## Summary

`@eidora/arktype` implements the public `@eidora/core` adapter contract for
ArkType object `Type`s. It creates and caches lenient object schemas so missing
or invalid properties can be omitted without discarding valid siblings.

The result type is a partial ArkType output. Property constraints, morphs,
defaults, and nested validation remain owned by the consumer's original schema.
Core substitutes the concrete schema into the adapter's associated type without
intersecting it with the placeholder schema type, avoiding excessive type
instantiation from ArkType's deeply recursive callable type.

## Goals

- Accept ArkType object `Type`s through the core adapter contract.
- Accept direct object-to-object root morphs originating from an object Type.
- Omit missing, invalid, and undeclared root properties.
- Preserve valid property values, defaults, morphs, and nested validation.
- Infer a partial output type from each concrete schema.
- Compile serializer calls on stable TypeScript versions without casts or
  explicit serializer generics.
- Cache internally redefined schemas without retaining unused source schemas.
- Apply Eidora's recursive output-key transform after ArkType projection.
- Leave source objects and consumer-owned schemas unchanged.

## Public Contract

The `@eidora/arktype` package root exports `ArkTypeAdapter`:

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

// Runtime: { id: 'user-1', age: 30 }
// Type: { id?: string; age?: number; address?: string }
```

## Supported Schemas

`ArkTypeAdapter.supports` requires a value to:

1. Be an instance of ArkType's public `Type` constructor.
2. Expose object property metadata through `props`, or be a direct root morph
   whose input exposes that metadata.

This accepts object schemas, compatible intersections, and direct
object-to-object root morphs. Primitive, array, tuple, and union schemas are
rejected. The public schema carrier requires root morphs to infer an object
output; unexpected non-object runtime outputs normalize to `{}`. Named
properties may use arbitrary ArkType validators, including constraints, nested
objects, and morphs.

## Result Type

The adapter uses a minimal structural schema carrier at its public generic
boundary:

```ts
interface IArkTypeSchema {
  readonly infer: object;
}

interface IArkTypeAdapterType extends IAdapterType {
  readonly schema: IArkTypeSchema;
  readonly result: Partial<this['schema']['infer']>;
}
```

Concrete ArkType object `Type`s satisfy this interface through their `infer`
carrier. This preserves their exact output inference without exposing
ArkType's deeply recursive `Type<object>` API through Eidora's adapter
constraint. Every result property is optional because runtime projection can
omit a missing or invalid value.

### Core result type substitution

`TAdapterResult<TAdapter, TSchema>` preserves the relationship between the
concrete schema and the adapter's associated result type. It replaces the
adapter carrier's placeholder `schema` field before resolving `result`:

```ts
Omit<TAdapter['type'], 'schema'> & {
  readonly schema: TSchema;
}
```

The previous intersection-based resolution combined `IArkTypeSchema` with the
complete concrete ArkType `Type`. TypeScript 5.9 recursively evaluated the
callable schema's generic API and could report `TS2589: Type instantiation is
excessively deep and possibly infinite`. Substitution lets the polymorphic
`this['schema']` mapping observe the concrete schema directly. This is a
compile-time-only core change; adapter routing and runtime serialization remain
unchanged.

## Technical Design

### Adapter routing

`Serializer` first checks for a decorated view model, then delegates supported
schemas to `ArkTypeAdapter`. After projection, the serializer recursively
transforms output keys using `camel`, `pascal`, or `snake` casing.

### Lenient schema redefinition

The adapter redefines each supported object with ArkType's `map` API. For every
named property, the mapped schema:

1. Changes the property kind to optional.
2. Wraps the original property `Type` in an `unknown` input morph.
3. Returns `undefined` when the original validator produces `type.errors`.
4. Preserves successful parsed or morphed values.
5. Copies a declared property default into the mapped descriptor.

The mapped object applies ArkType's `delete` undeclared-key policy. A successful
parse therefore returns only declared properties. The adapter then removes
top-level properties whose wrapper returned `undefined`.

### Direct object morphs

For a supported root morph, the adapter locates the morph node's original object
input and redefines that input through the same lenient mapping path. It then
pipes the original root morph sequence onto the redefined object Type before
caching it.

Property morphs run while producing the partial input, followed by the original
root morphs. Root morph callbacks must tolerate required input properties being
`undefined` when those properties were missing or invalid. Non-object morph
outputs normalize to an empty object.

### WeakMap cache

Each adapter instance owns a `WeakMap` from the consumer's original object
schema to its redefined lenient schema. Repeated serialization with the same
adapter and schema reuses the cached definition. Weak keys ensure the cache does
not retain an otherwise unreachable consumer schema.

The adapter does not cache source data or serialized results and does not mutate
the source or original schema.

### Scope of leniency

Leniency applies to the root object's named properties. Nested object schemas
run normally as property validators, so a nested validation failure omits that
entire root property. Root-level predicates, undeclared-key policies, and index
signatures are not copied to the internally redefined schema.

## Error Behavior

- Missing properties are omitted unless they declare a default.
- Invalid properties are omitted without throwing ArkType validation errors.
- Undeclared source properties are omitted.
- Values produced as `undefined` are omitted.
- A root morph that produces a non-object value produces `{}`.
- Exceptions thrown by property morphs, predicates, or default factories
  propagate unchanged.
- Unsupported schemas are rejected by `Serializer` with its standard
  unsupported-schema `TypeError`.
- Valid ArkType object schemas do not produce `TS2589` during serializer result
  inference.

## Required Behavior

- Valid siblings survive missing or invalid properties.
- Property morph outputs and defaults are preserved.
- Direct root morphs receive the successfully parsed partial input.
- Nested property validation retains normal ArkType behavior.
- Reusing a schema with the same adapter reuses its cached lenient schema.
- Source objects and schemas are not mutated.
- Inferred serializer results are partial outputs of concrete schemas.
- Basic and mapping samples compile with TypeScript 5.9 and the workspace
  TypeScript version without annotations or casts.
- Zod adapter and decorated view-model result inference remain unchanged.
- Recursive key transforms run after adapter serialization.
- Decorated view-model schemas continue to work when the adapter is configured.

## Implementation Map

| Concern                     | Location                                                           |
| --------------------------- | ------------------------------------------------------------------ |
| Core result type resolution | `packages/core/src/adapter.ts`                                     |
| ArkType adapter             | `packages/@adapters/arktype/src/arktypeAdapter.ts`                 |
| Package public exports      | `packages/@adapters/arktype/src/index.ts`                          |
| Runtime specifications      | `packages/@adapters/arktype/src/__tests__/arktypeAdapter.spec.ts`  |
| Compile-time specifications | `packages/@adapters/arktype/src/__tests__/arktypeAdapter.types.ts` |
| Runnable examples           | `samples/src/arktype`                                              |

## Non-Goals

- Supporting non-object, union, or non-object-producing root-morph Types.
- Applying root predicates, index signatures, or consumer undeclared-key
  policies during lenient projection.
- Supporting multiple adapters in one serializer instance.
- Recursively making nested ArkType object properties lenient.
- Increasing TypeScript's instantiation-depth limit.
- Adding ArkType-specific result-resolution logic to `@eidora/core`.
