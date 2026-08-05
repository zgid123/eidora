# 0001 — Core View-Model Serializer

## Status

Implemented

## Summary

`@eidora/core` provides a decorator-driven serializer that projects an input
object into a plain view-model object. Only fields decorated with `@Field` are
included. Fields may be renamed or computed, and output keys may be transformed
recursively to camel case, Pascal case, or snake case.

## Goals

- Define a schema with standard Stage 3 TypeScript decorators.
- Whitelist serialized properties through explicit field decoration.
- Support field renaming and computed field values.
- Pass request-specific, read-only context to field mapping functions.
- Transform output keys recursively with a configurable naming convention.
- Preserve field declaration order and leave source data unchanged.

## Public API

The package root exports `Field`, `ViewModel`, `Serializer`, serializer option
types, and the `IViewModelConstructor` type.

### `@ViewModel()`

Marks a class as a valid serialization schema.

```ts
@ViewModel()
class UserViewModel {}
```

The decorator registers the class constructor together with its decorator
metadata. A class that is not decorated with `@ViewModel()` is rejected by the
serializer.

### `@Field` and `@Field(options)`

Marks a public instance field for inclusion in serialized output.

```ts
interface IUser {
  id: string;
  firstName: string;
  lastName: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field({ name: 'display_name' })
  firstName!: string;

  @Field<IUser>({
    map: (user, context) =>
      `${user.firstName}${String(context?.['separator'] ?? ' ')}${user.lastName}`,
  })
  fullName!: string;
}
```

`IFieldOptions<TData>` has the following properties:

| Property | Type | Behavior |
| --- | --- | --- |
| `name` | `string` | Sets the output key before key transformation. Defaults to the decorated property name. |
| `map` | `(data: TData, context?: TSerializeContext) => unknown` | Computes the output value from the complete source object and optional serialization context. |

Without `map`, the field value is read from the source object using the
decorator context's field accessor. Private, static, and symbol-keyed fields are
not supported.

### `Serializer`

```ts
type TSerializerTransform = 'camel' | 'pascal' | 'snake';

interface ISerializerOptions {
  readonly transform?: TSerializerTransform;
}

interface ISerializeOptions<TSchema> extends ISerializerOptions {
  readonly schema: TSchema;
  readonly context?: Readonly<Record<string, unknown>>;
}
```

The constructor-level transform defaults to `camel`. A transform supplied to
`serialize` overrides the constructor setting for that call.

```ts
const serializer = new Serializer({ transform: 'snake' });

const result = serializer.serialize(user, {
  schema: UserViewModel,
  context: { separator: ' ' },
  transform: 'camel',
});
```

The declared return type is `InstanceType<TSchema>` so consumers get the schema
shape at compile time. At runtime, the returned value is a plain object and is
not an instance of the schema class.

## Serialization Algorithm

1. Validate that `data` is a non-null object.
2. Validate that `schema` was registered by `@ViewModel()`.
3. Resolve and cache the schema's registered fields.
4. Iterate through fields in declaration order.
5. For each field, use its `map` function when present; otherwise read the
   same-named property from the source object.
6. Store each value under the field's configured output name.
7. Recursively transform keys in the complete result using the per-call
   transform or the serializer's default transform.
8. Return the transformed plain object.

Nested object keys are transformed even when the nested value is returned by a
field mapper. The serializer does not instantiate the schema or mutate the
input object.

## Metadata and Caching

Decorator state is held in memory using weak collections:

- A `WeakSet<Function>` identifies registered view-model constructors.
- A `WeakMap<Function, object>` associates a view model with decorator metadata.
- A `WeakMap<object, IViewModelField[]>` stores fields by metadata object.
- A `WeakMap<Function, readonly IViewModelField[]>` caches resolved fields by
  schema constructor.

Weak collections prevent registry entries from extending the lifetime of class
constructors or metadata. Resolved field arrays are frozen before caching.
Duplicate registration of the same property name within one metadata object is
ignored.

## Error Behavior

The implementation throws `TypeError` in these cases:

| Condition | Message |
| --- | --- |
| Serialization data is null or not an object | `Serializer data must be a non-null object.` |
| Schema lacks `@ViewModel()` | `Serializer schema must be decorated with @ViewModel().` |
| `@Field` decorates a private field | `@Field cannot decorate a private field.` |
| `@Field` decorates a static field | `@Field cannot decorate a static field.` |
| `@Field` decorates a symbol-keyed field | `@Field cannot decorate a symbol-keyed field.` |

Errors thrown by source getters or field mapping functions propagate unchanged.

## Required Behavior

- Undecorated source properties must not appear in output.
- Decorated properties whose value is `undefined` must remain present.
- Field order must match decorator registration order.
- Registrations from different view-model classes must remain isolated.
- `camel`, `pascal`, and `snake` transforms must apply recursively.
- A per-call transform must take precedence over the constructor transform.
- Serialization must not mutate its source object.
- The output must be a plain object, not a schema instance.

## Implementation Map

| Concern | Location |
| --- | --- |
| Public exports | `packages/core/src/index.ts` |
| Shared context type | `packages/core/src/interface.ts` |
| Field decorator | `packages/core/src/decorators/field.ts` |
| View-model decorator | `packages/core/src/decorators/viewModel.ts` |
| Field registry | `packages/core/src/registries/field.ts` |
| View-model registry | `packages/core/src/registries/viewModel.ts` |
| Field resolution and cache | `packages/core/src/resolvers/index.ts` |
| Serialization and transforms | `packages/core/src/serializer.ts` |
| Runtime specifications | `packages/core/src/__tests__/serializer.spec.ts` |
| Compile-time specifications | `packages/core/src/__tests__/serializer.types.ts` |

## Non-Goals

- Constructing class instances or running schema constructors.
- Runtime validation or coercion of field values.
- Automatic inclusion of undecorated properties.
- Asynchronous field mapping.
- Circular-reference handling during deep key transformation.
- Persistence of decorator metadata outside the running process.
