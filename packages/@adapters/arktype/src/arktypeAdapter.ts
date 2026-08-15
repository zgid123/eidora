import type {
  IAdapter,
  IAdapterSerializeParams,
  IAdapterType,
} from '@eidora/core';
import { type, Type } from 'arktype';

import {
  applyArkTypeSchemaTransforms,
  isArkTypeCreatedSchema,
  type IArkTypeCreatedSchema,
  type IArkTypeSchema,
  type TArkTypeCreatedSchemaResult,
  type TArkTypeSchemaTransforms,
} from './createSchema';

type TArkTypeAdapterSchema = IArkTypeSchema | IArkTypeCreatedSchema;

type TArkTypeAdapterResult<TSchema> = TSchema extends IArkTypeCreatedSchema
  ? TSchema['schema'] extends infer TCreatedSchema extends IArkTypeSchema
    ? TSchema['transform'] extends infer TTransforms extends
        TArkTypeSchemaTransforms<TCreatedSchema>
      ? TArkTypeCreatedSchemaResult<TCreatedSchema, TTransforms>
      : never
    : never
  : TSchema extends IArkTypeSchema
    ? Partial<TSchema['infer']>
    : never;

interface IArkTypePropertyType {
  (data: unknown): unknown;
}

interface IArkTypeProperty {
  readonly key: PropertyKey;
  readonly value: IArkTypePropertyType;
  readonly default?: unknown;
}

interface IArkTypeMappedProperty extends IArkTypeProperty {
  readonly kind: 'optional';
}

interface IArkTypeMappableSchema {
  readonly props: readonly unknown[];

  map(
    mapper: (property: IArkTypeProperty) => IArkTypeMappedProperty,
  ): IArkTypeMappedSchema;
}

interface IArkTypeMappedSchema {
  onUndeclaredKey(behavior: 'delete'): IArkTypeLenientSchema;
}

interface IArkTypeLenientSchema {
  (data: object): unknown;

  pipe(...morphs: readonly unknown[]): IArkTypeLenientSchema;
}

interface IArkTypeRuntimeSchema extends IArkTypeMappableSchema {
  readonly internal: IArkTypeRuntimeNode;
}

interface IArkTypeRuntimeNode {
  readonly kind: string;
  readonly morphs?: readonly unknown[];
  readonly inner: {
    readonly in?: IArkTypeMappableSchema;
  };
}

interface IArkTypeAdapterType extends IAdapterType {
  readonly schema: TArkTypeAdapterSchema;
  readonly result: TArkTypeAdapterResult<this['schema']>;
}

export class ArkTypeAdapter implements IAdapter<
  TArkTypeAdapterSchema,
  IArkTypeAdapterType
> {
  declare public readonly type: IArkTypeAdapterType;
  readonly #lenientSchemaCache = new WeakMap<
    IArkTypeSchema,
    IArkTypeLenientSchema
  >();

  public supports(schema: unknown): schema is TArkTypeAdapterSchema {
    if (isArkTypeCreatedSchema(schema)) {
      return this.#supportsSchema(schema.schema);
    }

    return this.#supportsSchema(schema);
  }

  public serialize<TSchema extends TArkTypeAdapterSchema>({
    context,
    data,
    schema,
  }: IAdapterSerializeParams<TSchema>): TArkTypeAdapterResult<TSchema> {
    if (isArkTypeCreatedSchema(schema)) {
      return applyArkTypeSchemaTransforms({
        context,
        schema,
        data: this.#serializeSchema(data, schema.schema),
      }) as TArkTypeAdapterResult<TSchema>;
    }

    return this.#serializeSchema(
      data,
      schema,
    ) as TArkTypeAdapterResult<TSchema>;
  }

  #supportsSchema(schema: unknown): schema is IArkTypeSchema {
    if (!(schema instanceof Type)) {
      return false;
    }

    try {
      const runtimeSchema = schema as unknown as IArkTypeRuntimeSchema;

      return this.#getMappableSchema(runtimeSchema) !== undefined;
    } catch {
      return false;
    }
  }

  #serializeSchema<TSchema extends IArkTypeSchema>(
    data: object,
    schema: TSchema,
  ): Partial<TSchema['infer']> {
    const parsed = this.#getLenientSchema(schema)(data);

    if (parsed instanceof type.errors) {
      return {};
    }

    return this.#normalizeResult(parsed) as Partial<TSchema['infer']>;
  }

  #getLenientSchema(schema: IArkTypeSchema): IArkTypeLenientSchema {
    const cached = this.#lenientSchemaCache.get(schema);

    if (cached) {
      return cached;
    }

    const runtimeSchema = schema as unknown as IArkTypeRuntimeSchema;
    const mappableSchema = this.#getMappableSchema(runtimeSchema);

    if (!mappableSchema) {
      return type({});
    }

    const lenientObjectSchema = mappableSchema
      .map((property) => {
        const value = type.unknown.pipe((input) => {
          const parsed = property.value(input);

          return parsed instanceof type.errors ? undefined : parsed;
        });

        if ('default' in property) {
          return {
            key: property.key,
            kind: 'optional',
            value,
            default: property.default,
          };
        }

        return {
          key: property.key,
          kind: 'optional',
          value,
        };
      })
      .onUndeclaredKey('delete');
    const lenientSchema =
      runtimeSchema.internal.kind === 'morph' && runtimeSchema.internal.morphs
        ? lenientObjectSchema.pipe(...runtimeSchema.internal.morphs)
        : lenientObjectSchema;

    this.#lenientSchemaCache.set(schema, lenientSchema);

    return lenientSchema;
  }

  #getMappableSchema(
    schema: IArkTypeRuntimeSchema,
  ): IArkTypeMappableSchema | undefined {
    if (schema.internal.kind === 'morph') {
      const inputSchema = schema.internal.inner.in;

      return inputSchema && Array.isArray(inputSchema.props)
        ? inputSchema
        : undefined;
    }

    return Array.isArray(schema.props) ? schema : undefined;
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
