export function setAsyncState (vm, stateObject, state) {
  vm.$data._asyncComputed[stateObject].state = state
  vm.$data._asyncComputed[stateObject].updating = state === 'updating'
  vm.$data._asyncComputed[stateObject].error = state === 'error'
  vm.$data._asyncComputed[stateObject].success = state === 'success'
}

export function getterOnly (fn) {
  if (typeof fn === 'function') return fn

  return fn.get
}

export function hasOwnProperty (object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}
