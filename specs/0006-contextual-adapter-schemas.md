# 0006 — Per-Property Contextual Schema Transforms

## Status

Implemented

## Summary

The Zod and ArkType adapters expose `createSchema` wrappers that apply optional
context-aware transforms to selected top-level properties after native schema
parsing. Unmapped properties retain their normal native output, and the wrapper
preserves each adapter's identity-based lenient-schema cache.

## Goals

- Transform selected native-schema output properties with serialization context.
- Give callbacks the complete successfully parsed partial output.
- Preserve normal behavior and types for untransformed properties.
- Reuse cached lenient schemas across changing context values.
- Preserve source data, native schemas, parsed data, and context without mutation.
- Infer transformed properties from callback return types.
- Forward Hono request-scoped variables through middleware serialization.

## Public Contract

Both adapter packages export `createSchema` with the same API:

```ts
const UserSchema = createSchema(NativeObjectSchema, {
  transform: {
    id(data, context) {
      return `${String(context?.['prefix'] ?? '')}${String(data.id)}`;
    },
  },
});
```

The native schema must be supported by the package's adapter. Options and the
`transform` map are optional. Transform keys must be top-level keys from the
native schema's output.

Each callback receives:

- `data`: `Readonly<Partial<TNativeOutput>>`, after native property and root
  transforms have run.
- `context`: `TSerializeContext | undefined` from the current
  `Serializer.serialize` call.

`@eidora/core` publicly exports:

```ts
type TSerializeContext = Readonly<Record<string, unknown>>;
```

The Zod package exports these schema-derived mapped types:

```ts
type TZodSchemaTransforms<TSchema extends TZodSchema> = Partial<{
  readonly [TKey in keyof output<TSchema>]: (
    data: Readonly<Partial<output<TSchema>>>,
    context?: TSerializeContext,
  ) => unknown;
}>;

interface ICreateSchemaOptions<
  TSchema extends TZodSchema,
  TTransforms extends TZodSchemaTransforms<TSchema>,
> {
  readonly transform?: TTransforms;
}
```

The ArkType package uses the same structure with
`keyof TSchema['infer']` and `Partial<TSchema['infer']`. A `const`
transform-map generic preserves each callback's concrete return type rather
than widening all transformed values to `unknown`.

Although transform callbacks receive the whole partial native output, a
callback is associated with exactly one output key. The callback does not
receive the raw serializer input, undeclared properties, or values rejected by
the native schema.

## Technical Design

### Branded wrapper

Each adapter package owns a unique symbol brand. A created wrapper retains its
native schema and transform map. Branding prevents ordinary objects and
wrappers from another engine from being routed as supported schemas.

Conceptually, each wrapper has this shape:

```ts
interface ICreatedSchema<TSchema, TTransforms> {
  readonly [createdSchemaBrand]: true;
  readonly schema: TSchema;
  readonly transform: TTransforms;
}
```

`createSchema(schema)` normalizes an omitted transform map to an empty object.
The wrapper, native schema, and callbacks are retained by reference; the
factory does not clone, parse, compile, or mutate the supplied schema.

`supports` recognizes the wrapper and validates its native schema using the
adapter's existing checks. The native schema remains the `WeakMap` cache key,
so wrapping it does not rebuild lenient schemas between serializations.

The Zod and ArkType brands are distinct. A wrapper created by one adapter is
not accepted by the other adapter, even though both packages export a function
named `createSchema`.

### Adapter routing

Each adapter expands its supported-schema union from the native schema type to
`TNativeSchema | ICreatedSchema`. Public adapter methods route as follows:

```ts
supports(candidate) {
  if (isCreatedSchema(candidate)) {
    return supportsNativeSchema(candidate.schema);
  }

  return supportsNativeSchema(candidate);
}

serialize({ context, data, schema }) {
  if (isCreatedSchema(schema)) {
    const parsed = serializeNativeSchema(data, schema.schema);

    return applySchemaTransforms({ context, data: parsed, schema });
  }

  return serializeNativeSchema(data, schema);
}
```

