import type { TSerializeContext } from '@eidora/core';
import type { output, ZodObject, ZodPipe, ZodTransform } from 'zod';

const createdSchemaBrand: unique symbol = Symbol('zodCreatedSchema');

export type TZodObjectTransform = ZodPipe<
  ZodObject,
  ZodTransform<Record<string, unknown>, Record<string, unknown>>
>;

export type TZodSchema = ZodObject | TZodObjectTransform;

export type TZodSchemaTransforms<TSchema extends TZodSchema> = Partial<{
  readonly [TKey in keyof output<TSchema>]: (
    data: Readonly<Partial<output<TSchema>>>,
    context?: TSerializeContext,
  ) => unknown;
}>;

export type TZodCreatedSchemaResult<
  TSchema extends TZodSchema,
  TTransforms extends TZodSchemaTransforms<TSchema>,
> = Partial<{
  [TKey in keyof output<TSchema>]: TKey extends keyof TTransforms
    ? NonNullable<TTransforms[TKey]> extends (...args: never[]) => infer TResult
      ? TResult
      : output<TSchema>[TKey]
    : output<TSchema>[TKey];
}>;

export interface ICreateSchemaOptions<
  TSchema extends TZodSchema,
  TTransforms extends TZodSchemaTransforms<TSchema>,
> {
  readonly transform?: TTransforms;
}

export interface IZodCreatedSchema<
  TSchema extends TZodSchema = TZodSchema,
  TTransforms extends TZodSchemaTransforms<TSchema> =
    TZodSchemaTransforms<TSchema>,
> {
  readonly [createdSchemaBrand]: true;
  readonly schema: TSchema;
  readonly transform: TTransforms;
}

interface IApplyZodSchemaTransformsParams {
  readonly data: object;
  readonly schema: IZodCreatedSchema;
  readonly context?: TSerializeContext;
}

export function createSchema<
  TSchema extends TZodSchema,
  const TTransforms extends TZodSchemaTransforms<TSchema> = {},
>(
  schema: TSchema,
  {
    transform,
  }: ICreateSchemaOptions<TSchema, TTransforms> & {
    readonly transform?: TZodSchemaTransforms<TSchema>;
  } = {},
): IZodCreatedSchema<TSchema, TTransforms> {
  return {
    schema,
    transform: transform ?? ({} as TTransforms),
    [createdSchemaBrand]: true,
  };
}

export function isZodCreatedSchema(
  schema: unknown,
): schema is IZodCreatedSchema {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    createdSchemaBrand in schema &&
    schema[createdSchemaBrand] === true
  );
}

export function applyZodSchemaTransforms({
  data,
  schema,
  context,
}: IApplyZodSchemaTransformsParams): Record<string, unknown> {
  const parsedData = data as Readonly<Record<string, unknown>>;
  const result = {
    ...parsedData,
  };

  for (const [key, transform] of Object.entries(schema.transform)) {
    if (!Object.hasOwn(parsedData, key) || typeof transform !== 'function') {
      continue;
    }

    const transformedValue = transform(parsedData, context);

    if (transformedValue === undefined) {
      delete result[key];
      continue;
    }

    result[key] = transformedValue;
  }

  return result;
}
