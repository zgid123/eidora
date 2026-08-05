import type { TSerializeContext } from '../interface';

export interface IViewModelField {
  readonly name: string;
  readonly propertyName: string;
  readonly get: (data: object, context?: TSerializeContext) => unknown;
}

const fieldsByMetadata = new WeakMap<object, IViewModelField[]>();

export function registerViewModelField(
  metadata: object,
  field: IViewModelField,
): void {
  const fields = fieldsByMetadata.get(metadata);

  if (!fields) {
    fieldsByMetadata.set(metadata, [field]);
    return;
  }

  if (!fields.some(({ propertyName }) => propertyName === field.propertyName)) {
    fields.push(field);
  }
}

export function getRegisteredViewModelFields(
  metadata: object,
): readonly IViewModelField[] {
  return fieldsByMetadata.get(metadata) ?? [];
}
