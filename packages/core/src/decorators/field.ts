import type { TSerializeContext } from '../interface';
import { registerViewModelField } from '../registries';

export interface IFieldOptions<TData extends object = object> {
  readonly name?: string;
  readonly transform?: (data: TData, context?: TSerializeContext) => unknown;
}

interface IFieldDecorator {
  <TThis extends object, TValue>(
    value: undefined,
    context: ClassFieldDecoratorContext<TThis, TValue>,
  ): void;
}

export function Field<TThis extends object, TValue>(
  value: undefined,
  context: ClassFieldDecoratorContext<TThis, TValue>,
): void;
export function Field<TData extends object = object>(
  options?: IFieldOptions<TData>,
): IFieldDecorator;
export function Field<
  TThis extends object,
  TValue,
  TData extends object = object,
>(
  valueOrOptions?: undefined | IFieldOptions<TData>,
  context?: ClassFieldDecoratorContext<TThis, TValue>,
): void | IFieldDecorator {
  if (context) {
    decorateField(context, {});
    return;
  }

  const options = valueOrOptions ?? {};

  return function fieldDecorator(
    _value: undefined,
    fieldContext: ClassFieldDecoratorContext,
  ): void {
    decorateField(fieldContext, options);
  };
}

function decorateField<TThis extends object, TValue, TData extends object>(
  context: ClassFieldDecoratorContext<TThis, TValue>,
  options: IFieldOptions<TData>,
): void {
  if (context.private) {
    throw new TypeError('@Field cannot decorate a private field.');
  }

  if (context.static) {
    throw new TypeError('@Field cannot decorate a static field.');
  }

  if (typeof context.name !== 'string') {
    throw new TypeError('@Field cannot decorate a symbol-keyed field.');
  }

  const propertyName = context.name;
  const getValue = context.access.get;

  registerViewModelField(context.metadata, {
    name: options.name ?? propertyName,
    propertyName,
    get(data, serializeContext): unknown {
      if (options.transform) {
        return options.transform(data as TData, serializeContext);
      }

      return getValue(data as TThis);
    },
  });
}