Core does not need wrapper-specific logic. `Serializer` continues to select a
view-model class first, then delegates supported external schemas to its
configured adapter, and finally applies recursive key casing to the adapter's
plain-object result.

### Native serialization pipelines

For Zod, the wrapper accepts either a `ZodObject` or a supported direct
object-to-object `ZodPipe`. Object properties are parsed through the adapter's
cached `optional().catch(undefined)` projection. For a root transform, the
partial projected object is passed to the native `ZodTransform` before the
created-schema transform map runs.

For ArkType, the wrapper accepts an object `Type` or a supported object root
morph. The adapter maps every root property to an optional validator that
converts ArkType errors to `undefined`, applies `onUndeclaredKey('delete')`, and
then runs any native root morph. The created-schema transform map runs on that
normalized result.

Both native pipelines remove top-level `undefined` properties and reject
non-object root-transform results before created-schema callbacks are
considered.

### Serialization order

The adapter performs these steps:

1. Project and validate native schema properties using existing lenient rules.
2. Run native property transforms and the supported object-to-object root transform.
3. Copy the normalized partial native output.
4. For each configured transform whose property exists, call it with the
   original normalized output and current serialization context.
5. Replace the property with the callback result, or omit it when the result is
   `undefined`.
6. Return the result to core for recursive key casing.

Every callback receives the same pre-transform object. Callbacks cannot observe
earlier callback results, so behavior does not depend on property declaration
order. Transform maps address top-level properties only.

Missing and invalid properties do not invoke their callbacks. Native defaults
and fallbacks produce present properties and therefore invoke callbacks.

### Transform application algorithm

The transform helper treats the normalized native output as a read-only
snapshot and creates a shallow result copy before invoking callbacks. It then
enumerates the transform map's own enumerable string keys:

```ts
const parsedData = data as Readonly<Record<string, unknown>>;
const result = { ...parsedData };

for (const [key, transform] of Object.entries(schema.transform)) {
  if (!Object.hasOwn(parsedData, key)) {
    continue;
  }

  const value = transform(parsedData, context);

  if (value === undefined) {
    delete result[key];
  } else {
    result[key] = value;
  }
}
```

Callbacks always receive `parsedData`, never the progressively updated
`result`. A callback therefore cannot observe another callback's return value,
and transform-map declaration order has no semantic effect. The shallow copy
also ensures property replacement or removal does not modify the native parsed
object.

Only top-level string-keyed properties participate. Nested objects returned by
native parsing or a callback are passed through unchanged until core performs
its recursive key-casing step.

### Context lifetime and concurrency

Context is passed directly from `IAdapterSerializeParams` into each callback.
No module-level storage, `WeakMap` context stack, async-local state, or reserved
source property is used. Sequential, nested, and concurrent serializer calls
therefore cannot leak context through the created-schema wrapper.

Transforms are synchronous because both adapter `serialize` contracts are
synchronous. A returned promise is treated as an ordinary property value; the
adapter does not await it.

### Hono middleware context

The Zod and ArkType Hono serialization middleware accept an optional
`TSerializeContext` as the second `serialize` argument. For each response, the
middleware creates the effective serialization context by shallowly merging
`context.var` with the additional context. Additional context values take
precedence when both sources contain the same key. The merged context is used
for every object under the response envelope's `data` property, including
objects in nested arrays.

This allows created-schema transforms to consume both values populated with
Hono's `context.set(...)` API and static middleware configuration without
mutating either source or exposing the Hono `Context` instance to core or the
adapters.

### Cache behavior

The wrapper itself is not used as a lenient-schema cache key. Both adapters
unwrap `schema.schema` before entering their existing native serialization
pipeline:

- Zod caches the projected `ZodObject` by the original `ZodObject` identity.
- ArkType caches the lenient callable schema by the original ArkType `Type`
  identity.

