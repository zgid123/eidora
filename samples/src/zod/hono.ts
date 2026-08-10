import { serialize } from '@eidora/hono-zod-middleware';
import { Hono } from 'hono';
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  display_name: z.string(),
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
