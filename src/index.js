import {
  initLazy,
  isComputedLazy,
  isLazyActive,
  makeLazyComputed,
  silentGetLazy,
  silentSetLazy,
} from './lazy'
import { getWatchedGetter } from './watch'

const prefix = '_async_computed$'
const DidNotUpdate = typeof Symbol === 'function' ? Symbol('did-not-update') : {}

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
      beforeCreate () {
        const optionData = this.$options.data
        const asyncComputed = this.$options.asyncComputed || {}

        if (!this.$options.computed) this.$options.computed = {}

        this.$options.computed.$asyncComputed = () => this.$data._asyncComputed

        if (!Object.keys(asyncComputed).length) return

        for (const key in asyncComputed) {
          const getter = getterFn(key, this.$options.asyncComputed[key])
          this.$options.computed[prefix + key] = getter
        }

        this.$options.data = function vueAsyncComputedInjectedDataFn (vm) {
          const data = (
            (typeof optionData === 'function')
              ? optionData.call(this, vm)
              : optionData
          ) || {}
          for (const key in asyncComputed) {
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
            setAsyncState(this, key, 'updating')

            newPromise.then(value => {
              if (thisPromise !== promiseId) return
              setAsyncState(this, key, 'success')
              this[key] = value
            }).catch(err => {
              if (thisPromise !== promiseId) return

              setAsyncState(this, key, 'error')
              Vue.set(this.$data._asyncComputed[key], 'exception', err)
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
          Vue.set(this.$data._asyncComputed, key, {
            exception: null,
            update: () => {
              watcher(getterOnly(this.$options.asyncComputed[key]).apply(this))
            }
          })
          setAsyncState(this, key, 'updating')
          this.$watch(prefix + key, watcher, { immediate: true })
        }
      }
    })
  }
}

function setAsyncState (vm, stateObject, state) {
  vm.$set(vm.$data._asyncComputed[stateObject], 'state', state)
  vm.$set(vm.$data._asyncComputed[stateObject], 'updating', state === 'updating')
  vm.$set(vm.$data._asyncComputed[stateObject], 'error', state === 'error')
  vm.$set(vm.$data._asyncComputed[stateObject], 'success', state === 'success')
}

function getterOnly (fn) {
  if (typeof fn === 'function') return fn

  return fn.get
}

function getterFn (key, fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (fn.hasOwnProperty('watch')) {
    getter = getWatchedGetter(fn)
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

export default AsyncComputed

/* istanbul ignore if */
if (typeof window !== 'undefined' && window.Vue) {
  // Auto install in dist mode
  window.Vue.use(AsyncComputed)
}
