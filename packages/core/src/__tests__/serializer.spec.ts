import type {
  IAdapter,
  IAdapterSerializeParams,
  IAdapterType,
} from '../adapter';
import { Field, ViewModel } from '../decorators';
import { Serializer } from '../serializer';

interface IFieldContextOptions {
  readonly name: string | symbol;
  readonly metadata: DecoratorMetadata;
  readonly isStatic?: boolean;
  readonly isPrivate?: boolean;
}

function createFieldContext({
  name,
  metadata,
  isStatic = false,
  isPrivate = false,
}: IFieldContextOptions): ClassFieldDecoratorContext<object, unknown> {
  return {
    name,
    kind: 'field',
    static: isStatic,
    private: isPrivate,
    metadata,
    access: {
      has(object): boolean {
        return name in object;
      },
      get(object): unknown {
        return Reflect.get(object, name);
      },
      set(object, value): void {
        Reflect.set(object, name, value);
      },
    },
    addInitializer(): void {},
  };
}

function decorateViewModel<TConstructor extends new () => object>(
  constructor: TConstructor,
  fields: readonly string[],
): TConstructor {
  const metadata: DecoratorMetadata = {};

  for (const name of fields) {
    Field(
      undefined,
      createFieldContext({
        name,
        metadata,
      }),
    );
  }

  ViewModel()(constructor, {
    kind: 'class',
    name: constructor.name,
    metadata,
    addInitializer(): void {},
  });

  return constructor;
}

class UserViewModel {
  id!: string;

  name!: string;

  ignored?: string;
}

decorateViewModel(UserViewModel, ['id', 'name']);

interface ITestSchema {
  readonly kind: 'test';
}

interface ITestAdapterType extends IAdapterType {
  readonly schema: ITestSchema;
  readonly result: {
    readonly profile_data: {
      readonly display_name: unknown;
      readonly locale_code: unknown;
    };
  };
}

class TestAdapter implements IAdapter<ITestSchema, ITestAdapterType> {
  declare public readonly type: ITestAdapterType;

  public supports(schema: unknown): schema is ITestSchema {
    return (
      typeof schema === 'object' &&
      schema !== null &&
      Reflect.get(schema, 'kind') === 'test'
    );
  }

  public serialize<TSchema extends ITestSchema>({
    data,
    context,
  }: IAdapterSerializeParams<TSchema>): object {
    return {
      profile_data: {
        display_name: Reflect.get(data, 'name'),
        locale_code: context?.['locale'],
      },
    };
  }
}

