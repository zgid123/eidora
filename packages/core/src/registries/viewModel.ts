export interface IViewModelConstructor<TViewModel extends object = object> {
  new (): TViewModel;
}

const viewModels = new WeakSet<Function>();
const metadataByViewModel = new WeakMap<Function, object>();

export function registerViewModel(
  constructor: IViewModelConstructor,
  metadata: object,
): void {
  viewModels.add(constructor);
  metadataByViewModel.set(constructor, metadata);
}

export function isViewModel(constructor: Function): boolean {
  return viewModels.has(constructor);
}

export function getViewModelMetadata(
  constructor: IViewModelConstructor,
): object | undefined {
  return metadataByViewModel.get(constructor);
}
