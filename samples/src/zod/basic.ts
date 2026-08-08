import { Serializer } from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  age: z.coerce.number(),
  address: z.string(),
});

const user = {
  id: 'user-1',
  age: '30',
  password: 'secret',
};

const result = new Serializer({
  adapter: new ZodAdapter(),
}).serialize(user, {
  schema: UserSchema,
});

console.log(result);
