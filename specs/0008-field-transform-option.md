# 0008 — Field Transform Option

## Status

Implemented

## Summary

The `@Field` decorator names its computed-value callback `transform`. This
replaces the original `map` option and aligns decorator schemas with the
per-property transform terminology used by adapter-created schemas.

This specification supersedes the `IFieldOptions.map` portions of
`0001-core-serializer.md`.

## Goals

- Use one term for callbacks that derive output properties from source data.
- Preserve the callback's source-data and serialization-context behavior.
- Keep ordinary decorated-field access unchanged when no callback is supplied.

## Public Contract

```ts
interface IFieldOptions<TData extends object = object> {
  readonly name?: string;
  readonly transform?: (data: TData, context?: TSerializeContext) => unknown;
}
```

`transform` receives the complete source object and optional read-only
serialization context. Its return value becomes the decorated field's value.
The `map` option is removed without a compatibility alias because the package
does not yet have consumers requiring a migration period.

## Technical Design

The field decorator registers a getter with the view-model field registry. The
getter invokes `options.transform` when present. Otherwise, it reads the
decorated property from the source through the decorator context accessor.

The serializer continues to apply its separate output-key casing transform
after all field values have been resolved. The two transform options operate at
different scopes:

- `@Field({ transform })` derives one field value.
- `Serializer({ transform })` and `serialize({ transform })` select recursive
  output-key casing.

## Error Behavior

Exceptions thrown by a field transform propagate unchanged. Existing errors
for private, static, and symbol-keyed decorated fields are unchanged. Using
`map` fails TypeScript excess-property checking.

## Required Behavior

- A field transform receives the raw source object and serialization context.
- The transform return value is stored under the field's configured name.
- An untransformed field reads its value from the same-named source property.
- Output-key casing runs after field transforms.
- `map` is not part of `IFieldOptions`.

## Non-Goals

- Supporting asynchronous field transforms.
- Providing a deprecated `map` compatibility alias.
- Renaming the serializer's output-key casing option.

## Implementation Map

| Concern                           | Location                                |
| --------------------------------- | --------------------------------------- |
| Decorator option and execution    | `packages/core/src/decorators/field.ts` |
| Runtime and compile-time coverage | `packages/core/src/__tests__`           |
| Consumer documentation            | `packages/core/README.md`               |
| Runnable example                  | `samples/src/core/mapping.ts`           |
