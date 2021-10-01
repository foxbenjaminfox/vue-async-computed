import Vue, { PluginFunction, PluginObject } from 'vue';

export interface IAsyncComputedOptions {
  errorHandler?: (error: string | Error) => void;
  useRawError?: boolean;
  default?: any;
}

export default class AsyncComputed extends PluginObject<void> {
  constructor(options?: IAsyncComputedOptions);
  static install: PluginFunction<void>;
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

export interface AsyncComputedObject {
  [K: string]: AsyncComputedGetter<any> | IAsyncComputedValue<any>;
}

export interface IASyncComputedState {
  state: 'updating' | 'success' | 'error';
  updating: boolean;
  success: boolean;
  error: boolean;
  exception: Error | null;
  update: () => void;
}

declare module 'vue/types/options' {
  interface ComponentOptions<V extends Vue> {
    asyncComputed?: AsyncComputedObject;
  }
}

declare module 'vue/types/vue' {
  interface Vue {
    $asyncComputed: {[K: string]: IASyncComputedState};
  }
}
