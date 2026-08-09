import { Serializer } from '@eidora/core';
import { type } from 'arktype';

import { ArkTypeAdapter } from '../arktypeAdapter';

const arktypeAdapter = new ArkTypeAdapter();
const schema = type({
  id: 'string',
  age: 'string.numeric.parse',
});

const result = new Serializer({
  adapter: arktypeAdapter,
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

const mappedSchema = type({
  lastName: 'string',
  firstName: 'string',
}).pipe(({ firstName, lastName }) => {
  return {
    fullName: `${firstName} ${lastName}`,
  };
});

const mappedResult = new Serializer({
  adapter: arktypeAdapter,
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
  adapter: arktypeAdapter,
}).serialize(
  {},
  {
    // @ts-expect-error Adapter root morphs must produce an object.
    schema: type({}).pipe(() => 'invalid'),
  },
);
