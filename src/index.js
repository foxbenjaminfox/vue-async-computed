const prefix = '_async_computed$'

export default {
  install (Vue, options) {
    options = options || {}

    Vue.mixin({
      created () {
        Object.keys(this.$options.asyncComputed || {}).forEach(key => {
          const fn = this.$options.asyncComputed[key]
          if (!this.$options.computed) this.$options.computed = {}
          Vue.set(this.$options.computed, prefix + key, fn)
          Vue.set(this.$data, key, null)
        })

        this._initComputed()

        Object.keys(this.$options.asyncComputed || {}).forEach(key => {
          let promiseId = 0
          this.$watch(prefix + key, newPromise => {
            const thisPromise = ++promiseId
            newPromise.then(value => {
              if (thisPromise !== promiseId) return
              this[key] = value
            }).catch(err => {
              if (thisPromise !== promiseId) return

              if (options.errorHandler === false) return

              const handler = (options.errorHandler === undefined)
                ?  console.error.bind(console, 'Error evaluating async computed property:')
                : options.errorHandler

              handler(err.stack)
            })
          }, { immediate: true })
        })
      }
    })
  }
}