describe('Serializer', () => {
  it('serializes a schema supported by the configured adapter', () => {
    const result = new Serializer({
      adapter: new TestAdapter(),
    }).serialize(
      {
        name: 'Alpha',
      },
      {
        schema: {
          kind: 'test',
        },
        context: {
          locale: 'en-US',
        },
      },
    );

    expect(result).toEqual({
      profileData: {
        displayName: 'Alpha',
        localeCode: 'en-US',
      },
    });
  });

  it('continues to serialize decorated schemas when an adapter is configured', () => {
    const result = new Serializer({
      adapter: new TestAdapter(),
    }).serialize(
      {
        id: 'user-1',
        name: 'Alpha',
      },
      {
        schema: UserViewModel,
      },
    );

    expect(result).toEqual({
      id: 'user-1',
      name: 'Alpha',
    });
  });

  it('serializes only decorated fields to a plain object', () => {
    const serializer = new Serializer();
    const data = {
      id: 'user-1',
      name: 'Alpha',
      password: 'secret',
    };

    const result = serializer.serialize(data, {
      schema: UserViewModel,
    });

    expect(result).toEqual({
      id: 'user-1',
      name: 'Alpha',
    });
    expect(result).not.toBeInstanceOf(UserViewModel);
  });

  it('camelizes serialized keys by default', () => {
    class RenamedFieldViewModel {
      name!: string;
    }

    const metadata: DecoratorMetadata = {};
    Field({
      name: 'display_name',
    })(
      undefined,
      createFieldContext({
        metadata,
        name: 'name',
      }),
    );
    ViewModel()(RenamedFieldViewModel, {
      kind: 'class',
      metadata,
      name: RenamedFieldViewModel.name,
      addInitializer(): void {},
    });

    const result = new Serializer().serialize(
      {
        name: 'Alpha',
      },
      {
        schema: RenamedFieldViewModel,
      },
    );

    expect(result).toEqual({
      displayName: 'Alpha',
    });
    expect(result).not.toHaveProperty('name');
  });

  it.each([
    {
      transform: 'camel' as const,
      expected: {
        profileData: {
          displayName: 'Alpha',
        },
      },
    },
    {
      transform: 'pascal' as const,
      expected: {
        ProfileData: {
          DisplayName: 'Alpha',
        },
      },
    },
    {
      transform: 'snake' as const,
      expected: {
        profile_data: {
          display_name: 'Alpha',
        },
      },
    },
  ])(
    'deeply applies the $transform constructor transform',
    ({ expected, transform }) => {
      class ProfileViewModel {
        profile_data!: {
          display_name: string;
        };
      }

      decorateViewModel(ProfileViewModel, ['profile_data']);

      const result = new Serializer({
        transform,
      }).serialize(
        {
          profile_data: {
            display_name: 'Alpha',
          },
        },
        {
          schema: ProfileViewModel,
        },
      );

      expect(result).toEqual(expected);
    },
  );

  it('uses the serialize transform instead of the constructor transform', () => {
    class ProfileViewModel {
      profileData!: {
        displayName: string;
      };
    }

    decorateViewModel(ProfileViewModel, ['profileData']);

    const result = new Serializer({
      transform: 'snake',
    }).serialize(
      {
        profileData: {
          displayName: 'Alpha',
        },
      },
      {
        transform: 'pascal',
        schema: ProfileViewModel,
      },
    );

    expect(result).toEqual({
      ProfileData: {
        DisplayName: 'Alpha',
      },
    });
  });

  it('transforms a field from the raw data and serialization context', () => {
    class GreetingViewModel {
      greeting!: string;
    }

    const metadata: DecoratorMetadata = {};
    Field({
      transform(data, context) {
        return `${Reflect.get(data, 'name')}, ${context?.['greeting']}`;
      },
    })(
      undefined,
      createFieldContext({
        metadata,
        name: 'greeting',
      }),
    );
    ViewModel()(GreetingViewModel, {
      kind: 'class',
      metadata,
      name: GreetingViewModel.name,
      addInitializer(): void {},
    });

    const result = new Serializer().serialize(
      {
        name: 'Alpha',
      },
      {
        context: {
          greeting: 'welcome',
        },
        schema: GreetingViewModel,
      },
    );

    expect(result).toEqual({
      greeting: 'Alpha, welcome',
    });
  });

  it('keeps fields in declaration order', () => {
    class OrderedViewModel {
      third!: string;

      first!: string;

      second!: string;
    }

    decorateViewModel(OrderedViewModel, ['third', 'first', 'second']);

    const result = new Serializer().serialize(
      {
        first: 'first',
        third: 'third',
        second: 'second',
      },
      {
        schema: OrderedViewModel,
      },
    );

    expect(Object.keys(result)).toEqual(['third', 'first', 'second']);
  });

  it('keeps view model field registrations independent', () => {
    class IdentifierViewModel {
      id!: string;
    }

    class NameViewModel {
      name!: string;
    }

    decorateViewModel(IdentifierViewModel, ['id']);
    decorateViewModel(NameViewModel, ['name']);

    const serializer = new Serializer();
    const data = {
      id: 'user-1',
      name: 'Alpha',
    };

    expect(
      serializer.serialize(data, {
        schema: IdentifierViewModel,
      }),
    ).toEqual({
      id: 'user-1',
    });
    expect(
      serializer.serialize(data, {
        schema: NameViewModel,
      }),
    ).toEqual({
      name: 'Alpha',
    });
  });

  it('includes decorated fields whose value is undefined', () => {
    class OptionalViewModel {
      value!: string | undefined;
    }

    decorateViewModel(OptionalViewModel, ['value']);

    const result = new Serializer().serialize(
      {
        value: undefined,
      },
      {
        schema: OptionalViewModel,
      },
    );

    expect(result).toEqual({
      value: undefined,
    });
    expect(result).toHaveProperty('value');
  });

  it('does not mutate the source object', () => {
    const data = Object.freeze({
      id: 'user-1',
      name: 'Alpha',
      password: 'secret',
    });

    new Serializer().serialize(data, {
      schema: UserViewModel,
    });

    expect(data).toEqual({
      id: 'user-1',
      name: 'Alpha',
      password: 'secret',
    });
  });

  it.each([null, undefined, 'value', 1, true])(
    'rejects non-object data: %s',
    (data) => {
      const serialize = new Serializer().serialize as unknown as (
        data: unknown,
        options: { schema: typeof UserViewModel },
      ) => UserViewModel;

      expect(() =>
        serialize(data, {
          schema: UserViewModel,
        }),
      ).toThrow(new TypeError('Serializer data must be a non-null object.'));
    },
  );

  it('rejects a schema without the ViewModel decorator', () => {
    class UndecoratedViewModel {
      id!: string;
    }

    expect(() =>
      new Serializer().serialize(
        {
          id: 'user-1',
        },
        {
          schema: UndecoratedViewModel,
        },
      ),
    ).toThrow(
      new TypeError(
        'Serializer schema must be decorated with @ViewModel() or supported by the configured adapter.',
      ),
    );
  });

  it('propagates errors thrown while reading a decorated field', () => {
    const error = new Error('Unable to read name');
    const data = {
      id: 'user-1',
      get name(): string {
        throw error;
      },
    };

    expect(() =>
      new Serializer().serialize(data, {
        schema: UserViewModel,
      }),
    ).toThrow(error);
  });
});

describe('Field', () => {
  it('rejects private fields', () => {
    expect(() =>
      Field(
        undefined,
        createFieldContext({
          name: '#secret',
          metadata: {},
          isPrivate: true,
        }),
      ),
    ).toThrow(new TypeError('@Field cannot decorate a private field.'));
  });

  it('rejects static fields', () => {
    expect(() =>
      Field(
        undefined,
        createFieldContext({
          name: 'value',
          metadata: {},
          isStatic: true,
        }),
      ),
    ).toThrow(new TypeError('@Field cannot decorate a static field.'));
  });

  it('rejects symbol-keyed fields', () => {
    const fieldName = Symbol('field');

    expect(() =>
      Field(
        undefined,
        createFieldContext({
          name: fieldName,
          metadata: {},
        }),
      ),
    ).toThrow(new TypeError('@Field cannot decorate a symbol-keyed field.'));
  });
});
