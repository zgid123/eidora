import type { TSerializeContext } from './interface';

export interface IAdapterSerializeParams<TSchema extends object> {
  readonly data: object;
  readonly schema: TSchema;
  readonly context?: TSerializeContext;
}

export interface IAdapterType {
  readonly schema: object;
  readonly result: object;
}

export interface IAdapter<
  TSchema extends object = object,
  TType extends IAdapterType = IAdapterType,
> {
  readonly type: TType;

  supports(schema: unknown): schema is TSchema;

  serialize(params: IAdapterSerializeParams<TSchema>): object;
}

export type TAdapterSchema<TAdapter> = TAdapter extends {
  readonly type: IAdapterType;
}
  ? TAdapter['type']['schema']
  : never;

export type TAdapterResult<
  TAdapter,
  TSchema extends object,
> = TAdapter extends { readonly type: IAdapterType }
  ? (TAdapter['type'] & { readonly schema: TSchema })['result']
  : never;
