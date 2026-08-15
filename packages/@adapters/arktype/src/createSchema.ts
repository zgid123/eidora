import type { TSerializeContext } from '@eidora/core';

const createdSchemaBrand: unique symbol = Symbol('arkTypeCreatedSchema');

export interface IArkTypeSchema {
  readonly infer: object;
}

export type TArkTypeSchemaTransforms<TSchema extends IArkTypeSchema> = Partial<{
  readonly [TKey in keyof TSchema['infer']]: (
    data: Readonly<Partial<TSchema['infer']>>,
    context?: TSerializeContext,
  ) => unknown;
}>;

export type TArkTypeCreatedSchemaResult<
  TSchema extends IArkTypeSchema,
  TTransforms extends TArkTypeSchemaTransforms<TSchema>,
> = Partial<{
  [TKey in keyof TSchema['infer']]: TKey extends keyof TTransforms
    ? NonNullable<TTransforms[TKey]> extends (...args: never[]) => infer TResult
      ? TResult
      : TSchema['infer'][TKey]
    : TSchema['infer'][TKey];
}>;

export interface ICreateSchemaOptions<
  TSchema extends IArkTypeSchema,
  TTransforms extends TArkTypeSchemaTransforms<TSchema>,
> {
  readonly transform?: TTransforms;
}

export interface IArkTypeCreatedSchema<
  TSchema extends IArkTypeSchema = IArkTypeSchema,
  TTransforms extends TArkTypeSchemaTransforms<TSchema> =
    TArkTypeSchemaTransforms<TSchema>,
> {
  readonly [createdSchemaBrand]: true;
  readonly schema: TSchema;
  readonly transform: TTransforms;
}

interface IApplyArkTypeSchemaTransformsParams {
  readonly data: object;
  readonly schema: IArkTypeCreatedSchema;
  readonly context?: TSerializeContext;
}

export function createSchema<
  TSchema extends IArkTypeSchema,
  const TTransforms extends TArkTypeSchemaTransforms<TSchema> = {},
>(
  schema: TSchema,
  {
    transform,
  }: ICreateSchemaOptions<TSchema, TTransforms> & {
    readonly transform?: TArkTypeSchemaTransforms<TSchema>;
  } = {},
): IArkTypeCreatedSchema<TSchema, TTransforms> {
  return {
    schema,
    transform: transform ?? ({} as TTransforms),
    [createdSchemaBrand]: true,
  };
}

export function isArkTypeCreatedSchema(
  schema: unknown,
): schema is IArkTypeCreatedSchema {
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
