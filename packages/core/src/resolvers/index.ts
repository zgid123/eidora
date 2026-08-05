import {
  getRegisteredViewModelFields,
  getViewModelMetadata,
  type IViewModelConstructor,
  type IViewModelField,
} from '../registries';

const resolvedFieldsByViewModel = new WeakMap<
  Function,
  readonly IViewModelField[]
>();

export function resolveViewModelFields(
  constructor: IViewModelConstructor,
): readonly IViewModelField[] {
  const resolvedFields = resolvedFieldsByViewModel.get(constructor);

  if (resolvedFields) {
    return resolvedFields;
  }

  const metadata = getViewModelMetadata(constructor);

  if (!metadata) {
    return [];
  }

  const fields = Object.freeze([...getRegisteredViewModelFields(metadata)]);
  resolvedFieldsByViewModel.set(constructor, fields);

  return fields;
}
