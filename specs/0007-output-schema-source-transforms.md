# 0007: Output-schema source transforms

## Status

Implemented

## Summary

The Zod and ArkType `createSchema` wrappers treat their native schema as the
serialization output contract. Created-schema property transforms run against
the raw source object before native parsing. This permits a response property
to depend on source-only data without declaring that source-only property in
the output schema.

This specification supersedes the created-schema transform ordering and result
typing defined by specification 0006. Specification 0006 remains an immutable
record of the earlier contract.

## Goals

- Let transforms derive output properties from raw source properties.
- Keep source-only properties out of the native output schema and serialized
  result.
- Validate every transformed value with the native schema.
- Preserve lenient property validation, native defaults, unknown-key removal,
  schema caching, serialization context, and source immutability.
- Provide precise callback types when the source type differs from the native
  schema input.
- Keep Zod and ArkType behavior aligned.

## Non-goals

- Runtime validation of the entire source object before callbacks run.
- Inferring source-only properties from an output schema.
- Asynchronous property transforms.
- Nested transform maps.
- Changing direct native-schema serialization.
- Changing core view-model decorators or field resolvers.

## Public contract

Both adapter packages retain the existing `createSchema(schema, options)` API
and accept explicit source annotations on transform callbacks:

```ts
interface IQuestionSource {
  readonly factor?: {
    readonly slug?: string;
  };
  readonly translations?: ReadonlyArray<{
    readonly locale?: string;
    readonly title?: string;
  }>;
}

const QuestionSchema = createSchema(NativeObjectSchema, {
  transform: {
    factor(data: Readonly<IQuestionSource>) {
      return data.factor?.slug ?? '';
    },
    title(data: Readonly<IQuestionSource>, context) {
      return (
        data.translations?.find((translation) => {
          return translation.locale === context?.['locale'];
        })?.title ?? ''
      );
    },
  },
});
```

`createSchema(schema, options)` infers its result from the native schema passed
as the first parameter. Callback source data defaults to a partial native-schema
input. Annotate a callback's `data` parameter when it reads properties that are
not declared by the native schema or needs a more precise domain type.

Transform keys are restricted to native-schema input keys. A callback may read
any property in its source type, but it may only replace a property accepted by
the native schema. Its return type must be assignable to that native input
property or `undefined`.

Created-schema serialization results are inferred exclusively from the native
schema output and remain partial because Eidora omits invalid or missing
properties. Callback return types do not replace native output types.

## Serialization pipeline

For a created schema, an adapter performs these steps:

1. Receive the non-null raw source object from core.
2. Create a shallow candidate copy of the raw object's own enumerable
   properties.
3. Invoke every declared property transform with the same read-only raw object
   and current serialization context.
4. Replace the corresponding candidate property with a defined callback
   result, or delete it when the callback returns `undefined`.
5. Parse the candidate through the adapter's existing cached lenient native
   schema.
6. Run native property transformations and any supported native root transform
   or morph as part of native parsing.
7. Remove invalid, missing, undefined, and undeclared properties according to
   existing adapter rules.
8. Return the normalized partial native output to core for recursive key
   casing.

Callbacks receive the original source object rather than the progressively
updated candidate. Transform declaration order therefore has no semantic
effect, and one callback cannot observe another callback's result.

Unlike the previous contract, callback invocation does not depend on whether
the target property exists in the source. A transform can therefore populate a
required output property such as `title` without adding an artificial native
default.

## Native parsing behavior

### Zod

The candidate is passed to the cached object projection whose properties use
`optional().catch(undefined)`. Native property transforms run after
created-schema transforms. For a supported direct object-to-object
`ZodPipe`, created-schema transforms target the pipe input properties; the
native root transform runs after the lenient input projection.

### ArkType

The candidate is passed to the cached mapped object schema. Each property is
optional, property errors become `undefined`, and undeclared keys use ArkType's
`delete` behavior. Created-schema transforms target native input properties.
Any supported native root morph runs after the mapped input projection.

### Defaults and undefined

Returning `undefined` deletes the property from the candidate before native
parsing. A native default may consequently recreate that property. This makes
the native output schema authoritative: use an optional property without a
default when `undefined` must remain omitted.

## Source data and immutability

The adapter does not validate the complete source object before invoking
callbacks. Callback code is responsible for the assumptions expressed by its
declared source type. Transformed values are always validated by the native
output schema.

The raw source object is never assigned to or deleted from. Candidate mutation
is confined to a shallow copy. Callback data is typed as read-only, consistent
with the existing synchronous serialization contract.

## Error behavior

- Exceptions thrown by created-schema callbacks propagate unchanged.
- Invalid transformed properties are omitted by lenient native parsing.
- A native default may replace a missing, deleted, or invalid transformed
  property.
- Unknown raw properties are removed by native object parsing.
- Native parsing and root-transform errors retain their existing behavior.
- A non-object native root result normalizes to an empty object.

## Required behavior

- A source-only `translations` property can derive an output `title` without
  appearing in the native schema or serialized result.
- A declared transform runs when its target property is absent from the raw
  source.
- Every callback receives the same raw object identity.
- Native parsing validates callback results and owns the result type.
- Native defaults run after created-schema transforms.
- Direct native schemas preserve their existing behavior.
- Zod and ArkType accept source annotations with the same `createSchema` API.
- Existing context propagation and schema caching continue to work.

## Implementation map

| Concern                                     | Location                                           |
| ------------------------------------------- | -------------------------------------------------- |
| Zod created-schema types and transforms     | `packages/@adapters/zod/src/createSchema.ts`       |
| Zod serialization ordering                  | `packages/@adapters/zod/src/zodAdapter.ts`         |
| ArkType created-schema types and transforms | `packages/@adapters/arktype/src/createSchema.ts`   |
| ArkType serialization ordering              | `packages/@adapters/arktype/src/arktypeAdapter.ts` |
| Runtime and compile-time coverage           | `packages/@adapters/{zod,arktype}/src/__tests__`   |
| Middleware behavior                         | `packages/@middlewares/hono/*/src/__tests__`       |
| Runnable examples                           | `samples/src/{zod,arktype}/transform.ts`           |
