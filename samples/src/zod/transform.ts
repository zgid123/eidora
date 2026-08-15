import { Serializer } from '@eidora/core';
import { createSchema, ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const ROLE_LABELS = {
  en: {
    admin: 'Administrator',
    member: 'Member',
  },
  vi: {
    admin: 'Quản trị viên',
    member: 'Thành viên',
  },
} as const;

const UserSchema = createSchema(
  z.object({
    id: z.string(),
    role: z.enum(['admin', 'member']),
  }),
  {
    transform: {
      role(data, context) {
        if (!data.role) {
          return undefined;
        }

        const locale = context?.['locale'] === 'vi' ? 'vi' : 'en';

        return ROLE_LABELS[locale][data.role];
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
    role: 'admin',
  },
  {
    context: {
      locale: 'vi',
    },
    schema: UserSchema,
  },
);

// { id: 'user-1', role: 'Quản trị viên' }
console.log(result);
