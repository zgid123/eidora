import { expectTypeOf } from 'vitest';

import { Field, Serializer, ViewModel } from '../index';

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field
  age!: number;

  @Field({
    map(data: { readonly name: string }, context) {
      expectTypeOf(data).toEqualTypeOf<{ readonly name: string }>();
      expectTypeOf(context).toEqualTypeOf<
        Readonly<Record<string, unknown>> | undefined
      >();

      return data.name;
    },
  })
  displayName!: string;
}

const serializer = new Serializer();
new Serializer({
  transform: 'snake',
});
new Serializer({
  // @ts-expect-error Only supported transforms can be used.
  transform: 'kebab',
});

const result = serializer.serialize(
  {
    id: 'user-1',
    age: 30,
    name: 'Alpha',
    password: 'secret',
  },
  {
    context: {
      locale: 'en-US',
      requesterId: 'user-1',
    },
    transform: 'pascal',
    schema: UserViewModel,
  },
);

serializer.serialize(
  {
    id: 'user-1',
    age: 30,
    name: 'Alpha',
  },
  {
    // @ts-expect-error Only supported transforms can be used.
    transform: 'kebab',
    schema: UserViewModel,
  },
);

expectTypeOf(result).toEqualTypeOf<UserViewModel>();

serializer.serialize(
  {
    name: 'Alpha',
  },
  {
    schema: UserViewModel,
  },
);

serializer.serialize(
  // @ts-expect-error Raw serializer data must be an object.
  'Alpha',
  {
    schema: UserViewModel,
  },
);
