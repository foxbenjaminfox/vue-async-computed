import Vue, { PluginFunction } from "vue";

export interface IAsyncComputedOptions {
	errorHandler?: (error: string[]) => void;
	useRawError?: boolean;
	default?: any;
}

export default class AsyncComputed {
	constructor(options?: IAsyncComputedOptions)
	static install: PluginFunction<never>;
	static version: string;
}

declare module "vue/types/options" {
	interface ComputedOptions<T> {
		asynchronous?: (() => T | Promise<T>) | {
			get: (() => T | Promise<T>);
			default?: T;
			lazy?: boolean;
		};
	}
}

interface IASyncComputedState {
	state: "updating" | "success" | "error";
	updating: boolean;
	success: boolean;
	error: boolean;
	exception: Error | null;
	update: () => void;
}

declare module "vue/types/vue" {
	// tslint:disable-next-line:interface-name
	interface Vue {
		$asyncComputed: {[K: string]: IASyncComputedState };
	}
}
