import { ArkTypeAdapter, createSchema } from '@eidora/arktype';
import { Serializer } from '@eidora/core';
import { type } from 'arktype';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  type({
    id: 'string',
    name: 'string',
  }),
  {
    transform: {
      name(data: Readonly<IUserSource>, context) {
        return (
          data.translations.find((translation) => {
            return translation.locale === context?.['locale'];
          })?.name ?? ''
        );
      },
    },
  },
);

const result = new Serializer({
  adapter: new ArkTypeAdapter(),
}).serialize(
  {
    id: 'user-1',
    password: 'secret',
    translations: [
      {
        locale: 'en',
        name: 'Alpha',
      },
      {
        locale: 'vi',
        name: 'An',
      },
    ],
  },
  {
    context: {
      locale: 'vi',
    },
    schema: UserSchema,
  },
);

// { id: 'user-1', name: 'An' }
console.log(result);
