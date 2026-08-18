import type {
  IAdapter,
  IAdapterSerializeParams,
  IAdapterType,
} from '@eidora/core';
import {
  object,
  type output,
  safeParse,
  ZodObject,
  ZodPipe,
  ZodTransform,
} from 'zod';

import {
  applyZodSchemaTransforms,
  isZodCreatedSchema,
  type IZodCreatedSchemaRuntime,
  type TZodCreatedSchemaResult,
  type TZodSchema,
} from './createSchema';

type TZodAdapterSchema = TZodSchema | IZodCreatedSchemaRuntime;

type TZodAdapterResult<TSchema> = TSchema extends IZodCreatedSchemaRuntime
  ? TSchema['schema'] extends infer TCreatedSchema extends TZodSchema
    ? TZodCreatedSchemaResult<TCreatedSchema>
    : never
  : TSchema extends TZodSchema
    ? Partial<output<TSchema>>
    : never;

interface IZodAdapterType extends IAdapterType {
  readonly schema: TZodAdapterSchema;
  readonly result: TZodAdapterResult<this['schema']>;
}

export class ZodAdapter implements IAdapter<
  TZodAdapterSchema,
  IZodAdapterType
> {
  declare public readonly type: IZodAdapterType;
  readonly #lenientSchemaCache = new WeakMap<ZodObject, ZodObject>();

  public supports(schema: unknown): schema is TZodAdapterSchema {
    if (isZodCreatedSchema(schema)) {
      return this.#supportsSchema(schema.schema);
    }

    return this.#supportsSchema(schema);
  }

  public serialize<TSchema extends TZodAdapterSchema>({
    context,
    data,
    schema,
  }: IAdapterSerializeParams<TSchema>): TZodAdapterResult<TSchema> {
    if (isZodCreatedSchema(schema)) {
      const transformedData = applyZodSchemaTransforms({
        data,
        schema,
        context,
      });

      return this.#serializeSchema(
        transformedData,
        schema.schema,
      ) as TZodAdapterResult<TSchema>;
    }

    return this.#serializeSchema(data, schema) as TZodAdapterResult<TSchema>;
  }

  #supportsSchema(schema: unknown): schema is TZodSchema {
    if (schema instanceof ZodObject) {
      return true;
    }

    return (
      schema instanceof ZodPipe &&
      schema.in instanceof ZodObject &&
      schema.out instanceof ZodTransform
    );
  }

  #serializeSchema<TSchema extends TZodSchema>(
    data: object,
    schema: TSchema,
  ): Partial<output<TSchema>> {
    if (schema instanceof ZodObject) {
      return this.#parseObject(schema, data) as Partial<output<TSchema>>;
    }

    const parsedInput = this.#parseObject(schema.in, data);
    const parsedOutput = safeParse(schema.out, parsedInput);

    if (!parsedOutput.success) {
      return {};
    }

    return this.#normalizeResult(parsedOutput.data) as Partial<output<TSchema>>;
  }

  #getLenientSchema(schema: ZodObject): ZodObject {
    const cached = this.#lenientSchemaCache.get(schema);

    if (cached) {
      return cached;
    }

    const shape = Object.fromEntries(
      Object.entries(schema.shape).map(([key, propertySchema]) => {
        return [key, propertySchema.optional().catch(undefined)];
      }),
    );
    const lenientSchema = object(shape);

    this.#lenientSchemaCache.set(schema, lenientSchema);

    return lenientSchema;
  }

  #parseObject(schema: ZodObject, data: object): Record<string, unknown> {
    const parsed = safeParse(this.#getLenientSchema(schema), data);

    if (!parsed.success) {
      return {};
    }

    return this.#normalizeResult(parsed.data);
  }

  #normalizeResult(result: unknown): Record<string, unknown> {
    if (
      typeof result !== 'object' ||
      result === null ||
      Array.isArray(result)
    ) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(result).filter(([, value]) => {
        return value !== undefined;
      }),
    );
  }
}
