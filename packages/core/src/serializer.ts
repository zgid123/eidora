import {
  deepCamelizeKeys,
  deepPascalizeKeys,
  deepSnakeizeKeys,
} from '@alphacifer/core-utils/objectUtils';

import type { TSerializeContext } from './interface';
import { isViewModel, type IViewModelConstructor } from './registries';
import { resolveViewModelFields } from './resolvers';

export type TSerializerTransform = 'camel' | 'pascal' | 'snake';

export interface ISerializerOptions {
  readonly transform?: TSerializerTransform;
}

export interface ISerializeOptions<
  TSchema extends IViewModelConstructor<object>,
> extends ISerializerOptions {
  readonly schema: TSchema;
  readonly context?: TSerializeContext;
}

export class Serializer {
  readonly #transform: TSerializerTransform;

  public constructor({ transform = 'camel' }: ISerializerOptions = {}) {
    this.#transform = transform;
  }

  public serialize<TSchema extends IViewModelConstructor, TData extends object>(
    data: TData,
    { context, schema, transform }: ISerializeOptions<TSchema>,
  ): InstanceType<TSchema> {
    if (typeof data !== 'object' || data === null) {
      throw new TypeError('Serializer data must be a non-null object.');
    }

    if (!isViewModel(schema)) {
      throw new TypeError(
        'Serializer schema must be decorated with @ViewModel().',
      );
    }

    const result: Record<string, unknown> = {};

    for (const field of resolveViewModelFields(schema)) {
      result[field.name] = field.get(data, context);
    }

    return this.#transformResult(
      result,
      transform ?? this.#transform,
    ) as InstanceType<TSchema>;
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
