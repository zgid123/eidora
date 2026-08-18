import type { TSerializeContext } from '@eidora/core';

const createdSchemaBrand: unique symbol = Symbol('arkTypeCreatedSchema');

export interface IArkTypeSchema {
  readonly infer: object;
  readonly inferIn: object;
}

type TArkTypeSchemaTransform<
  TSchema extends IArkTypeSchema,
  TSource extends object,
  TKey extends keyof TSchema['inferIn'],
> = {
  bivarianceHack(
    data: Readonly<TSource>,
    context?: TSerializeContext,
  ): TSchema['inferIn'][TKey] | undefined;
}['bivarianceHack'];

export type TArkTypeSchemaTransforms<
  TSchema extends IArkTypeSchema,
  TSource extends object = Partial<TSchema['inferIn']>,
> = Partial<{
  readonly [TKey in keyof TSchema['inferIn']]: TArkTypeSchemaTransform<
    TSchema,
    TSource,
    TKey
  >;
}>;

export type TArkTypeCreatedSchemaResult<TSchema extends IArkTypeSchema> =
  Partial<TSchema['infer']>;

export interface ICreateSchemaOptions<
  TSchema extends IArkTypeSchema,
  TSource extends object = Partial<TSchema['inferIn']>,
> {
  readonly transform?: TArkTypeSchemaTransforms<TSchema, TSource>;
}

export interface IArkTypeCreatedSchema<
  TSchema extends IArkTypeSchema = IArkTypeSchema,
> {
  readonly [createdSchemaBrand]: true;
  readonly schema: TSchema;
  readonly transform: TArkTypeSchemaTransforms<TSchema>;
}

export interface IArkTypeCreatedSchemaRuntime {
  readonly [createdSchemaBrand]: true;
  readonly schema: IArkTypeSchema;
  readonly transform: Readonly<Record<string, unknown>>;
}

interface IApplyArkTypeSchemaTransformsParams {
  readonly data: object;
  readonly schema: IArkTypeCreatedSchemaRuntime;
  readonly context?: TSerializeContext;
}

interface ICreateSchema {
  <TSchema extends IArkTypeSchema>(
    schema: TSchema,
    options?: ICreateSchemaOptions<TSchema, Partial<TSchema['inferIn']>>,
  ): IArkTypeCreatedSchema<TSchema>;

  <TSchema extends IArkTypeSchema, TSource extends object>(
    schema: TSchema,
    options: ICreateSchemaOptions<TSchema, TSource>,
  ): IArkTypeCreatedSchema<TSchema>;
}

function createSchemaImplementation<TSchema extends IArkTypeSchema>(
  schema: TSchema,
  { transform }: ICreateSchemaOptions<TSchema> = {},
): IArkTypeCreatedSchema<TSchema> {
  return {
    schema,
    transform: transform ?? {},
    [createdSchemaBrand]: true,
  };
}

export const createSchema = createSchemaImplementation as ICreateSchema;

export function isArkTypeCreatedSchema(
  schema: unknown,
): schema is IArkTypeCreatedSchemaRuntime {
  return (
    typeof schema === 'object' &&
    schema !== null &&
    createdSchemaBrand in schema &&
    schema[createdSchemaBrand] === true
  );
}

export function applyArkTypeSchemaTransforms({
  data,
  schema,
  context,
}: IApplyArkTypeSchemaTransformsParams): Record<string, unknown> {
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
