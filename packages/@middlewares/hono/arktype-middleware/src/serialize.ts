import { ArkTypeAdapter } from '@eidora/arktype';
import { Serializer, type TAdapterSchema } from '@eidora/core';
import type { MiddlewareHandler } from 'hono';
import { createMiddleware } from 'hono/factory';

type TArkTypeSchema = TAdapterSchema<ArkTypeAdapter>;

interface IJsonEnvelope {
  readonly data: unknown;
  readonly [key: string]: unknown;
}

const serializer = new Serializer({
  adapter: new ArkTypeAdapter(),
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

function serializeValue(value: unknown, schema: TArkTypeSchema): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, schema));
  }

  if (typeof value !== 'object') {
    throw new TypeError(
      'Serialized response data must be an object, array, or null.',
    );
  }

  return serializer.serialize(value, {
    schema,
  });
}

export function serialize(schema: TArkTypeSchema): MiddlewareHandler {
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

    const serializedBody = {
      ...body,
      data: serializeValue(body.data, schema),
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