Reusing one wrapper or creating multiple wrappers around the same native
schema therefore reuses the same adapter-instance cache entry. Context values
and transform-map identities are not part of cache construction.

### Result inference

Created-schema results remain partial because adapter projection may omit any
property. Untransformed properties retain their native output types. Each
transformed property uses its callback return type:

```ts
Partial<{
  id: ReturnType<typeof transform.id>;
  unchanged: TNativeOutput['unchanged'];
}>;
```

The transform callback's `data` argument is based on the native pre-transform
output, not the final transformed result.

At the adapter boundary, the existing `IAdapterType` higher-kinded carrier is
extended with a conditional result resolver. For a created schema, it extracts
the wrapped native schema and transform map, substitutes callback return types
for mapped keys, and wraps the complete shape in `Partial`. Direct native
schemas continue through the existing native-output result branch.

Transform-map keys are constrained to `keyof TNativeOutput`. Unknown keys fail
excess-property checking. An omitted transform map infers `{}`, which resolves
to the same partial output type as direct native-schema serialization.

The type contract intentionally preserves `undefined` in a callback's inferred
return type even though an actual `undefined` result removes the runtime
property. The enclosing `Partial` accurately represents the property's runtime
absence.

## Error Behavior

- Unsupported native schemas fail type checking and use core's standard
  unsupported-schema error if forced at runtime.
- Exceptions from native validators, transforms, morphs, defaults, fallbacks,
  or created-schema callbacks propagate unchanged.
- Returning `undefined` from a created-schema callback omits that property.
- Source data, schemas, parsed output, and context are not mutated.
- A branded wrapper whose native schema is unsupported follows core's standard
  unsupported-schema error path.
- A callback is never invoked merely to recover an omitted or invalid target
  property.

## Required Behavior

- Selected valid properties can be transformed using current serialization context.
- Unlisted properties serialize normally.
- All callbacks see the same parsed pre-transform data.
- Missing and invalid properties skip their callbacks.
- Defaults and fallbacks are transformable when present in parsed output.
- Reusing a wrapper with different context values changes callback results.
- Reusing a wrapper does not recreate or rebuild its lenient schema.
- Created-schema output types reflect callback returns and native property types.
- Native Zod transforms and ArkType morphs remain supported and run first.
- Direct native schemas remain unchanged.
- Created-schema transforms run before core key casing and address native output
  names, not their later camel-, pascal-, or snake-cased forms.
- Multiple wrappers around one native schema reuse the adapter's native-schema
  cache.
- Hono middleware merges request-scoped variables with optional additional
  context for single objects and every object in nested arrays.

## Verification

Runtime tests exercise both adapters through the public `Serializer` API and
cover context changes, untouched fields, native coercions and root transforms,
stable pre-transform callback data, missing and invalid properties, defaults,
`undefined` omission, exception propagation, source immutability, and cache
reuse.

Compile-time assertions cover callback argument types, transformed return-type
inference, unchanged native property types, empty transform maps, unsupported
root schemas, and transform keys absent from the native output.

## Implementation Map

| Concern                            | Location                                         |
| ---------------------------------- | ------------------------------------------------ |
| Shared context export              | `packages/core/src/index.ts`                     |
| Zod created-schema wrapper         | `packages/@adapters/zod/src/createSchema.ts`     |
| ArkType created-schema wrapper     | `packages/@adapters/arktype/src/createSchema.ts` |
| Adapter routing and transformation | Adapter package implementation files             |
| Hono context forwarding            | Hono middleware `serialize.ts` files             |
| Runtime and compile-time behavior  | Adapter package `src/__tests__` directories      |
| Runnable examples                  | `samples/src/{zod,arktype}/transform.ts`         |

## Non-Goals

- Passing application context through Zod's parse context.
- Replacing ArkType's traversal context.
- Exposing context inside native Zod transforms or ArkType morphs.
- Transforming nested properties through path syntax.
- Generating properties that were omitted by native parsing.
- Supporting asynchronous transforms.
