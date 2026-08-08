import { Serializer } from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const ROLE_LABELS = {
  admin: 'Administrator',
  member: 'Member',
} as const;

const UserSchema = z
  .object({
    id: z.string(),
    role: z.enum(['admin', 'member']).transform((role) => ROLE_LABELS[role]),
    address: z.string(),
    lastName: z.string(),
    firstName: z.string(),
  })
  .transform(({ id, role, address, firstName, lastName }) => {
    return {
      id,
      role,
      address,
      fullName: `${firstName} ${lastName}`,
    };
  });

const user = {
  id: 'user-1',
  role: 'admin',
  lastName: 'Cifer',
  firstName: 'Alpha',
  password: 'secret',
};

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(user, {
  schema: UserSchema,
});

console.log(result);
