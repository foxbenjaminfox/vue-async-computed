const prefix = '_async_computed$'

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
          this.$options.computed[prefix + key] = getterFor(this.$options.asyncComputed[key])
        }

        this.$options.data = () => {
          const data = (
              (typeof optionData === 'function')
                ? optionData.call(this)
                : optionData
             ) || {}
          for (const key in this.$options.asyncComputed || {}) {
            data[key] = null
          }
          return data
        }
      },
      created () {
        for (const key in this.$options.asyncComputed || {}) {
          this[key] = defaultFor.call(this, this.$options.asyncComputed[key], pluginOptions)
        }

        for (const key in this.$options.asyncComputed || {}) {
          let promiseId = 0
          this.$watch(prefix + key, newPromise => {
            const thisPromise = ++promiseId

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

function getterFor (fn) {
  if (typeof fn === 'function') return fn

  let getter = fn.get

  if (fn.hasOwnProperty('watch')) {
    getter = function getter () {
      fn.watch.call(this)
      return fn.get(this)
    }
  }
  return getter
}

function defaultFor (fn, pluginOptions) {
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
