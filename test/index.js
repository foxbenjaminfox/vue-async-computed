import test from "tape"
import AsyncComputed from "../src"
import Vue from 'vue'

let baseErrorCallback = () => {
  throw new Error('Unexpected error thrown')
}

const pluginOptions = {
  errorHandler: msg => baseErrorCallback(msg),
}

Vue.use(AsyncComputed, pluginOptions)

test("Async computed values are computed", t => {
  t.plan(4)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 10)
        })
      },
      b () {
        return new Promise(resolve => {
          setTimeout(() => resolve(1337), 20)
        })
      }
    }
  })
  t.equal(vm.a, null)
  t.equal(vm.b, null)
  vm.$watch('a', function (val) {
    t.equal(val, 'done')
  })
  vm.$watch('b', function (val) {
    t.equal(val, 1337)
  })
})

test("An async computed value which is an pre-resolved promise updates at the next tick", t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return Promise.resolve('done')
      }
    }
  })
  t.equal(vm.a, null)
  Vue.nextTick(() => t.equal(vm.a, 'done'))
})

test("Sync and async computed data work together", t => {
  t.plan(4)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 10)
        })
      }
    },
    computed: {
      b () {
        return 0
      }
    }
  })
  t.equal(vm.a, null)

  t.equal(vm.b, 0)

  vm.$watch('a', function (val) {
    t.equal(val, 'done')
    t.equal(vm.b, 0)
  })
})

test("Async values are properly recalculated", t => {
  t.plan(6)
  const vm = new Vue({
    asyncComputed: {
      a () {
        const data = this.x
        return new Promise(resolve => {
          setTimeout(() => resolve(data), 10)
        })
      },
      b () {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 40)
        })
      }
    },
    data: {
      x: 0
    }
  })
  t.equal(vm.a, null)
  t.equal(vm.x, 0)

  const unwatch = vm.$watch('a', function (val) {
    t.equal(val, 0)
    unwatch()
    this.x = 1
    t.equal(vm.a, 0)
    vm.$watch('a', function (val) {
      t.equal(val, 1)
    })
  })
  vm.$watch('b', function (val) {
    t.equal(val, 'done')
  })
})

test("Old async values are properly invalidated", t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          setTimeout(() => resolve(this.waitTime), this.waitTime)
        })
      }
    },
    data: {
      waitTime: 40
    }
  })
  t.equal(vm.a, null)
  setTimeout(() => { vm.waitTime = 10 }, 10)
  vm.$watch('a', function (val) {
    t.equal(val, 10) // Not 40, even though we don't cancel the $watch
  })
})

test("Having only sync computed data still works", t => {
  t.plan(2)
  const vm = new Vue({
    computed: {
      a () {
        return this.x
      }
    },
    data: {
      x: 2
    }
  })
  t.equal(vm.a, 2)
  vm.$watch('a', function (val) {
    t.equal(val, 3)
  })
  vm.x++
})

test("Errors in computed properties are handled", t => {
  t.plan(3)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return Promise.reject(new Error('error'))
      }
    }
  })
  t.equal(vm.a, null)
  pluginOptions.errorHandler = stack => {
    t.equal(vm.a, null)
    t.equal(stack.slice(0, 13), 'Error: error\n')
    pluginOptions.errorHandler = baseErrorCallback
  }
})

test("Errors in computed properties are handled, with useRawError", t => {
  pluginOptions.useRawError = true
  t.plan(3)
  const vm = new Vue({
    asyncComputed: {
      a () {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('error')
      }
    }
  })
  t.equal(vm.a, null)
  pluginOptions.errorHandler = err => {
    t.equal(vm.a, null)
    t.equal(err, 'error')
    pluginOptions.errorHandler = baseErrorCallback
    pluginOptions.useRawError = false
  }
})

test("Multiple asyncComputed objects are handled the same as normal computed property objects", t => {
  t.plan(3)
  const vm = new Vue({
    mixins: [{
      asyncComputed: {
        a () {
          return Promise.resolve('mixin-a')
        },
        b () {
          return Promise.resolve('mixin-b')
        }
      }
    }],
    asyncComputed: {
      a () {
        return Promise.resolve('vm-a')
      },
      c () {
        return Promise.resolve('vm-c')
      }
    }
  })
  Vue.nextTick(() => {
    t.equal(vm.a, 'vm-a')
    t.equal(vm.b, 'mixin-b')
    t.equal(vm.c, 'vm-c')
  })
})

test("Async computed values can have defaults", t => {
  t.plan(6)
  const vm = new Vue({
    asyncComputed: {
      x: {
        default: false,
        get () {
          return Promise.resolve(true)
        }
      },
      y () {
        return Promise.resolve(true)
      },
      z: {
        get () {
          return Promise.resolve(true)
        }
      }
    }
  })
  t.equal(vm.x, false, 'x should default to true')
  t.equal(vm.y, null, 'y doesn\'t have a default')
  t.equal(vm.z, null, 'z doesn\'t have a default despite being defined with an object')
  Vue.nextTick(() => {
    t.equal(vm.x, true, 'x resolves to true')
    t.equal(vm.y, true, 'y resolves to true')
    t.equal(vm.z, true, 'z resolves to true')
  })
})

