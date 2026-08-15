import { Serializer } from '@eidora/core';
import { z } from 'zod';

import { createSchema, ZodAdapter } from '../index';

const adapter = new ZodAdapter();

describe('ZodAdapter', () => {
  it('serializes and validates data with a Zod object schema', () => {
    const schema = z.object({
      age: z.coerce.number().int(),
      display_name: z.string(),
    });
    const data = {
      age: '30',
      password: 'secret',
      display_name: 'Alpha',
    };

    const result = new Serializer({
      adapter,
    }).serialize(data, {
      schema,
    });

    expect(result).toEqual({
      age: 30,
      displayName: 'Alpha',
    });
    expect(data).toEqual({
      age: '30',
      password: 'secret',
      display_name: 'Alpha',
    });
  });

  it('maps a Zod object schema to a different object shape', () => {
    const schema = z
      .object({
        address: z.string(),
        firstName: z.string(),
        lastName: z.string(),
      })
      .transform(({ address, firstName, lastName }) => {
        return {
          address,
          fullName: `${firstName} ${lastName}`,
        };
      });

    const result = new Serializer({
      adapter,
    }).serialize(
      {
        firstName: 'Alpha',
        lastName: 'Cifer',
      },
      {
        schema,
      },
    );

    expect(result).toEqual({
      fullName: 'Alpha Cifer',
    });
  });

  it('applies the configured transform after Zod parsing', () => {
    const schema = z.object({
      profileData: z.object({
        displayName: z.string(),
      }),
    });

    const result = new Serializer({
      adapter,
      transform: 'snake',
    }).serialize(
      {
        profileData: {
          displayName: 'Alpha',
        },
      },
      {
        schema,
      },
    );

    expect(result).toEqual({
      profile_data: {
        display_name: 'Alpha',
      },
    });
  });

  it('omits missing and invalid properties', () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
      address: z.string(),
    });

    const result = new Serializer({
      adapter,
    }).serialize(
      {
        id: 1,
        name: 'Alpha',
      },
      {
        schema,
      },
    );

    expect(result).toEqual({
      name: 'Alpha',
    });
  });

  it('propagates errors raised during Zod parsing', () => {
    const error = new Error('Unable to transform identifier');
    const schema = z.object({
      id: z.string().transform(() => {
        throw error;
      }),
    });

    expect(() =>
      new Serializer({
        adapter,
      }).serialize(
        {
          id: 'user-1',
        },
        {
          schema,
        },
      ),
    ).toThrow(error);
  });

  it('returns an empty object when a transformed schema produces a non-object result', () => {
    const schema = z
      .object({
        id: z.string(),
      })
      .transform(({ id }) => id);

    const result = adapter.serialize({
      data: {
        id: 'user-1',
      },
      schema: schema as never,
    });

    expect(result).toEqual({});
  });

  it('transforms selected parsed properties with serialization context', () => {
    const roleLabels = {
      en: {
        admin: 'Administrator',
        member: 'Member',
      },
      vi: {
        admin: 'Quản trị viên',
        member: 'Thành viên',
      },
    } as const;
    const schema = createSchema(
      z.object({
        id: z.string(),
        role: z.enum(['admin', 'member']),
      }),
      {
        transform: {
          role(data, context) {
            const locale = context?.['locale'] === 'vi' ? 'vi' : 'en';

            return data.role ? roleLabels[locale][data.role] : undefined;
          },
        },
      },
    );
    const data = {
      id: 'user-1',
      password: 'secret',
      role: 'admin',
    };
    const serializer = new Serializer({
      adapter,
    });

    const vietnameseResult = serializer.serialize(data, {
      context: {
        locale: 'vi',
      },
      schema,
    });
    const englishResult = serializer.serialize(data, {
      context: {
        locale: 'en',
      },
      schema,
    });

    expect(vietnameseResult).toEqual({
      id: 'user-1',
      role: 'Quản trị viên',
    });
    expect(englishResult).toEqual({
      id: 'user-1',
      role: 'Administrator',
    });
    expect(data).toEqual({
      id: 'user-1',
      password: 'secret',
      role: 'admin',
    });
  });

  it('provides every transform the same parsed pre-transform data', () => {
    const receivedData: Array<Readonly<object>> = [];
    const schema = createSchema(
      z.object({
        age: z.coerce.number(),
        id: z.string(),
      }),
      {
        transform: {
          id(data) {
            receivedData.push(data);

            return `${data.id}:${String(data.age)}`;
          },
          age(data) {
            receivedData.push(data);

            return data.id;
          },
        },
      },
    );

    const result = new Serializer({
      adapter,
    }).serialize(
      {
        age: '30',
        id: 'user-1',
      },
      {
        schema,
      },
    );

    expect(result).toEqual({
      age: 'user-1',
      id: 'user-1:30',
    });
    expect(receivedData).toHaveLength(2);
    expect(receivedData[0]).toBe(receivedData[1]);
    expect(receivedData[0]).toEqual({
      age: 30,
      id: 'user-1',
    });
  });

  it('skips transforms for omitted properties and removes undefined results', () => {
    const idTransform = vi.fn(() => 'transformed-id');
    const nameTransform = vi.fn(() => 'transformed-name');
    const roleTransform = vi.fn(() => undefined);
    const schema = createSchema(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().default('member'),
      }),
      {
        transform: {
          id: idTransform,
          name: nameTransform,
          role: roleTransform,
        },
      },
    );

    const result = new Serializer({
      adapter,
    }).serialize(
      {
        id: 1,
      },
      {
        schema,
      },
    );

    expect(result).toEqual({});
    expect(idTransform).not.toHaveBeenCalled();
    expect(nameTransform).not.toHaveBeenCalled();
    expect(roleTransform).toHaveBeenCalledWith(
      {
        role: 'member',
      },
      undefined,
    );
  });

  it('applies created-schema transforms after a native root transform', () => {
    const schema = createSchema(
      z
        .object({
          lastName: z.string(),
          firstName: z.string(),
        })
        .transform(({ firstName, lastName }) => {
          return {
            fullName: `${firstName} ${lastName}`,
          };
        }),
      {
        transform: {
          fullName(data) {
            return data.fullName?.toUpperCase();
          },
        },
      },
    );

    const result = new Serializer({
      adapter,
    }).serialize(
      {
        firstName: 'Alpha',
        lastName: 'Cifer',
      },
      {
        schema,
      },
    );

    expect(result).toEqual({
      fullName: 'ALPHA CIFER',
    });
  });

  it('reuses the cached lenient schema for a created schema', () => {
    const schema = createSchema(
      z.object({
        id: z.string(),
      }),
      {
        transform: {
          id(data, context) {
            return `${data.id}:${String(context?.['requestId'])}`;
          },
        },
      },
    );
    const shapeSpy = vi.spyOn(schema.schema, 'shape', 'get');
    const serializer = new Serializer({
      adapter: new ZodAdapter(),
    });

    serializer.serialize(
      {
        id: 'user-1',
      },
      {
        context: {
          requestId: 'request-1',
        },
        schema,
      },
    );
    const shapeReadsAfterFirstSerialization = shapeSpy.mock.calls.length;
    serializer.serialize(
      {
        id: 'user-2',
      },
      {
        context: {
          requestId: 'request-2',
        },
        schema,
      },
    );

    expect(shapeSpy).toHaveBeenCalledTimes(shapeReadsAfterFirstSerialization);
  });

  it('propagates errors raised by created-schema transforms', () => {
    const error = new Error('Unable to localize identifier');
    const schema = createSchema(
      z.object({
        id: z.string(),
      }),
      {
        transform: {
          id(data, context) {
            if (context?.['fail'] === true) {
              throw error;
            }

            return data.id;
          },
        },
      },
    );

    expect(() =>
      new Serializer({
        adapter,
      }).serialize(
        {
          id: 'user-1',
        },
        {
          context: {
            fail: true,
          },
          schema,
        },
      ),
    ).toThrow(error);
    expect(schema.schema.parse({ id: 'user-1' })).toEqual({
      id: 'user-1',
    });
  });
});
