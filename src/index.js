import {
  initLazy,
  isComputedLazy,
  isLazyActive,
  makeLazyComputed,
  silentGetLazy,
  silentSetLazy,
} from './lazy'
import {
  getterOnly,
  hasOwnProperty,
  setAsyncState,
  vueSet
} from './util'
import { getWatchedGetter } from './watch'
import {
  getGetterWithShouldUpdate,
  shouldNotUpdate,
} from './shouldUpdate'

const prefix = '_async_computed$'

/** @type {import('vue').Plugin} */
const AsyncComputed = {
  install (app, pluginOptions) {
    // Vue 2 exposes the `computed` merge strategy, but Vue 3 does not.
    // Vue 3 calls `Object.assign` eventually though, so we can use that.
    // See: https://github.com/vuejs/core/blob/32bdc5d1900ceb8df1e8ee33ea65af7b4da61051/packages/runtime-core/src/componentOptions.ts#L1059
    const mergeStrategy = app.config.optionMergeStrategies.computed || (function (to, from) {
      return to ? Object.assign(Object.create(null), to, from) : from
    })
    app.config.optionMergeStrategies.asyncComputed = mergeStrategy

    app.mixin(getAsyncComputedMixin(pluginOptions))
  }
}

function getAsyncComputedMixin (pluginOptions = {}) {
  /** @type {import('vue').ComponentOptionsMixin} */
  return {
    data () {
      return {
        _asyncComputed: {},
        _asyncComputedIsMounted: false,
      }
    },
    computed: {
      $asyncComputed () {
        return this.$data._asyncComputed
      }
    },
    beforeCreate () {
      const asyncComputed = this.$options.asyncComputed || {}

      if (!Object.keys(asyncComputed).length) return

      for (const key in asyncComputed) {
        const getter = getterFn(key, asyncComputed[key])
        this.$options.computed[prefix + key] = getter
      }

      this.$options.data = initDataWithAsyncComputed(this.$options, pluginOptions)
    },
    created () {
      for (const key in this.$options.asyncComputed || {}) {
        const item = this.$options.asyncComputed[key],
              value = generateDefault.call(this, item, pluginOptions)
        if (isComputedLazy(item)) {
          silentSetLazy(this, key, value)
        } else {
          this[key] = value
        }
      }

      for (const key in this.$options.asyncComputed || {}) {
        handleAsyncComputedPropetyChanges(this, key, pluginOptions)
      }
    },

    mounted () {
      this._asyncComputedIsMounted = true
    },
    beforeUnmount () {
      this._asyncComputedIsMounted = false
    },
  }
}
const AsyncComputedMixin = getAsyncComputedMixin()

function handleAsyncComputedPropetyChanges (vm, key, pluginOptions) {
  let promiseId = 0
  const watcher = newPromise => {
    const thisPromise = ++promiseId

    if (shouldNotUpdate(newPromise)) return

    if (!newPromise || !newPromise.then) {
      newPromise = Promise.resolve(newPromise)
    }
    setAsyncState(vm, key, 'updating')

    newPromise.then(value => {
      if (thisPromise !== promiseId) return
      setAsyncState(vm, key, 'success')
      vm[key] = value
    }).catch(err => {
      if (thisPromise !== promiseId) return

      setAsyncState(vm, key, 'error')
      vueSet(vm, vm.$data._asyncComputed[key], 'exception', err)
      if (pluginOptions.errorHandler === false) return

      const handler = (pluginOptions.errorHandler === undefined)
        ? console.error.bind(console, 'Error evaluating async computed property:')
        : pluginOptions.errorHandler

      if (pluginOptions.useRawError) {
        handler(err, vm, err.stack)
      } else {
        handler(err.stack)
      }
    })
  }
  vueSet(vm, vm.$data._asyncComputed, key, {
    exception: null,
    update: () => {
      if (vm._asyncComputedIsMounted) {
        watcher(getterOnly(vm.$options.asyncComputed[key]).apply(vm))
      }
    }
  })
  setAsyncState(vm, key, 'updating')
  vm.$watch(prefix + key, watcher, { immediate: true })
}

function initDataWithAsyncComputed (options, pluginOptions) {
  const optionData = options.data
  const asyncComputed = options.asyncComputed || {}

  return function vueAsyncComputedInjectedDataFn (vm) {
    const data = ((typeof optionData === 'function')
      ? optionData.call(this, vm)
      : optionData) || {}
    for (const key in asyncComputed) {
      const item = this.$options.asyncComputed[key]

      var value = generateDefault.call(this, item, pluginOptions)
      if (isComputedLazy(item)) {
        initLazy(data, key, value)
        this.$options.computed[key] = makeLazyComputed(key)
      } else {
        data[key] = value
      }
    }
    return data
  }
}

function getterFn (key, fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (hasOwnProperty(fn, 'watch')) {
    getter = getWatchedGetter(fn)
  }

  if (hasOwnProperty(fn, 'shouldUpdate')) {
    getter = getGetterWithShouldUpdate(fn, getter)
  }

  if (isComputedLazy(fn)) {
    const nonLazy = getter
    getter = function lazyGetter () {
      if (isLazyActive(this, key)) {
        return nonLazy.call(this)
      } else {
        return silentGetLazy(this, key)
      }
    }
  }
  return getter
}

function generateDefault (fn, pluginOptions) {
  let defaultValue = null

  if ('default' in fn) {
    defaultValue = fn.default
  } else if ('default' in pluginOptions) {
    defaultValue = pluginOptions.default
  }

  if (typeof defaultValue === 'function') {
    return defaultValue.call(this)
  } else {
    return defaultValue
  }
}

export default AsyncComputed
export { AsyncComputed as AsyncComputedPlugin, AsyncComputedMixin }

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
