import type { TSerializeContext } from '@eidora/core';
import type { input, output, ZodObject, ZodPipe, ZodTransform } from 'zod';

const createdSchemaBrand: unique symbol = Symbol('zodCreatedSchema');

export type TZodObjectTransform = ZodPipe<
  ZodObject,
  ZodTransform<Record<string, unknown>, Record<string, unknown>>
>;

export type TZodSchema = ZodObject | TZodObjectTransform;

type TZodSchemaTransform<
  TSchema extends TZodSchema,
  TSource extends object,
  TKey extends keyof input<TSchema>,
> = {
  bivarianceHack(
    data: Readonly<TSource>,
    context?: TSerializeContext,
  ): input<TSchema>[TKey] | undefined;
}['bivarianceHack'];

export type TZodSchemaTransforms<
  TSchema extends TZodSchema,
  TSource extends object = Partial<input<TSchema>>,
> = Partial<{
  readonly [TKey in keyof input<TSchema>]: TZodSchemaTransform<
    TSchema,
    TSource,
    TKey
  >;
}>;

export type TZodCreatedSchemaResult<TSchema extends TZodSchema> = Partial<
  output<TSchema>
>;

export interface ICreateSchemaOptions<
  TSchema extends TZodSchema,
  TSource extends object = Partial<input<TSchema>>,
> {
  readonly transform?: TZodSchemaTransforms<TSchema, TSource>;
}

export interface IZodCreatedSchema<TSchema extends TZodSchema = TZodSchema> {
  readonly [createdSchemaBrand]: true;
  readonly schema: TSchema;
  readonly transform: TZodSchemaTransforms<TSchema>;
}

export interface IZodCreatedSchemaRuntime {
  readonly [createdSchemaBrand]: true;
  readonly schema: TZodSchema;
  readonly transform: Readonly<Record<string, unknown>>;
}

interface IApplyZodSchemaTransformsParams {
  readonly data: object;
  readonly schema: IZodCreatedSchemaRuntime;
  readonly context?: TSerializeContext;
}

interface ICreateSchema {
  <TSchema extends TZodSchema>(
    schema: TSchema,
    options?: ICreateSchemaOptions<TSchema, Partial<input<TSchema>>>,
  ): IZodCreatedSchema<TSchema>;

  <TSchema extends TZodSchema, TSource extends object>(
    schema: TSchema,
    options: ICreateSchemaOptions<TSchema, TSource>,
  ): IZodCreatedSchema<TSchema>;
}

function createSchemaImplementation<TSchema extends TZodSchema>(
  schema: TSchema,
  { transform }: ICreateSchemaOptions<TSchema> = {},
): IZodCreatedSchema<TSchema> {
  return {
    schema,
    transform: transform ?? {},
    [createdSchemaBrand]: true,
  };
}

export const createSchema = createSchemaImplementation as ICreateSchema;

export function isZodCreatedSchema(
  schema: unknown,
): schema is IZodCreatedSchemaRuntime {
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
  const sourceData = data as Readonly<Record<string, unknown>>;
  const result = {
    ...sourceData,
  };

  for (const [key, transform] of Object.entries(schema.transform)) {
    if (typeof transform !== 'function') {
      continue;
    }

    const transformedValue = transform(sourceData, context);

    if (transformedValue === undefined) {
      delete result[key];
      continue;
    }

    result[key] = transformedValue;
  }

  return result;
}
