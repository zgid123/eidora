import { Serializer } from '@eidora/core';
import { z } from 'zod';

import { createSchema, ZodAdapter } from '../index';

const adapter = new ZodAdapter();

const schema = z.object({
  id: z.string(),
  age: z.coerce.number(),
});

const result = new Serializer({
  adapter,
}).serialize(
  {
    id: 'user-1',
    age: '30',
  },
  {
    schema,
  },
);

type TExpectedResult = {
  id?: string;
  age?: number;
};

expectTypeOf(result).toExtend<TExpectedResult>();
expectTypeOf<TExpectedResult>().toExtend<typeof result>();

const mappedSchema = z
  .object({
    firstName: z.string(),
    lastName: z.string(),
  })
  .transform(({ firstName, lastName }) => {
    return {
      fullName: `${firstName} ${lastName}`,
    };
  });

const mappedResult = new Serializer({
  adapter,
}).serialize(
  {
    firstName: 'Alpha',
    lastName: 'Cifer',
  },
  {
    schema: mappedSchema,
  },
);

type TExpectedMappedResult = {
  fullName?: string;
};

expectTypeOf(mappedResult).toExtend<TExpectedMappedResult>();
expectTypeOf<TExpectedMappedResult>().toExtend<typeof mappedResult>();

const contextAwareSchema = createSchema(
  z.object({
    age: z.coerce.number(),
    id: z.string(),
  }),
  {
    transform: {
      id(data, context) {
        expectTypeOf(data).toEqualTypeOf<
          Readonly<
            Partial<{
              age: number;
              id: string;
            }>
          >
        >();
        expectTypeOf(context).toEqualTypeOf<
          Readonly<Record<string, unknown>> | undefined
        >();

        return {
          value: `${data.id}:${String(context?.['locale'])}`,
        };
      },
    },
  },
);

const contextAwareResult = new Serializer({
  adapter,
}).serialize(
  {
    id: 'user-1',
    age: '30',
  },
  {
    context: {
      locale: 'vi',
    },
    schema: contextAwareSchema,
  },
);

type TExpectedContextAwareResult = {
  age?: number;
  id?: {
    value: string;
  };
};

expectTypeOf(contextAwareResult).toExtend<TExpectedContextAwareResult>();
expectTypeOf<TExpectedContextAwareResult>().toExtend<
  typeof contextAwareResult
>();

const normallyCreatedSchema = createSchema(schema);
const normallyCreatedResult = new Serializer({
  adapter,
}).serialize(
  {},
  {
    schema: normallyCreatedSchema,
  },
);

expectTypeOf(normallyCreatedResult).toExtend<TExpectedResult>();
expectTypeOf<TExpectedResult>().toExtend<typeof normallyCreatedResult>();

createSchema(schema, {
  transform: {
    // @ts-expect-error Transform keys must exist in the native schema output.
    missing() {
      return 'invalid';
    },
  },
});

// @ts-expect-error Created schemas must wrap a supported object schema.
createSchema(z.string());

new Serializer({
  adapter,
}).serialize(
  {},
  {
    // @ts-expect-error Adapter serialization requires an object-producing schema.
    schema: z.string(),
  },
);

new Serializer({
  adapter,
}).serialize(
  {},
  {
    // @ts-expect-error Adapter transforms must produce an object.
    schema: z.object({}).transform(() => 'invalid'),
  },
);
