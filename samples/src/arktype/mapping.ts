import { ArkTypeAdapter } from '@eidora/arktype';
import { Serializer } from '@eidora/core';
import { type } from 'arktype';

const ROLE_LABELS = {
  admin: 'Administrator',
  member: 'Member',
} as const;

const UserSchema = type({
  id: 'string',
  role: type("'admin' | 'member'").pipe((role) => ROLE_LABELS[role]),
  address: 'string',
  lastName: 'string',
  firstName: 'string',
}).pipe(({ id, role, address, firstName, lastName }) => {
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
  adapter: new ArkTypeAdapter(),
}).serialize(user, {
  schema: UserSchema,
});

console.log(result);
