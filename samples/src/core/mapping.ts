import { Field, Serializer, ViewModel } from '@morphos/core';

interface IUser {
  readonly id: string;
  firstName: string;
  lastName: string;
  password: string;
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field({
    map(user: IUser, context) {
      const separator = context?.['separator'];

      return [user.firstName, user.lastName].join(
        typeof separator === 'string' ? separator : ' ',
      );
    },
  })
  displayName!: string;
}

const user: IUser = {
  id: 'user-1',
  firstName: 'Alpha',
  lastName: 'Cifer',
  password: 'secret',
};

const result = new Serializer().serialize(user, {
  schema: UserViewModel,
  context: {
    separator: ' · ',
  },
});

console.log(result);
