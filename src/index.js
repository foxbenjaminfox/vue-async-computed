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
} from './util'
import { getWatchedGetter } from './watch'
import {
  getGetterWithShouldUpdate,
  shouldNotUpdate,
} from './shouldUpdate'

const prefix = '_async_computed$'

const AsyncComputed = {
  install (Vue, pluginOptions) {
    pluginOptions = pluginOptions || {}

    Vue.config
      .optionMergeStrategies
      .asyncComputed = Vue.config.optionMergeStrategies.computed

    Vue.mixin({
      data () {
        return {
          _asyncComputed: {},
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
          handleAsyncComputedPropetyChanges(this, key, pluginOptions, Vue)
        }
      }
    })
  }
}

function handleAsyncComputedPropetyChanges (vm, key, pluginOptions, Vue) {
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
      Vue.set(vm.$data._asyncComputed[key], 'exception', err)
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
  Vue.set(vm.$data._asyncComputed, key, {
    exception: null,
    update: () => {
      if (!vm._isDestroyed) {
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

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
