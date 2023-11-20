import { PluginFunction } from 'vue';
import { ComponentOptions, DataDef, RecordPropsDefinition } from 'vue/types/options';

export interface IAsyncComputedOptions {
  errorHandler?: (error: string | Error) => void;
  useRawError?: boolean;
  default?: any;
}

export default class AsyncComputed {
  constructor(options?: IAsyncComputedOptions);
  static install: PluginFunction<never>;
  static version: string;
}

export type AsyncComputedGetter<T> = () => Promise<T>;

export interface IAsyncComputedValueBase<T> {
  default?: T | (() => T);
  watch?: string[] | (() => void);
  shouldUpdate?: () => boolean;
  lazy?: boolean;
}

export interface IAsyncComputedValue<T> extends IAsyncComputedValueBase<T> {
  get: AsyncComputedGetter<T>;
}

export interface IASyncComputedState {
  state: 'updating' | 'success' | 'error';
  updating: boolean;
  success: boolean;
  error: boolean;
  exception: Error | null;
  update: () => void;
}


export type AsyncComputedObject <T> = {
  [K in keyof T] : AsyncComputedGetter<T[K]> | IAsyncComputedValue<T[K]>;
}

export type AsyncComputedStates<T> = {
  $asyncComputed: {[K in keyof T]: IASyncComputedState};
}

export interface AsyncComputedOption <T> {
  asyncComputed?: AsyncComputedObject<T>;
}

declare module 'vue/types/vue' {
  interface VueConstructor<V extends Vue = Vue> {
    extend<Data, Methods, Computed, PropNames extends string = never, AsyncComputed = {}>(options?:
      object &
      ComponentOptions<V, DataDef<Data, Record<PropNames, any>, V>, Methods, Computed, PropNames[], Record<PropNames, any>> &
      AsyncComputedOption<AsyncComputed> &
      ThisType<CombinedVueInstance<V, Data, Methods, Computed & AsyncComputed & AsyncComputedStates<AsyncComputed>, Readonly<Record<PropNames, any>>>>
    ): ExtendedVue<V, Data, Methods, Computed & AsyncComputed & AsyncComputedStates<AsyncComputed>, Record<PropNames, any>>;

    extend<Data, Methods, Computed, Props, AsyncComputed = {}>(options?:
      object &
      ComponentOptions<V, DataDef<Data, Props, V>, Methods, Computed, RecordPropsDefinition<Props>, Props> &
      AsyncComputedOption<AsyncComputed> &
      ThisType<CombinedVueInstance<V, Data, Methods, Computed & AsyncComputed & AsyncComputedStates<AsyncComputed>, Readonly<Props>>>
    ): ExtendedVue<V, Data, Methods, Computed & AsyncComputed & AsyncComputedStates<AsyncComputed>, Props>;
  }
}
