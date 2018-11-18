import test from "tape"
import AsyncComputed from "../src"
import Vue from 'vue'

let baseErrorCallback = () => {
  throw new Error('Unexpected error thrown')
}

const pluginOptions = {
  errorHandler: msg => baseErrorCallback(),
}

Vue.use(AsyncComputed, pluginOptions)

test("Async computed values are computed", t => {
  t.plan(4)
  const vm = new Vue({
    computed: {
      a: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve('done'), 10)
          })
        },
        asynchronous: true,
      },
      b: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve(1337), 20)
          })
        },
        asynchronous: true,
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
    computed: {
      a: {
        get () {
          return Promise.resolve('done')
        },
        asynchronous: true,
      }
    }
  })
  t.equal(vm.a, null)
  Vue.nextTick(() => t.equal(vm.a, 'done'))
})

test("Sync and async computed data work together", t => {
  t.plan(4)
  const vm = new Vue({
    computed: {
      a: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve('done'), 10)
          })
        },
        asynchronous: true,
      },
      b () {
        return 0
      }
    },
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
    computed: {
      a: {
        get () {
          const data = this.x
          return new Promise(resolve => {
            setTimeout(() => resolve(data), 10)
          })
        },
        asynchronous: true,
      },
      b: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve('done'), 40)
          })
        },
        asynchronous: true,
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
    computed: {
      a: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve(this.waitTime), this.waitTime)
          })
        },
        asynchronous: true,
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
    computed: {
      a: {
        get () {
          return Promise.reject(new Error('error'))
        },
        asynchronous: true
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
    computed: {
      a: {
        get () {
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject('error')
        },
        asynchronous: true,
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
      computed: {
        a: {
          get () {
            return Promise.resolve('mixin-a')
          },
          asynchronous: true,
        },
        b: {
          get () {
            return Promise.resolve('mixin-b')
          },
          asynchronous: true,
        }
      }
    }],
    computed: {
      a: {
        get () {
          return Promise.resolve('vm-a')
        },
        asynchronous: true,
      },
      c: {
        get () {
          return Promise.resolve('vm-c')
        },
        asynchronous: true,
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
    computed: {
      x: {
        default: false,
        get () {
          return Promise.resolve(true)
        },
        asynchronous: true,
      },
      y: {
        get () {
          return Promise.resolve(true)
        },
        asynchronous: true,
      },
      z: {
        get () {
          return Promise.resolve(true)
        },
        asynchronous: true,
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
    computed: {
      y: {
        default () { return 2 },
        get () {
          return Promise.resolve(3)
        },
        asynchronous: true,
      },
      z: {
        default () { return this.x },
        get () {
          return Promise.resolve(4)
        },
        asynchronous: true,
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
    computed: {
      y: {
        get () {
          this.y = this.x + 1
          return new Promise(resolve => {
            setTimeout(() => resolve(this.x), 10)
          })
        },
        asynchronous: true,
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
    computed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch () {
          // eslint-disable-next-line no-unused-expressions
          this.x
        },
        asynchronous: true,
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
      // the getter function
      t.equal(vm.z, 2)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
      })
    })
  })
})

test("shouldUpdate controls when to rerun the computation when a value changes", t => {
  t.plan(6)
  let i = 0
  const vm = new Vue({
    data: {
      x: 0,
      y: 2,
    },
    computed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        shouldUpdate () {
          return this.x % 2 === 0
        },
        asynchronous: true,
      }
    }
  })
  t.equal(vm.z, null)
  Vue.nextTick(() => {
    t.equal(vm.z, 2)
    i++
    // update x so it will be 1
    // should update returns false now
    vm.x++
    Vue.nextTick(() => {
      // This tick, Vue registers the change
      // in the watcher, and reevaluates
      // the getter function
      t.equal(vm.z, 2)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 2 since should update returned false.
        t.equal(vm.z, 2)
        // update x so it will be 2
        // should update returns true now
        vm.x++
        Vue.nextTick(() => {
          // This tick, Vue registers the change
          // in the watcher, and reevaluates
          // the getter function
          t.equal(vm.z, 2)
          Vue.nextTick(() => {
            // Now in this tick the promise has
            // resolved, and z is 3.
            t.equal(vm.z, 3)
          })
        })
      })
    })
  })
})

