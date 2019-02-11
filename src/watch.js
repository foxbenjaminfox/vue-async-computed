const getGetterWatchedByArray = computedAsyncProperty =>
  function getter() {
    for (let key of computedAsyncProperty.watch) {
      // check if nested key is watched
      const splittedByDot = key.split('.');
      if (splittedByDot.length === 1) {
        // if not just access it
        this[key]
      } else {
        // access nested propety
        try {
          var start = this
          for (let part of splittedByDot) {
            start = start[part]
          }
        } catch (error) {
          console.error('computedAsyncPlugin: bad path: ', key)
          throw error
        }
      }
    }
    return computedAsyncProperty.get.call(this)
  }

const getGetterWatchedByFunction = computedAsyncProperty =>
  function getter() {
    computedAsyncProperty.watch.call(this)
    return computedAsyncProperty.get.call(this)
  }


export function getWatchedGetter(computedAsyncProperty) {
  if (typeof computedAsyncProperty.watch === 'function') {
    return getGetterWatchedByFunction(computedAsyncProperty)
  }

  if (Array.isArray(computedAsyncProperty.watch)) {
    return getGetterWatchedByArray(computedAsyncProperty)
  }

}
