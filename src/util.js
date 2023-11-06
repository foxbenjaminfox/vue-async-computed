/**
 * Vue 2 and Vue 3 compatible set function. Vue 3 no longer
 * needs vm.$set due to Proxies.
 * See https://v3-migration.vuejs.org/breaking-changes/#:~:text=Global%20functions%20set%20and%20delete%2C%20and%20the%20instance%20methods%20%24set%20and%20%24delete.%20They%20are%20no%20longer%20required%20with%20proxy%2Dbased%20change%20detection.
 */
export function vueSet (app, object, key, value) {
  if (app.$set) {
    app.$set(object, key, value)
  } else {
    object[key] = value
  }
}

export function setAsyncState (vm, stateObject, state) {
  vueSet(vm, vm.$data._asyncComputed[stateObject], 'state', state)
  vueSet(vm, vm.$data._asyncComputed[stateObject], 'updating', state === 'updating')
  vueSet(vm, vm.$data._asyncComputed[stateObject], 'error', state === 'error')
  vueSet(vm, vm.$data._asyncComputed[stateObject], 'success', state === 'success')
}

export function getterOnly (fn) {
  if (typeof fn === 'function') return fn

  return fn.get
}

export function hasOwnProperty (object, property) {
  return Object.prototype.hasOwnProperty.call(object, property)
}
