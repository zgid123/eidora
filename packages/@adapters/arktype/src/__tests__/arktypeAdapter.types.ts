import { Serializer } from '@eidora/core';
import { type } from 'arktype';

import { ArkTypeAdapter, createSchema } from '../index';

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

interface IContextAwareSource {
  readonly age: string;
  readonly id: string;
  readonly localeLabel?: string;
}

const contextAwareSchema = createSchema(
  type({
    age: 'number',
    id: {
      value: 'string',
    },
  }),
  {
    transform: {
      id(data: Readonly<IContextAwareSource>, context) {
        expectTypeOf(data).toEqualTypeOf<Readonly<IContextAwareSource>>();
        expectTypeOf(context).toEqualTypeOf<
          Readonly<Record<string, unknown>> | undefined
        >();

        return {
          value: `${data.id}:${String(context?.['locale'])}`,
        };
      },
      age(data: Readonly<IContextAwareSource>) {
        return Number(data.age);
      },
    },
  },
);

const contextAwareResult = new Serializer({
  adapter: arktypeAdapter,
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
  adapter: arktypeAdapter,
}).serialize(
  {},
  {
    schema: normallyCreatedSchema,
  },
);

expectTypeOf(normallyCreatedResult).toExtend<TExpectedResult>();
expectTypeOf<TExpectedResult>().toExtend<typeof normallyCreatedResult>();

const morphedTransformSchema = createSchema(
  type({
    id: 'string.numeric.parse',
  }),
  {
    transform: {
      id() {
        return '42';
      },
    },
  },
);
const morphedTransformResult = new Serializer({
  adapter: arktypeAdapter,
}).serialize(
  {},
  {
    schema: morphedTransformSchema,
  },
);

type TExpectedMorphedTransformResult = {
  id?: number;
};

expectTypeOf(
  morphedTransformResult,
).toExtend<TExpectedMorphedTransformResult>();
expectTypeOf<TExpectedMorphedTransformResult>().toExtend<
  typeof morphedTransformResult
>();

createSchema(schema, {
  transform: {
    // @ts-expect-error Transform keys must exist in the native schema input.
    missing() {
      return 'invalid';
    },
  },
});

createSchema(
  type({
    id: 'string',
  }),
  {
    transform: {
      // @ts-expect-error Transform values must satisfy the native schema input.
      id() {
        return 1;
      },
    },
  },
);

// @ts-expect-error Created schemas must wrap a supported object schema.
createSchema(type('string'));

new Serializer({
  adapter: arktypeAdapter,
}).serialize(
  {},
  {
    // @ts-expect-error Adapter root morphs must produce an object.
    schema: type({}).pipe(() => 'invalid'),
  },
);
