import { Serializer } from '@eidora/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { ZodAdapter } from '../zodAdapter';

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
});