test("Default values can be functions", t => {
  t.plan(4)
  const vm = new Vue({
    data: {
      x: 1
    },
    asyncComputed: {
      y: {
        default () { return 2 },
        get () {
          return Promise.resolve(3)
        }
      },
      z: {
        default () { return this.x },
        get () {
          return Promise.resolve(4)
        }
      }
    }
  })
  t.equal(vm.y, 2)
  t.equal(vm.z, 1)
  Vue.nextTick(() => {
    t.equal(vm.y, 3)
    t.equal(vm.z, 4)
  })
})

test("Async computed values can be written to, and then will be properly overridden", t => {
  t.plan(5)
  const vm = new Vue({
    data: {
      x: 1
    },
    asyncComputed: {
      y () {
        this.y = this.x + 1
        return new Promise(resolve => {
          setTimeout(() => resolve(this.x), 10)
        })
      }
    }
  })
  Vue.nextTick(() => {
    t.equal(vm.y, 2)
    const unwatch = vm.$watch('y', function (val) {
      t.equal(val, 1)
      unwatch()
      vm.x = 4
      t.equal(vm.y, 1)
      Vue.nextTick(() => {
        t.equal(vm.y, 5)
        vm.$watch('y', function (val) {
          t.equal(val, 4)
        })
      })
    })
  })
})

test("Watchers rerun the computation when a value changes", t => {
  t.plan(4)
  let i = 0
  const vm = new Vue({
    data: {
      x: 0,
      y: 2,
    },
    asyncComputed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch () {
          // eslint-disable-next-line no-unused-expressions
          this.x
        }
      }
    }
  })
  t.equal(vm.z, null)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    vm.x--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter functin
      t.equal(vm.z, 2)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
      })
    })
  })
})

test("The default default value can be set in the plugin options", t => {
  t.plan(2)
  pluginOptions.default = 53
  const vm = new Vue({
    asyncComputed: {
      x () {
        return Promise.resolve(0)
      }
    }
  })
  t.equal(vm.x, 53)
  Vue.nextTick(() => {
    t.equal(vm.x, 0)
    delete pluginOptions.default
  })
})

test("The default default value can be set to undefined in the plugin options", t => {
  t.plan(2)
  pluginOptions.default = undefined
  const vm = new Vue({
    asyncComputed: {
      x () {
        return Promise.resolve(0)
      }
    }
  })
  t.equal(vm.x, undefined)
  Vue.nextTick(() => {
    t.equal(vm.x, 0)
    delete pluginOptions.default
  })
})

test("Handle an async computed value returning synchronously", t => {
  t.plan(2)
  const vm = new Vue({
    asyncComputed: {
      x () {
        return 1
      }
    }
  })
  t.equal(vm.x, null)
  Vue.nextTick(() => {
    t.equal(vm.x, 1)
  })
})

test("Work correctly with Vue.extend", t => {
  t.plan(2)
  const SubVue = Vue.extend({
    asyncComputed: {
      x () {
        return Promise.resolve(1)
      }
    }
  })
  const vm = new SubVue({})

  t.equal(vm.x, null)
  Vue.nextTick(() => {
    t.equal(vm.x, 1)
  })
})

test("Async computed values can be calculated lazily", t => {
  t.plan(7)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: true,
        get () {
          called = true
          return Promise.resolve(10)
        }
      }
    }
  })

  t.equal(called, false)
  Vue.nextTick(() => {
    t.equal(called, false)
    t.equal(vm.a, null)
    t.equal(vm.a, null)
    t.equal(called, false)
    Vue.nextTick(() => {
      t.equal(called, true)
      Vue.nextTick(() => {
        t.equal(vm.a, 10)
      })
    })
  })
})

test("Async computed values aren't lazy with { lazy: false }", t => {
  t.plan(4)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: false,
        get () {
          called = true
          return Promise.resolve(10)
        }
      }
    }
  })

  t.equal(called, true)
  t.equal(vm.a, null)
  Vue.nextTick(() => {
    t.equal(called, true)
    t.equal(vm.a, 10)
  })
})

test("Async computed values can be calculated lazily with a default", t => {
  t.plan(7)

  let called = false
  const vm = new Vue({
    asyncComputed: {
      a: {
        lazy: true,
        default: 3,
        get () {
          called = true
          return Promise.resolve(4)
        }
      }
    }
  })

  t.equal(called, false)
  Vue.nextTick(() => {
    t.equal(called, false)
    t.equal(vm.a, 3)
    t.equal(vm.a, 3)
    t.equal(called, false)
    Vue.nextTick(() => {
      t.equal(called, true)
      Vue.nextTick(() => {
        t.equal(vm.a, 4)
      })
    })
  })
})

test("Updating flag is set while porperty is re-computed", t => {
  t.plan(10)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          setTimeout(() => resolve('done'), 10)
        })
      },
      b () {
        const data = this.c
        return new Promise(resolve => {
          setTimeout(() => resolve(data), 20)
        })
      }
    },
    data: () => ({
      c: false
    })
  })
  t.equal(vm.a$updating, true)
  t.equal(vm.b$updating, true)
  vm.$watch('a', function (val) {
    t.equal(val, 'done')
    t.equal(vm.a$updating, false)
    t.equal(vm.b$updating, true)
  })
  vm.$watch('b', function (val) {
    t.equal(val, vm.c)
    t.equal(vm.b$updating, false)
    if (!vm.c) {
      vm.c = true
      Vue.nextTick(() => {
        t.equal(vm.b$updating, true)
      })
    }
  })
})
