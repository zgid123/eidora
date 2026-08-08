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

type TZodObjectTransform = ZodPipe<
  ZodObject,
  ZodTransform<Record<string, unknown>, Record<string, unknown>>
>;

type TZodSchema = ZodObject | TZodObjectTransform;

interface IZodAdapterType extends IAdapterType {
  readonly schema: TZodSchema;
  readonly result: Partial<output<this['schema']>>;
}

export class ZodAdapter implements IAdapter<TZodSchema, IZodAdapterType> {
  declare public readonly type: IZodAdapterType;
  readonly #lenientSchemaCache = new WeakMap<ZodObject, ZodObject>();

  public supports(schema: unknown): schema is TZodSchema {
    if (schema instanceof ZodObject) {
      return true;
    }

    return (
      schema instanceof ZodPipe &&
      schema.in instanceof ZodObject &&
      schema.out instanceof ZodTransform
    );
  }

  public serialize<TSchema extends TZodSchema>({
    data,
    schema,
  }: IAdapterSerializeParams<TSchema>): Partial<output<TSchema>> {
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
