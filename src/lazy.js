export function isComputedLazy (item) {
  return item.hasOwnProperty('lazy') && item.lazy
}

export function isLazyActive (vm, key) {
  return vm[lazyActivePrefix + key]
}

const lazyActivePrefix = 'async_computed$lazy_active$',
      lazyDataPrefix = 'async_computed$lazy_data$'

export function initLazy (data, key) {
  data[lazyActivePrefix + key] = false
  data[lazyDataPrefix + key] = null
}

export function makeLazyComputed (key) {
  return {
    get () {
      this[lazyActivePrefix + key] = true
      return this[lazyDataPrefix + key]
    },
    set (value) {
      this[lazyDataPrefix + key] = value
    }
  }
}

export function silentSetLazy (vm, key, value) {
  vm[lazyDataPrefix + key] = value
}
export function silentGetLazy (vm, key) {
  return vm[lazyDataPrefix + key]
}
