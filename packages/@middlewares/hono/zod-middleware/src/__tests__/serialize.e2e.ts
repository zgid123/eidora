import { createSchema } from '@eidora/zod';
import { Hono } from 'hono';
import { z } from 'zod';

import { serialize } from '../serialize';

const UserSchema = z.object({
  id: z.string(),
  display_name: z.string(),
});

type TContextEnv = {
  readonly Variables: {
    readonly prefix: string;
    readonly suffix: string;
  };
};

describe('#serialize', () => {
  suite('when the handler returns a JSON data envelope', () => {
    it('serializes data and preserves the response metadata', async () => {
      const app = new Hono().get('/', serialize(UserSchema), (context) => {
        return context.json(
          {
            data: {
              id: 'user-1',
              password: 'secret',
              display_name: 'Alpha',
            },
            meta: {
              requestId: 'request-1',
            },
          },
          201,
          {
            'x-request-id': 'request-1',
          },
        );
      });

      const response = await app.request('/');

      await expect(response.json()).resolves.toEqual({
        data: {
          id: 'user-1',
          displayName: 'Alpha',
        },
        meta: {
          requestId: 'request-1',
        },
      });
      expect(response.status).toBe(201);
      expect(response.headers.get('x-request-id')).toBe('request-1');
    });
  });

  suite('when the data property is an array', () => {
    it('serializes every item', async () => {
      const app = new Hono().get('/', serialize(UserSchema), (context) => {
        return context.json({
          data: [
            {
              id: 'user-1',
              password: 'secret-1',
              display_name: 'Alpha',
            },
            {
              id: 'user-2',
              password: 'secret-2',
              display_name: 'Beta',
            },
          ],
        });
      });

      const response = await app.request('/');

      await expect(response.json()).resolves.toEqual({
        data: [
          {
            id: 'user-1',
            displayName: 'Alpha',
          },
          {
            id: 'user-2',
            displayName: 'Beta',
          },
        ],
      });
    });
  });

  suite('when the schema uses serialization context', () => {
    it('merges Hono variables and additional context for every item', async () => {
      const ContextUserSchema = createSchema(UserSchema, {
        transform: {
          id(data, context) {
            return `${String(context?.['prefix'])}${data.id}${String(context?.['suffix'])}`;
          },
        },
      });
      const app = new Hono<TContextEnv>().get(
        '/',
        serialize(ContextUserSchema, {
          suffix: ':additional',
        }),
        (context) => {
          context.set('prefix', 'request:');
          context.set('suffix', ':request');

          return context.json({
            data: [
              {
                id: 'user-1',
                display_name: 'Alpha',
              },
              {
                id: 'user-2',
                display_name: 'Beta',
              },
            ],
          });
        },
      );

      const response = await app.request('/');

      await expect(response.json()).resolves.toEqual({
        data: [
          {
            id: 'request:user-1:additional',
            displayName: 'Alpha',
          },
          {
            id: 'request:user-2:additional',
            displayName: 'Beta',
          },
        ],
      });
    });
  });

  suite('when the handler returns a JSON response without data', () => {
    it('leaves the response unchanged', async () => {
      const app = new Hono().get('/', serialize(UserSchema), (context) => {
        return context.json(
          {
            error: 'User not found',
          },
          404,
        );
      });

      const response = await app.request('/');

      await expect(response.json()).resolves.toEqual({
        error: 'User not found',
      });
      expect(response.status).toBe(404);
    });
  });

  suite('when the handler returns a non-JSON response', () => {
    it('leaves the response unchanged', async () => {
      const app = new Hono().get('/', serialize(UserSchema), (context) => {
        return context.text('Not found', 404);
      });

      const response = await app.request('/');

      await expect(response.text()).resolves.toBe('Not found');
      expect(response.status).toBe(404);
    });
  });

  suite('when the data property is a primitive', () => {
    it('passes the serialization error to Hono error handling', async () => {
      const app = new Hono();

      app.onError((error, context) => {
        return context.json(
          {
            error: error.message,
          },
          500,
        );
      });
      app.get('/', serialize(UserSchema), (context) => {
        return context.json({
          data: 'user-1',
        });
      });

      const response = await app.request('/');

      await expect(response.json()).resolves.toEqual({
        error: 'Serialized response data must be an object, array, or null.',
      });
      expect(response.status).toBe(500);
    });
  });
});
