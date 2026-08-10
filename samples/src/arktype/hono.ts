import { serialize } from '@eidora/hono-arktype-middleware';
import { type } from 'arktype';
import { Hono } from 'hono';

const UserSchema = type({
  id: 'string',
  display_name: 'string',
});

export const app = new Hono().get(
  '/users/:id',
  serialize(UserSchema),
  (context) => {
    return context.json({
      data: {
        id: context.req.param('id'),
        display_name: 'Alpha',
        password: 'secret',
      },
    });
  },
);
