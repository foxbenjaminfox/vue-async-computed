const prefix = '_async_computed$'

export default {
  install (Vue, options) {
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
              const handler = options.errorHandler === false
                ? ()=>{}
                : options.errorHandler
                  ? options.errorHandler
                  : console.err.bind(console, 'Error evaluating async computed property:')
              handler(err.stack)
            })
          }, { immediate: true })
        })
      }
    })
  }
}
