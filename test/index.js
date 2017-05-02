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

test("Async computed values get computed", t => {
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

test("Computed value being an already resolved promise updates at the next tick", t => {
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

test("Recalculated async value is properly recalculated", t => {
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

test("Old async value is invalidated", t => {
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

test("Handle errors in computed properties", t => {
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

test("Handle errors in computed properties, with useRawError", t => {
  pluginOptions.useRawError = true
  t.plan(3)
  const vm = new Vue({
    asyncComputed: {
      a () {
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

test("Handle multiple asyncComputed objects the same way normal as \
normal computed property objects", t => {
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

test("The computed value can be written to, and then will be properly overridden", t => {
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
    },
    asyncComputed: {
      y: {
        get () {
          return Promise.resolve(i)
        },
        watch () {
          this.x
        }
      }
    }
  })
  t.equal(vm.y, null)
  Vue.nextTick(() => {
    t.equal(vm.y, 0)
    i++
    vm.x--
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter functin
      t.equal(vm.y, 0)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and y is 1.
        t.equal(vm.y, 1)
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

test("The default default value can be set in the plugin options to undefined", t => {
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