test("Watchers trigger but shouldUpdate can still block their updates", t => {
  t.plan(6)
  let i = 0
  const vm = new Vue({
    data: {
      canUpdate: true,
      x: 0,
      y: 2,
    },
    computed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch () {
          // eslint-disable-next-line no-unused-expressions
          this.x
        },
        shouldUpdate () {
          return this.canUpdate
        },
        asynchronous: true,
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
      // the getter function
      t.equal(vm.z, 2)
      Vue.nextTick(() => {
        // Now in this tick the promise has
        // resolved, and z is 3.
        t.equal(vm.z, 3)
        // We stop all updates from now on
        vm.canUpdate = false
        i++
        vm.x--
        Vue.nextTick(() => {
          // This tick, Vue registers the change
          // in the watcher, and reevaluates
          // the getter function but no update
          t.equal(vm.z, 3)
          Vue.nextTick(() => {
            // Now in this tick the promise has
            // resolved, and z is still 3.
            t.equal(vm.z, 3)
          })
        })
      })
    })
  })
})

test("The default default value can be set in the plugin options", t => {
  t.plan(2)
  pluginOptions.default = 53
  const vm = new Vue({
    computed: {
      x: {
        get () {
          return Promise.resolve(0)
        },
        asynchronous: true,
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
    computed: {
      x: {
        get () {
          return Promise.resolve(0)
        },
        asynchronous: true,
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
    computed: {
      x: {
        get () {
          return 1
        },
        asynchronous: true,
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
    computed: {
      x: {
        get () {
          return Promise.resolve(1)
        },
        asynchronous: true,
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
    computed: {
      a: {
        lazy: true,
        get () {
          called = true
          return Promise.resolve(10)
        },
        asynchronous: true,
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
    computed: {
      a: {
        lazy: false,
        get () {
          called = true
          return Promise.resolve(10)
        },
        asynchronous: true,
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
    computed: {
      a: {
        lazy: true,
        default: 3,
        get () {
          called = true
          return Promise.resolve(4)
        },
        asynchronous: true,
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

test("Underscore prefixes work (issue #33)", t => {
  t.plan(4)
  const vm = new Vue({
    computed: {
      sync_a () {
        return 1
      },
      _sync_b () {
        return 2
      },
      _async_a: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve(this.sync_a)
              this.a_complete = true
            }, 10)
          })
        },
        asynchronous: true,
      },
      async_b: {
        get () {
          return new Promise(resolve => {
            setTimeout(() => resolve(this._sync_b), 10)
          })
        },
        asynchronous: true,
      }
    },
    data () {
      return { a_complete: false }
    },
  })
  t.equal(vm._async_a, null)
  t.equal(vm.async_b, null)
  // _async_a is not reactive, because
  // it begins with an underscore
  // so we'll watch 'a_complete' to know once
  // async_a has been computed.
  vm.$watch('a_complete', function (val) {
    t.equal(vm._async_a, 1)
  })
  vm.$watch('async_b', function (val) {
    t.equal(val, 2)
  })
})

test("shouldUpdate works with lazy", t => {
  t.plan(8)
  const vm = new Vue({
    data: {
      a: 0,
      x: true,
      y: false,
    },
    computed: {
      b: {
        lazy: true,
        get () {
          return Promise.resolve(this.a)
        },
        shouldUpdate () {
          return this.x
        },
        asynchronous: true,
      },
      c: {
        lazy: true,
        get () {
          return Promise.resolve(this.a)
        },
        shouldUpdate () {
          return this.y
        },
        asynchronous: true,
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.b, null)
    t.equal(vm.c, null)
    Vue.nextTick(() => {
      Vue.nextTick(() => {
        t.equal(vm.b, 0)
        t.equal(vm.c, null)
        vm.a++
        Vue.nextTick(() => {
          Vue.nextTick(() => {
            t.equal(vm.b, 1)
            t.equal(vm.c, null)
            vm.x = false
            vm.y = true
            vm.a++
            Vue.nextTick(() => {
              Vue.nextTick(() => {
                t.equal(vm.b, 1)
                t.equal(vm.c, 2)
              })
            })
          })
        })
      })
    })
  })
})

test("$asyncComputed is empty if there are no async computed properties", t => {
  t.plan(1)
  const vm = new Vue({
  })
  t.deepEqual(vm.$asyncComputed, {})
})

test("$asyncComputed[name] is created for all async computed properties", t => {
  t.plan(15)
  const vm = new Vue({
    computed: {
      a: {
        get () {
          return Promise.resolve(1)
        },
        asynchronous: true,
      },
      b: {
        get () {
          return Promise.resolve(2)
        },
        asynchronous: true,
      }
    }
  })
  t.deepEqual(Object.keys(vm.$asyncComputed), ['a', 'b'])
  t.equal(vm.$asyncComputed['a'].state, 'updating')
  t.equal(vm.$asyncComputed['b'].state, 'updating')
  t.equal(vm.$asyncComputed['a'].updating, true)
  t.equal(vm.$asyncComputed['a'].success, false)
  t.equal(vm.$asyncComputed['a'].error, false)
  t.equal(vm.$asyncComputed['a'].exception, null)

  Vue.nextTick(() => {
    t.equal(vm.a, 1)
    t.equal(vm.b, 2)
    t.equal(vm.$asyncComputed['a'].state, 'success')
    t.equal(vm.$asyncComputed['b'].state, 'success')
    t.equal(vm.$asyncComputed['a'].updating, false)
    t.equal(vm.$asyncComputed['a'].success, true)
    t.equal(vm.$asyncComputed['a'].error, false)
    t.equal(vm.$asyncComputed['a'].exception, null)
  })
})

test("$asyncComputed[name] handles errors and captures exceptions", t => {
  t.plan(7)
  const vm = new Vue({
    computed: {
      a: {
        get () {
          // eslint-disable-next-line prefer-promise-reject-errors
          return Promise.reject('error-message')
        },
        asynchronous: true,
      }
    }
  })
  t.equal(vm.$asyncComputed['a'].state, 'updating')
  pluginOptions.errorHandler = stack => {
    t.equal(vm.a, null)
    t.equal(vm.$asyncComputed['a'].state, 'error')
    t.equal(vm.$asyncComputed['a'].updating, false)
    t.equal(vm.$asyncComputed['a'].success, false)
    t.equal(vm.$asyncComputed['a'].error, true)
    t.equal(vm.$asyncComputed['a'].exception, 'error-message')
    pluginOptions.errorHandler = baseErrorCallback
  }
})

test("$asyncComputed[name].update triggers re-evaluation", t => {
  let valueToReturn = 1
  t.plan(5)
  const vm = new Vue({
    computed: {
      a: {
        get () {
          return new Promise(resolve => {
            resolve(valueToReturn)
          })
        },
        asynchronous: true,
      }
    }
  })

  Vue.nextTick(() => {
    t.equal(vm.a, 1)
    valueToReturn = 2
    t.equal(vm.$asyncComputed['a'].state, 'success')
    vm.$asyncComputed['a'].update()
    t.equal(vm.$asyncComputed['a'].state, 'updating')

    Vue.nextTick(() => {
      t.equal(vm.a, 2)
      valueToReturn = 3

      Vue.nextTick(() => {
        t.equal(vm.a, 2)
      })
    })
  })
})

test("Plain components with neither `data` nor `asyncComputed` still work (issue #50)", t => {
  t.plan(1)
  const vm = new Vue({
    computed: {
      a () {
        return 1
      }
    }
  })
  t.equal(vm.a, 1)
})
