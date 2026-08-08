import { Serializer } from '@eidora/core';
import { z } from 'zod';

import { ZodAdapter } from '../index';

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
