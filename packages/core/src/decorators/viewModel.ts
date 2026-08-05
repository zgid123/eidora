import { registerViewModel, type IViewModelConstructor } from '../registries';

export function ViewModel() {
  return function defineViewModel<TClass extends IViewModelConstructor>(
    value: TClass,
    context: ClassDecoratorContext<TClass>,
  ): void {
    registerViewModel(value, context.metadata);
  };
}
