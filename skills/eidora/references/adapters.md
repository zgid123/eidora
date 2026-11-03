# Schema Adapters in Eidora

Eidora provides an adapter interface allowing external schema libraries (like Zod, ArkType, Valibot, TypeBox) to act as native view-model schemas in `Serializer`.

## Official Adapters

- `@eidora/zod`: Lenient Zod object validation and projection.
- `@eidora/arktype`: Lenient ArkType object validation and projection.

## Adapter Architecture

Adapters implement the `IAdapter` interface and provide an associated `IAdapterType`:

```ts
import type { IAdapter, IAdapterType, TSerializeContext } from '@eidora/core';

export class CustomAdapter implements IAdapter<MySchema, unknown> {
  readonly [IAdapterType]!: MyAssociatedType;

  supports(schema: unknown): schema is MySchema {
    // Return true if this schema is handled by this adapter
    return isMySchema(schema);
  }

  serialize(
    data: unknown,
    schema: MySchema,
    context?: TSerializeContext,
  ): unknown {
    // Perform lenient projection and return plain object
    return projectData(data, schema, context);
  }
}
```

## Using an Adapter

Pass the adapter instance to `new Serializer({ adapter })`:

```ts
import { Serializer } from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const serializer = new Serializer({
  adapter: new ZodAdapter(),
});

const schema = z.object({
  id: z.string(),
});

const output = serializer.serialize(inputData, {
  schema,
});
```

When an adapter is provided:

1. `serializer.serialize` checks if the passed schema is supported by the adapter.
2. If supported, the adapter's `serialize()` method processes the data.
3. The adapter's output is passed through the serializer's recursive key transforms.
4. The return type is statically inferred using the adapter's associated type contract.
