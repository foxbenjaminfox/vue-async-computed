const DidNotUpdate = typeof Symbol === 'function' ? Symbol('did-not-update') : {}

export const getGetterWithShouldUpdate = (asyncProprety, currentGetter) => {
  return function getter () {
    return (asyncProprety.shouldUpdate.call(this))
      ? currentGetter.call(this)
      : DidNotUpdate
  }
}

export const shouldNotUpdate = (value) => DidNotUpdate === value
