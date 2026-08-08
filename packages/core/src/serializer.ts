import {
  deepCamelizeKeys,
  deepPascalizeKeys,
  deepSnakeizeKeys,
} from '@alphacifer/core-utils/objectUtils';

import type { IAdapter, TAdapterResult, TAdapterSchema } from './adapter';
import type { TSerializeContext } from './interface';
import { isViewModel, type IViewModelConstructor } from './registries';
import { resolveViewModelFields } from './resolvers';

export type TSerializerTransform = 'camel' | 'pascal' | 'snake';

export interface ISerializerOptions<
  TAdapter extends IAdapter | undefined = undefined,
> {
  readonly adapter?: TAdapter;
  readonly transform?: TSerializerTransform;
}

export interface ISerializeOptions<TSchema extends object> {
  readonly schema: TSchema;
  readonly context?: TSerializeContext;
  readonly transform?: TSerializerTransform;
}

export class Serializer<TAdapter extends IAdapter | undefined = undefined> {
  readonly #adapter: TAdapter | undefined;
  readonly #transform: TSerializerTransform;

  public constructor({
    adapter,
    transform = 'camel',
  }: ISerializerOptions<TAdapter> = {}) {
    this.#adapter = adapter;
    this.#transform = transform;
  }

  public serialize<
    TSchema extends IViewModelConstructor | TAdapterSchema<TAdapter>,
    TData extends object,
  >(
    data: TData,
    { context, schema, transform }: ISerializeOptions<TSchema>,
  ): TSchema extends IViewModelConstructor
    ? InstanceType<TSchema>
    : TSchema extends object
      ? TAdapterResult<TAdapter, TSchema>
      : never;
  public serialize(
    data: object,
    { context, schema, transform }: ISerializeOptions<object>,
  ): object {
    if (typeof data !== 'object' || data === null) {
      throw new TypeError('Serializer data must be a non-null object.');
    }

    const result = this.#serializeWithSchema({
      data,
      schema,
      context,
    });

    return this.#transformResult(
      result as Record<string, unknown>,
      transform ?? this.#transform,
    );
  }

  #serializeWithSchema({
    data,
    schema,
    context,
  }: {
    readonly data: object;
    readonly schema: object;
    readonly context?: TSerializeContext;
  }): object {
    if (typeof schema === 'function' && isViewModel(schema)) {
      return this.#serializeViewModel(
        data,
        schema as IViewModelConstructor,
        context,
      );
    }

    if (this.#adapter?.supports(schema)) {
      return this.#adapter.serialize({
        data,
        schema,
        context,
      });
    }

    throw new TypeError(
      'Serializer schema must be decorated with @ViewModel() or supported by the configured adapter.',
    );
  }

  #serializeViewModel(
    data: object,
    schema: IViewModelConstructor,
    context?: TSerializeContext,
  ): object {
    const result: Record<string, unknown> = {};

    for (const field of resolveViewModelFields(schema)) {
      result[field.name] = field.get(data, context);
    }

    return result;
  }

  #transformResult(
    result: Record<string, unknown>,
    transform: TSerializerTransform,
  ): Record<string, unknown> {
    switch (transform) {
      case 'pascal': {
        return deepPascalizeKeys(result);
      }
      case 'snake': {
        return deepSnakeizeKeys(result);
      }
      default: {
        return deepCamelizeKeys(result);
      }
    }
  }
}
