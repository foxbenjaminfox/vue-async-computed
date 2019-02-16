const getGetterWatchedByArray = computedAsyncProperty =>
  function getter () {
    for (const key of computedAsyncProperty.watch) {
      if (typeof key !== 'string') throw new Error('AsyncComputed: watch elemnts must be strings')
      // Check if nested key is watched.
      const splittedByDot = key.split('.')
      if (splittedByDot.length === 1) {
        // If not, just access it.
        // eslint-disable-next-line no-unused-expressions
        void this[key]
      } else {
        // Access the nested propety.
        try {
          let start = this
          for (const part of splittedByDot) {
            start = start[part]
          }
        } catch (error) {
          console.error('AsyncComputed: bad path: ', key)
          throw error
        }
      }
    }
    return computedAsyncProperty.get.call(this)
  }

const getGetterWatchedByFunction = computedAsyncProperty =>
  function getter () {
    computedAsyncProperty.watch.call(this)
    return computedAsyncProperty.get.call(this)
  }

export function getWatchedGetter (computedAsyncProperty) {
  if (typeof computedAsyncProperty.watch === 'function') {
    return getGetterWatchedByFunction(computedAsyncProperty)
  } else if (Array.isArray(computedAsyncProperty.watch)) {
    return getGetterWatchedByArray(computedAsyncProperty)
  } else {
    throw Error('AsyncComputed: watch should be function or an array')
  }
}
