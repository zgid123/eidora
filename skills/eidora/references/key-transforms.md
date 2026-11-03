# Key Transforms in Eidora

Eidora supports recursive key casing transformations on all serialized outputs.

## Available Transformations

| Casing               | Option Value | Example Input Key         | Output Key   |
| -------------------- | ------------ | ------------------------- | ------------ |
| Camel Case (default) | `'camel'`    | `first_name`, `FirstName` | `firstName`  |
| Pascal Case          | `'pascal'`   | `first_name`, `firstName` | `FirstName`  |
| Snake Case           | `'snake'`    | `firstName`, `FirstName`  | `first_name` |

## Configuring Key Casing

Key transforms can be configured at the serializer instance level or per `serialize()` call. Per-call settings take precedence.

```ts
import { Serializer } from '@eidora/core';

// Instance default
const serializer = new Serializer({
  transform: 'snake',
});

// Overridden per call
const result = serializer.serialize(sourceData, {
  schema: MyViewModel,
  transform: 'pascal',
});
```

## Recursive Behavior

Key casing applies recursively to all nested objects and objects within arrays:

```ts
@ViewModel()
class CompanyViewModel {
  @Field
  company_info!: {
    hq_address: {
      postal_code: string;
    };
  };
}

const result = new Serializer({
  transform: 'camel',
}).serialize(
  {
    company_info: {
      hq_address: {
        postal_code: '10001',
      },
    },
  },
  {
    schema: CompanyViewModel,
  },
);

// Output:
// {
//   companyInfo: {
//     hqAddress: {
//       postalCode: '10001',
//     },
//   },
// }
```

## Interaction with `@Field({ name })`

When an explicit field name is specified using `@Field({ name: 'custom_name' })`, that name is treated as the property key and will be transformed according to the active key transform:

- If `transform: 'camel'`, `custom_name` becomes `customName`.
- If `transform: 'pascal'`, `custom_name` becomes `CustomName`.
- If `transform: 'snake'`, `custom_name` remains `custom_name`.

## Non-Object Values

Primitives, dates, buffers, and non-plain object structures are preserved without transformation.
