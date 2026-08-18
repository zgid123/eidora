import { Serializer } from '@eidora/core';
import { createSchema, ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

interface IUserSource {
  readonly id: string;
  readonly translations: ReadonlyArray<{
    readonly locale: string;
    readonly name: string;
  }>;
}

const UserSchema = createSchema(
  z.object({
    id: z.string(),
    name: z.string(),
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
  adapter: new ZodAdapter(),
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
