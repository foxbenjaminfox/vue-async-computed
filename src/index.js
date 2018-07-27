import {
  initLazy,
  isComputedLazy,
  isLazyActive,
  makeLazyComputed,
  silentGetLazy,
  silentSetLazy,
} from './lazy'

const prefix = '_async_computed$'
const DidNotUpdate = Symbol('did-not-update')

const AsyncComputed = {
  install (Vue, pluginOptions) {
    pluginOptions = pluginOptions || {}

    Vue.config
      .optionMergeStrategies
      .asyncComputed = Vue.config.optionMergeStrategies.computed

    Vue.mixin({
      beforeCreate () {
        const optionData = this.$options.data

        if (!this.$options.computed) this.$options.computed = {}

        for (const key in this.$options.asyncComputed || {}) {
          this.$options.computed[prefix + key] = getterFn(key, this.$options.asyncComputed[key])
        }

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
          this.$watch(prefix + key, newPromise => {
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
          }, { immediate: true })
        }
      }
    })
  }
}

function getterFn (key, fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (fn.hasOwnProperty('watch') || fn.hasOwnProperty('shouldUpdate')) {
    let shouldUpdate = fn.shouldUpdate || (() => true)
    let watcher = fn.watch || (() => {})
    getter = function getter () {
      watcher.call(this)
      if (shouldUpdate.call(this)) {
        return fn.get.call(this)
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

export default AsyncComputed

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
