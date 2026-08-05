import { Field, Serializer, ViewModel } from '@eidora/core';

interface IUser {
  readonly id: string;
  name: string;
  password: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field({
    name: 'displayName',
  })
  name!: string;
}

const user: IUser = {
  id: 'user-1',
  name: 'Alpha',
  password: 'secret',
};

const serializer = new Serializer();
const result = serializer.serialize(user, {
  schema: UserViewModel,
});

console.log(result);
