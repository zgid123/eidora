import { Serializer } from '@eidora/core';
import { type } from 'arktype';

import { ArkTypeAdapter, createSchema } from '../index';

const arktypeAdapter = new ArkTypeAdapter();

describe('#ArkTypeAdapter', () => {
  suite('when data matches an ArkType object schema', () => {
    it('serializes declared properties and applies property morphs', () => {
      const schema = type({
        age: 'string.numeric.parse',
        display_name: 'string',
      });
      const data = {
        age: '30',
        password: 'secret',
        display_name: 'Alpha',
      };

      const result = new Serializer({
        adapter: arktypeAdapter,
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
  });

  suite('when declared properties are missing or invalid', () => {
    it('omits them while preserving valid properties', () => {
      const schema = type({
        id: 'string',
        name: 'string',
        address: 'string',
      });

      const result = new Serializer({
        adapter: arktypeAdapter,
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
  });

  suite('when a property declares a default', () => {
    it('includes the default for missing data', () => {
      const schema = type({
        name: 'string',
        role: "'admin' | 'user' = 'user'",
      });

      const result = new Serializer({
        adapter: arktypeAdapter,
      }).serialize(
        {
          name: 'Alpha',
        },
        {
          schema,
        },
      );

      expect(result).toEqual({
        name: 'Alpha',
        role: 'user',
      });
    });
  });

  suite('when a property declares a nested object schema', () => {
    it('preserves nested validation and key transformation', () => {
      const schema = type({
        profile_data: {
          display_name: 'string',
        },
      });

      const result = new Serializer({
        adapter: arktypeAdapter,
      }).serialize(
        {
          profile_data: {
            display_name: 'Alpha',
          },
        },
        {
          schema,
        },
      );

      expect(result).toEqual({
        profileData: {
          displayName: 'Alpha',
        },
      });
    });
  });

  suite('when an object schema declares a root morph', () => {
    it('maps the parsed partial input to a different object shape', () => {
      const schema = type({
        address: 'string',
        lastName: 'string',
        firstName: 'string',
      }).pipe(({ address, firstName, lastName }) => {
        return {
          address,
          fullName: `${firstName} ${lastName}`,
        };
      });

      const result = new Serializer({
        adapter: arktypeAdapter,
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
  });

  suite('when a root morph produces a non-object result', () => {
    it('returns an empty object', () => {
      const schema = type({
        id: 'string',
      }).pipe(({ id }) => id);

      const result = arktypeAdapter.serialize({
        data: {
          id: 'user-1',
        },
        schema: schema as never,
      });

      expect(result).toEqual({});
    });
  });

  suite('when a property morph throws', () => {
    it('propagates the original error', () => {
      const error = new Error('Unable to transform identifier');
      const schema = type({
        id: type('string').pipe(() => {
          throw error;
        }),
      });

      expect(() =>
        new Serializer({
          adapter: arktypeAdapter,
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
  });

  suite('when checking supported schemas', () => {
    it('accepts object Types and object root morphs', () => {
      expect(
        arktypeAdapter.supports(
          type({
            id: 'string',
          }),
        ),
      ).toBe(true);
      expect(
        arktypeAdapter.supports(
          type({
            id: 'string',
          }).pipe(({ id }) => {
            return {
              id,
            };
          }),
        ),
      ).toBe(true);
      expect(arktypeAdapter.supports(type('string'))).toBe(false);
      expect(
        arktypeAdapter.supports(
          type({
            id: 'string',
          }).or({
            name: 'string',
          }),
        ),
      ).toBe(false);
      expect(arktypeAdapter.supports({})).toBe(false);
    });
  });

  suite('when serializing repeatedly with the same schema', () => {
    it('reuses the cached lenient schema', () => {
      const schema = type({
        id: 'string',
      });
      const mapSpy = vi.spyOn(schema, 'map');
      const serializer = new Serializer({
        adapter: new ArkTypeAdapter(),
      });

      serializer.serialize(
        {
          id: 'user-1',
        },
        {
          schema,
        },
      );
      serializer.serialize(
        {
          id: 'user-2',
        },
        {
          schema,
        },
      );

      expect(mapSpy).toHaveBeenCalledOnce();
    });
  });

  suite('when a created schema defines property transforms', () => {
    it('transforms selected raw properties with serialization context', () => {
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
      interface IUserSource {
        readonly id: string;
        readonly password: string;
        readonly role: 'admin' | 'member';
      }

      const schema = createSchema(
        type({
          id: 'string',
          role: 'string',
        }),
        {
          transform: {
            role(data: Readonly<IUserSource>, context) {
              const locale = context?.['locale'] === 'vi' ? 'vi' : 'en';

              return roleLabels[locale][data.role];
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
        adapter: arktypeAdapter,
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

    it('provides every transform the same raw pre-transform data', () => {
      const receivedData: Array<Readonly<object>> = [];
      interface IAgeSource {
        readonly age: string;
        readonly id: string;
      }

      const schema = createSchema(
        type({
          age: 'number',
          id: 'string',
        }),
        {
          transform: {
            id(data: Readonly<IAgeSource>) {
              receivedData.push(data);

              return `${data.id}:${data.age}`;
            },
            age(data: Readonly<IAgeSource>) {
              receivedData.push(data);

              return Number(data.age);
            },
          },
        },
      );

      const result = new Serializer({
        adapter: arktypeAdapter,
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
        age: 30,
        id: 'user-1:30',
      });
      expect(receivedData).toHaveLength(2);
      expect(receivedData[0]).toBe(receivedData[1]);
      expect(receivedData[0]).toEqual({
        age: '30',
        id: 'user-1',
      });
    });

    it('runs declared transforms before parsing even when properties are missing', () => {
      const idTransform = vi.fn(() => 'transformed-id');
      const nameTransform = vi.fn(() => 'transformed-name');
      const roleTransform = vi.fn(() => undefined);
      const schema = createSchema(
        type({
          id: 'string',
          name: 'string',
          role: "'admin' | 'member' = 'member'",
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
        adapter: arktypeAdapter,
      }).serialize(
        {
          id: 1,
        },
        {
          schema,
        },
      );

      expect(result).toEqual({
        id: 'transformed-id',
        name: 'transformed-name',
        role: 'member',
      });
      expect(idTransform).toHaveBeenCalledWith({ id: 1 }, undefined);
      expect(nameTransform).toHaveBeenCalledWith({ id: 1 }, undefined);
      expect(roleTransform).toHaveBeenCalledWith({ id: 1 }, undefined);
    });

    it('parses transformed values through a native morph', () => {
      const schema = createSchema(
        type({
          id: 'string.numeric.parse',
        }),
        {
          transform: {
            id() {
              return '42';
            },
          },
        },
      );

      const result = new Serializer({
        adapter: arktypeAdapter,
      }).serialize(
        {},
        {
          schema,
        },
      );

      expect(result).toEqual({
        id: 42,
      });
    });

    it('omits transformed values rejected by the output schema', () => {
      const schema = createSchema(
        type({
          score: 'number > 0',
        }),
        {
          transform: {
            score() {
              return -1;
            },
          },
        },
      );

      const result = new Serializer({
        adapter: arktypeAdapter,
      }).serialize(
        {
          score: 10,
        },
        {
          schema,
        },
      );

      expect(result).toEqual({});
    });

    it('applies created-schema transforms before a native root morph', () => {
      const schema = createSchema(
        type({
          lastName: 'string',
          firstName: 'string',
        }).pipe(({ firstName, lastName }) => {
          return {
            fullName: `${firstName} ${lastName}`,
          };
        }),
        {
          transform: {
            firstName(data) {
              return data.firstName?.toUpperCase();
            },
          },
        },
      );

      const result = new Serializer({
        adapter: arktypeAdapter,
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
        fullName: 'ALPHA Cifer',
      });
    });

    it('uses typed source-only properties without exposing them in output', () => {
      interface IQuestionSource {
        readonly title?: string;
        readonly translations?: ReadonlyArray<{
          readonly title?: string;
          readonly locale?: string;
        }>;
      }

      const schema = createSchema(
        type({
          title: 'string',
        }),
        {
          transform: {
            title(data: Readonly<IQuestionSource>, context) {
              return (
                data.translations?.find((translation) => {
                  return translation.locale === context?.['locale'];
                })?.title ?? ''
              );
            },
          },
        },
      );

      const result = new Serializer({
        adapter: arktypeAdapter,
      }).serialize(
        {
          translations: [
            {
              title: 'Hello',
              locale: 'en',
            },
            {
              title: 'Xin chào',
              locale: 'vi',
            },
          ],
        },
        {
          context: {
            locale: 'vi',
          },
          schema,
        },
      );

      expect(result).toEqual({
        title: 'Xin chào',
      });
    });
  });

  suite('when serializing repeatedly with a created schema', () => {
    it('reuses the cached lenient schema', () => {
      const schema = createSchema(
        type({
          id: 'string',
        }),
        {
          transform: {
            id(data, context) {
              return `${data.id}:${String(context?.['requestId'])}`;
            },
          },
        },
      );
      const mapSpy = vi.spyOn(schema.schema, 'map');
      const serializer = new Serializer({
        adapter: new ArkTypeAdapter(),
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
      const mapCallsAfterFirstSerialization = mapSpy.mock.calls.length;
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

      expect(mapSpy).toHaveBeenCalledTimes(mapCallsAfterFirstSerialization);
    });
  });

  suite('when a created-schema transform throws', () => {
    it('propagates the original error', () => {
      const error = new Error('Unable to localize identifier');
      const schema = createSchema(
        type({
          id: 'string',
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
          adapter: arktypeAdapter,
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
      expect(schema.schema({ id: 'user-1' })).toEqual({
        id: 'user-1',
      });
    });
  });
});
