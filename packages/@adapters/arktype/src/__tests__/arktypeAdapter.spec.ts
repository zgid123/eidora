import { Serializer } from '@eidora/core';
import { type } from 'arktype';

import { ArkTypeAdapter } from '../arktypeAdapter';

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
});
