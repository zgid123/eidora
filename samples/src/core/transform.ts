import { Field, Serializer, ViewModel } from '@morphos/core';

interface IUser {
  readonly id: string;
  profile_details: {
    display_name: string;
  };
}

@ViewModel()
class UserViewModel {
  @Field
  id!: string;

  @Field
  profile_details!: {
    display_name: string;
  };
}

const user: IUser = {
  id: 'user-1',
  profile_details: {
    display_name: 'Alpha',
  },
};

const constructorDefault = new Serializer().serialize(user, {
  schema: UserViewModel,
});

const constructorCamel = new Serializer({
  transform: 'camel',
}).serialize(user, {
  schema: UserViewModel,
});

const constructorPascal = new Serializer({
  transform: 'pascal',
}).serialize(user, {
  schema: UserViewModel,
});

const constructorSnake = new Serializer({
  transform: 'snake',
}).serialize(user, {
  schema: UserViewModel,
});

const serializer = new Serializer({
  transform: 'snake',
});

const serializeCamel = serializer.serialize(user, {
  transform: 'camel',
  schema: UserViewModel,
});

const serializePascal = serializer.serialize(user, {
  transform: 'pascal',
  schema: UserViewModel,
});

const serializeSnake = serializer.serialize(user, {
  transform: 'snake',
  schema: UserViewModel,
});

console.log({
  constructorDefault,
  constructorCamel,
  constructorPascal,
  constructorSnake,
  serializeCamel,
  serializePascal,
  serializeSnake,
});
