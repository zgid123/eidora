import {
  Serializer,
  type TAdapterSchema,
  type TSerializeContext,
} from '@eidora/core';
import { ZodAdapter } from '@eidora/zod';
import type { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';

type TZodSchema = TAdapterSchema<ZodAdapter>;

interface IJsonEnvelope {
  readonly data: unknown;
  readonly [key: string]: unknown;
}

const serializer = new Serializer({
  adapter: new ZodAdapter(),
});

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type');

  if (!contentType) {
    return false;
  }

  const mediaType = contentType.split(';', 1)[0]?.trim().toLowerCase();

  return (
    mediaType === 'application/json' || mediaType?.endsWith('+json') === true
  );
}

function isJsonEnvelope(value: unknown): value is IJsonEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'data' in value
  );
}

function serializeValue(
  value: unknown,
  schema: TZodSchema,
  context: TSerializeContext,
): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, schema, context));
  }

  if (typeof value !== 'object') {
    throw new TypeError(
      'Serialized response data must be an object, array, or null.',
    );
  }

  return serializer.serialize(value, {
    schema,
    context,
  });
}

export function serialize(
  schema: TZodSchema,
  additionalContext?: TSerializeContext,
): MiddlewareHandler {
  return createMiddleware(async (context, next): Promise<void> => {
    await next();

    const response = context.res;

    if (!isJsonResponse(response)) {
      return;
    }

    const body: unknown = await response.clone().json();

    if (!isJsonEnvelope(body)) {
      return;
    }

    const serializationContext = {
      ...context.var,
      ...additionalContext,
    };
    const serializedBody = {
      ...body,
      data: serializeValue(body.data, schema, serializationContext),
    };
    const headers = new Headers(response.headers);

    headers.delete('content-length');
    context.res = new Response(JSON.stringify(serializedBody), {
      status: response.status,
      headers,
      statusText: response.statusText,
    });
  });
}
