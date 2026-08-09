import { ArkTypeAdapter } from '@eidora/arktype';
import { Serializer } from '@eidora/core';
import { type } from 'arktype';

const UserSchema = type({
  id: 'string',
  age: 'string.numeric.parse',
  address: 'string',
});

const user = {
  id: 'user-1',
  age: '30',
  password: 'secret',
};

const result = new Serializer({
  adapter: new ArkTypeAdapter(),
}).serialize(user, {
  schema: UserSchema,
});

console.log(result);
