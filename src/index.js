import {
  initLazy,
  isComputedLazy,
  isLazyActive,
  makeLazyComputed,
  silentGetLazy,
  silentSetLazy,
} from './lazy'

const prefix = '_async_computed$'
const DidNotUpdate = typeof Symbol === 'function' ? Symbol('did-not-update') : {}

const AsyncComputed = {
  install (Vue, pluginOptions) {
    pluginOptions = pluginOptions || {}

    Vue.config
      .optionMergeStrategies
      .asyncComputed = Vue.config.optionMergeStrategies.computed

    Vue.prototype.$refreshAsyncComputed = $refreshAsyncComputed

    Vue.mixin({
      beforeCreate () {
        const optionData = this.$options.data

        if (!this.$options.computed) this.$options.computed = {}

        for (const key in this.$options.asyncComputed || {}) {
          this.$options.computed[prefix + key] = getterFn(key, this.$options.asyncComputed[key])
        }

        this._asyncComputedWatcher = {}

        this.$options.data = function vueAsyncComputedInjectedDataFn () {
          const data = (
            (typeof optionData === 'function')
              ? optionData.call(this)
              : optionData
          ) || {}
          for (const key in this.$options.asyncComputed || {}) {
            const item = this.$options.asyncComputed[key]
            if (isComputedLazy(item)) {
              initLazy(data, key)
              this.$options.computed[key] = makeLazyComputed(key)
            } else {
              data[key] = null
            }
          }
          return data
        }
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
          let promiseId = 0

          const watcher = newPromise => {
            const thisPromise = ++promiseId

            if (newPromise === DidNotUpdate) {
              return
            }

            if (!newPromise || !newPromise.then) {
              newPromise = Promise.resolve(newPromise)
            }

            newPromise.then(value => {
              if (thisPromise !== promiseId) return
              this[key] = value
            }).catch(err => {
              if (thisPromise !== promiseId) return

              if (pluginOptions.errorHandler === false) return

              const handler = (pluginOptions.errorHandler === undefined)
                ? console.error.bind(console, 'Error evaluating async computed property:')
                : pluginOptions.errorHandler

              if (pluginOptions.useRawError) {
                handler(err)
              } else {
                handler(err.stack)
              }
            })
          }

          this.$watch(prefix + key, watcher, {immediate: true})
          this._asyncComputedWatcher[key] = watcher
        }
      }
    })
  }
}

function getterFn (key, fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (fn.hasOwnProperty('watch')) {
    const previousGetter = getter
    getter = function getter () {
      fn.watch.call(this)
      return previousGetter.call(this)
    }
  }

  if (fn.hasOwnProperty('shouldUpdate')) {
    const previousGetter = getter
    getter = function getter () {
      if (fn.shouldUpdate.call(this)) {
        return previousGetter.call(this)
      }
      return DidNotUpdate
    }
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

function $refreshAsyncComputed (key) {
  const prefixedKey = prefix + key
  if (this.hasOwnProperty(key) && this.hasOwnProperty(prefixedKey) && this._asyncComputedWatcher[key]) {
    this._computedWatchers[prefixedKey].evaluate()
    const watcher = this._asyncComputedWatcher[key]
    const newPromise = this[prefixedKey]
    return newPromise.then(() => {
      watcher.apply(this, [newPromise])
      return newPromise
    })
  } else {
    throw new Error('Can not find async computed property ' + JSON.stringify(key))
  }
}

export default AsyncComputed

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
