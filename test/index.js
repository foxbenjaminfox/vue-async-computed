import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import AsyncComputed from "../src"
import { createApp, defineComponent } from 'vue'

function newVue (component, pluginOpts = {}) {
  // Provide default template to silence warnings
  app = createApp(Object.assign({ template: '<div/>' }, component))
  app.use(AsyncComputed, pluginOpts)
  return app.mount(document.body)
}

let app = null
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.restoreAllMocks()
  app.unmount()
})

test("Async computed values are computed", async () => {
  const vm = newVue({
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

  expect(vm.a).toBeNull()
  expect(vm.b).toBeNull()
  await vi.runAllTimersAsync()
  expect(vm.a).toBe('done')
  expect(vm.b).toBe(1337)
})

test("An async computed value which is an pre-resolved promise updates at the next tick", async () => {
  const vm = newVue({
    asyncComputed: {
      a () {
        return Promise.resolve('done')
      }
    }
  })

  expect(vm.a).toBeNull()
  await vm.$nextTick()
  expect(vm.a).toBe('done')
})

test("Sync and async computed data work together", async () => {
  const vm = newVue({
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

  expect(vm.a).toBeNull()
  expect(vm.b).toBe(0)

  await vi.runAllTimersAsync()

  expect(vm.a).toBe('done')
  expect(vm.b).toBe(0)
})

test("Async values are properly recalculated", async () => {
  const vm = newVue({
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

  expect(vm.a).toBeNull()
  expect(vm.b).toBeNull()
  expect(vm.x).toBe(0)

  await vi.advanceTimersByTimeAsync(10)
  expect(vm.a).toBe(0)
  expect(vm.b).toBeNull()
  expect(vm.x).toBe(0)

  vm.x = 1
  expect(vm.a).toBe(0)
  await vi.advanceTimersByTimeAsync(10)
  expect(vm.a).toBe(1)

  await vi.advanceTimersByTimeAsync(20)
  expect(vm.b).toBe('done')
})

test("Old async values are properly invalidated", async () => {
  const vm = newVue({
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

  expect(vm.a).toBeNull()
  await vi.advanceTimersByTimeAsync(10)
  vm.waitTime = 10
  expect(vm.a).toBeNull()
  await vi.advanceTimersByTimeAsync(10)
  expect(vm.a).toBe(10)
  await vi.runAllTimersAsync()
  expect(vm.a).toBe(10) // Not 40, even though the promise was created with 40
})

test("Having only sync computed data still works", async () => {
  const vm = newVue({
    computed: {
      a () {
        return this.x
      }
    },
    data: {
      x: 2
    }
  })
  expect(vm.a).toBe(2)

  const watchListener = vi.fn()
  vm.$watch('a', watchListener)
  vm.x++
  expect(vm.a).toBe(3)
  await vm.$nextTick()
  expect(watchListener).toHaveBeenCalledTimes(1)
  expect(watchListener).toHaveBeenCalledWith(3, 2, expect.anything())
})

test("Errors in computed properties are handled", async () => {
  const errorHandler = vi.fn()
  const vm = newVue({
    asyncComputed: {
      a () {
        return Promise.reject(new Error('error'))
      }
    }
  }, { errorHandler })
  expect(vm.a).toBeNull()
  await vm.$nextTick() // Triggers the asyncComputed body
  await vm.$nextTick() // Triggers the reject
  expect(vm.a).toBeNull()
  expect(errorHandler).toHaveBeenCalledTimes(1)
  expect(errorHandler.mock.lastCall[0].slice(0, 13)).toBe('Error: error\n')
})

test("Errors in computed properties are handled, with useRawError", async () => {
  const errorHandler = vi.fn()

  const vm = newVue({
    asyncComputed: {
      a () {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('error')
      }
    }
  }, { errorHandler, useRawError: true })
  expect(vm.a).toBeNull()
  await vm.$nextTick() // Triggers the asyncComputed body
  await vm.$nextTick() // Triggers the reject
  expect(vm.a).toBeNull()
  expect(errorHandler).toHaveBeenCalledTimes(1)
  expect(errorHandler.mock.lastCall[0]).toBe('error')
})

test("Multiple asyncComputed objects are handled the same as normal computed property objects", async () => {
  const vm = newVue({
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
  await vm.$nextTick()
  expect(vm.a).toBe('vm-a')
  expect(vm.b).toBe('mixin-b')
  expect(vm.c).toBe('vm-c')
})

test("Async computed values can have defaults", async () => {
  const xWatcher = vi.fn()
  const computedFromX = vi.fn(function () { return this.x })

  const vm = newVue({
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
    },
    watch: {
      x: {
        deep: true,
        immediate: true,
        handler: xWatcher,
      },
    },
    computed: {
      computedFromX,
    },
  })

  expect(vm.x).toBe(false) // x should default to false
  expect(vm.y).toBeNull() // y doesn't have a default
  expect(vm.z).toBeNull() // z doesn't have a default despite being defined with an object

  expect(xWatcher).toHaveBeenCalledTimes(1)
  expect(xWatcher).toHaveBeenCalledWith(false, undefined, expect.anything())
  expect(computedFromX).toHaveBeenCalledTimes(0)
  const computed = vm.computedFromX // Force computed execution
  expect(computed).toBe(false)
  expect(xWatcher).toHaveBeenCalledTimes(1)
  expect(computedFromX).toHaveBeenCalledTimes(1)

  await vm.$nextTick()
  expect(vm.x).toBe(true) // x resolves to true
  expect(vm.y).toBe(true) // y resolves to true
  expect(vm.z).toBe(true) // z resolves to true
})

test("Default values can be functions", async () => {
  const vm = newVue({
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
  expect(vm.y).toBe(2)
  expect(vm.z).toBe(1)
  await vm.$nextTick()
  expect(vm.y).toBe(3)
  expect(vm.z).toBe(4)
})

test("Async computed values can be written to, and then will be properly overridden", async () => {
  const vm = newVue({
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
  expect(vm.y).toBe(2)
  await vi.advanceTimersByTimeAsync(10)
  expect(vm.y).toBe(1)
  vm.x = 4
  expect(vm.y).toBe(1)
  await vm.$nextTick()
  expect(vm.y).toBe(5)
  await vi.advanceTimersByTimeAsync(10)
  expect(vm.y).toBe(4)
})

test("Watchers rerun the computation when a value changes", async () => {
  let i = 0
  const vm = newVue({
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
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(vm.z).toBe(2)
  i++
  vm.x--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished and z is 3
  expect(vm.z).toBe(3)
})

test("shouldUpdate controls when to rerun the computation when a value changes", async () => {
  let i = 0
  let getCallCount = 0
  const vm = newVue({
    data: {
      x: 0,
      y: 2,
    },
    asyncComputed: {
      z: {
        get () {
          getCallCount++
          return Promise.resolve(i + this.y)
        },
        shouldUpdate () {
          return this.x % 2 === 0
        }
      }
    }
  })
  expect(getCallCount).toBe(1)
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(getCallCount).toBe(1)
  expect(vm.z).toBe(2)
  i++
  // update x so it will be 1
  // should update returns false now
  vm.x++
  expect(getCallCount).toBe(1)
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  expect(vm.z).toBe(2)
  await vm.$nextTick()
  // Now in this tick the promise has
  // resolved, and z is 2 since should update returned false.
  expect(vm.z).toBe(2)
  // update x so it will be 2
  // should update returns true now
  expect(getCallCount).toBe(1)
  vm.x++
  expect(getCallCount).toBe(1)
  await vm.$nextTick()
  expect(getCallCount).toBe(2)
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished and z is 3
  expect(vm.z).toBe(3)
})

test("Watchers trigger but shouldUpdate can still block their updates", async () => {
  let i = 0
  const vm = newVue({
    data: {
      canUpdate: true,
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
        },
        shouldUpdate () {
          return this.canUpdate
        }
      }
    }
  })
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(vm.z).toBe(2)
  i++
  vm.x--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished
  expect(vm.z).toBe(3)
  // We stop all updates from now on
  vm.canUpdate = false
  i++
  vm.x--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function but no update
  expect(vm.z).toBe(3)
  await vm.$nextTick()
  // Now in this tick the promise has
  // resolved, and z is still 3.
  expect(vm.z).toBe(3)
})

test("The default default value can be set in the plugin options", async () => {
  const vm = newVue({
    asyncComputed: {
      x () {
        return Promise.resolve(0)
      }
    }
  }, { default: 53 })
  expect(vm.x).toBe(53)
  await vm.$nextTick()
  expect(vm.x).toBe(0)
})

test("The default default value can be set to undefined in the plugin options", async () => {
  const vm = newVue({
    asyncComputed: {
      x () {
        return Promise.resolve(0)
      }
    }
  }, { default: undefined })
  expect(vm.x).toBeUndefined()
  await vm.$nextTick()
  expect(vm.x).toBe(0)
})

test("Handle an async computed value returning synchronously", async () => {
  const vm = newVue({
    asyncComputed: {
      x () {
        return 1
      }
    }
  })
  expect(vm.x).toBeNull()
  await vm.$nextTick()
  expect(vm.x).toBe(1)
})

test("Work correctly with Vue.extend", async () => {
  const SubVue = defineComponent({
    asyncComputed: {
      x () {
        return Promise.resolve(1)
      }
    }
  })
  const vm = newVue({ extends: SubVue })
  expect(vm.x).toBeNull()
  await vm.$nextTick()
  expect(vm.x).toBe(1)
})

test("Async computed values can be calculated lazily", async () => {
  let called = false
  const vm = newVue({
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

  expect(called).toBe(false)
  await vm.$nextTick()
  expect(called).toBe(false)
  expect(vm.a).toBe(null)
  expect(vm.a).toBe(null)
  expect(called).toBe(false)
  await vm.$nextTick()
  expect(called).toBe(true)
  expect(vm.a).toBe(10)
})

test("Async computed values aren't lazy with { lazy: false }", async () => {
  let called = false
  const vm = newVue({
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

  expect(called).toBe(true)
  expect(vm.a).toBeNull()
  await vm.$nextTick()
  expect(called).toBe(true)
  expect(vm.a).toBe(10)
})

test("Async computed values can be calculated lazily with a default", async () => {
  let called = false
  const vm = newVue({
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

  expect(called).toBe(false)
  await vm.$nextTick()
  expect(called).toBe(false)
  expect(vm.a).toBe(3)
  expect(vm.a).toBe(3)
  expect(called).toBe(false)
  await vm.$nextTick()
  expect(called).toBe(true)
  expect(vm.a).toBe(4)
})

test("Underscore prefixes work (issue #33)", async () => {
  const vm = newVue({
    computed: {
      sync_a () {
        return 1
      },
      _sync_b () {
        return 2
      }
    },
    asyncComputed: {
      _async_a () {
        return new Promise(resolve => {
          setTimeout(() => resolve(this.sync_a), 10)
        })
      },
      async_b () {
        return new Promise(resolve => {
          setTimeout(() => resolve(this._sync_b), 10)
        })
      }
    }
  })
  expect(vm._async_a).toBeNull()
  expect(vm.async_b).toBeNull()
  // _async_a is not reactive, because
  // it begins with an underscore
  await vi.advanceTimersByTimeAsync(10)
  expect(vm._async_a).toBe(1)
  expect(vm.async_b).toBe(2)
})

test("shouldUpdate works with lazy", async () => {
  const vm = newVue({
    data: {
      a: 0,
      x: true,
      y: false,
    },
    asyncComputed: {
      b: {
        lazy: true,
        get () {
          return Promise.resolve(this.a)
        },
        shouldUpdate () {
          return this.x
        }
      },
      c: {
        lazy: true,
        get () {
          return Promise.resolve(this.a)
        },
        shouldUpdate () {
          return this.y
        }
      }
    }
  })

  await vm.$nextTick()
  expect(vm.b).toBe(null)
  expect(vm.c).toBe(null)
  await vm.$nextTick()
  expect(vm.b).toBe(0)
  expect(vm.c).toBe(null)
  vm.a++
  await vm.$nextTick()
  expect(vm.b).toBe(1)
  expect(vm.c).toBe(null)
  vm.x = false
  vm.y = true
  vm.a++
  await vm.$nextTick()
  expect(vm.b).toBe(1)
  expect(vm.c).toBe(2)
})

test("$asyncComputed is empty if there are no async computed properties", () => {
  const vm = newVue({
  })
  expect(vm.$asyncComputed).toStrictEqual({})
})

test("$asyncComputed[name] is created for all async computed properties", async () => {
  const vm = newVue({
    asyncComputed: {
      a () {
        return Promise.resolve(1)
      },
      b () {
        return Promise.resolve(2)
      }
    }
  })
  expect(Object.keys(vm.$asyncComputed)).toStrictEqual(['a', 'b'])
  expect(vm.$asyncComputed.a.state).toBe('updating')
  expect(vm.$asyncComputed.b.state).toBe('updating')
  expect(vm.$asyncComputed.a.updating).toBe(true)
  expect(vm.$asyncComputed.a.success).toBe(false)
  expect(vm.$asyncComputed.a.error).toBe(false)
  expect(vm.$asyncComputed.a.exception).toBe(null)

  await vm.$nextTick()
  expect(vm.a).toBe(1)
  expect(vm.b).toBe(2)
  expect(vm.$asyncComputed.a.state).toBe('success')
  expect(vm.$asyncComputed.b.state).toBe('success')
  expect(vm.$asyncComputed.a.updating).toBe(false)
  expect(vm.$asyncComputed.a.success).toBe(true)
  expect(vm.$asyncComputed.a.error).toBe(false)
  expect(vm.$asyncComputed.a.exception).toBe(null)
})

test("$asyncComputed[name] handles errors and captures exceptions", async () => {
  const errorHandler = vi.fn()
  const vm = newVue({
    asyncComputed: {
      a () {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('error-message')
      }
    }
  }, { errorHandler })
  expect(vm.$asyncComputed.a.state).toBe('updating')
  await vm.$nextTick()
  await vm.$nextTick()
  expect(errorHandler).toHaveBeenCalledTimes(1)
  expect(vm.a).toBe(null)
  expect(vm.$asyncComputed.a.state).toBe('error')
  expect(vm.$asyncComputed.a.updating).toBe(false)
  expect(vm.$asyncComputed.a.success).toBe(false)
  expect(vm.$asyncComputed.a.error).toBe(true)
  expect(vm.$asyncComputed.a.exception).toBe('error-message')
})

test("$asyncComputed[name].update triggers re-evaluation", async () => {
  let valueToReturn = 1
  const vm = newVue({
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          resolve(valueToReturn)
        })
      }
    }
  })

  await vm.$nextTick()
  expect(vm.a).toBe(1)
  valueToReturn = 2
  expect(vm.$asyncComputed.a.state).toBe('success')
  vm.$asyncComputed.a.update()
  expect(vm.$asyncComputed.a.state).toBe('updating')
  await vm.$nextTick()
  expect(vm.a).toBe(2)
  valueToReturn = 3
  expect(vm.a).toBe(2)
})

test("$asyncComputed[name].update has the correct execution context", async () => {
  let addedValue = 1
  const vm = newVue({
    data () {
      return {
        valueToReturn: 1,
      }
    },
    asyncComputed: {
      a () {
        return new Promise(resolve => {
          resolve(this.valueToReturn + addedValue)
        })
      },
      b: {
        get () {
          return new Promise(resolve => {
            resolve(this.valueToReturn + addedValue)
          })
        },
      },
    },
  })

  await vm.$nextTick()
  // case 1: a is a function
  expect(vm.a).toBe(2)
  expect(vm.$asyncComputed.a.state).toBe('success')
  // case 2: b is an object with a getter function
  expect(vm.b).toBe(2)
  expect(vm.$asyncComputed.b.state).toBe('success')

  addedValue = 4

  vm.$asyncComputed.a.update()
  expect(vm.$asyncComputed.a.state).toBe('updating')

  vm.$asyncComputed.b.update()
  expect(vm.$asyncComputed.b.state).toBe('updating')

  await vm.$nextTick()
  expect(vm.a).toBe(5)
  expect(vm.b).toBe(5)
})

test("Plain components with neither `data` nor `asyncComputed` still work (issue #50)", async () => {
  const vm = newVue({
    computed: {
      a () {
        return 1
      }
    }
  })
  expect(vm.a).toBe(1)
})

test('Data of component still work as function and got vm', async () => {
  let _vmContext = null
  const vm = newVue({
    data (vmContext) {
      _vmContext = vmContext
    },
    asyncComputed: {
      async a () {
        return Promise.resolve(1)
      },
    },

  })
  expect(vm).toBe(_vmContext)
})

test("Watch as a function", async () => {
  let i = 0
  const vm = newVue({
    data: {
      y: 2,
      obj: {
        t: 0
      }
    },
    asyncComputed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch () {
          // eslint-disable-next-line no-unused-expressions
          this.obj.t
        }
      }
    }
  })
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(vm.z).toBe(2)
  i++
  vm.obj.t--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished and z is 3
  expect(vm.z).toBe(3)
})

test("Watchers as array with nested path rerun the computation when a value changes", async () => {
  let i = 0
  const vm = newVue({
    data: {
      y: 2,
      obj: {
        t: 0
      }
    },
    asyncComputed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch: ['obj.t']
      }
    }
  })
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(vm.z).toBe(2)
  i++
  vm.obj.t--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished and z is 3
  expect(vm.z).toBe(3)
})

test("Watch as array with more then one value", async () => {
  let i = 0
  const vm = newVue({
    data: {
      y: 2,
      obj: {
        t: 0
      },
      r: 0
    },
    asyncComputed: {
      z: {
        get () {
          return Promise.resolve(i + this.y)
        },
        watch: ['obj.t', 'r']
      }
    }
  })
  expect(vm.z).toBeNull()
  await vm.$nextTick()
  expect(vm.z).toBe(2)
  i++
  // checking for nested property
  vm.obj.t--
  await vm.$nextTick()
  // This tick, Vue registers the change
  // in the watcher, and reevaluates
  // the getter function
  // And since we 'await', the promise chain
  // is finished and z is 3
  expect(vm.z).toBe(3)
  i++
  // one level and multiple watchers
  vm.r--
  await vm.$nextTick()
  expect(vm.z).toBe(4)
})

test("$asyncComputed[name].state resolves to 'success' even if the computed value is 0 (issue #75)", async () => {
  const vm = newVue({
    computed: {
      isUpdating () {
        return this.$asyncComputed.a.updating
      }
    },
    asyncComputed: {
      a: {
        async get () {
          return 0
        },
        default: null
      }
    }
  })
  expect(vm.$asyncComputed.a.state).toBe('updating')
  expect(vm.$asyncComputed.a.updating).toBe(true)
  expect(vm.$asyncComputed.a.success).toBe(false)
  expect(vm.$asyncComputed.a.error).toBe(false)
  expect(vm.$asyncComputed.a.exception).toBe(null)
  expect(vm.isUpdating).toBe(true)

  await vm.$nextTick()
  expect(vm.a).toBe(0)
  expect(vm.$asyncComputed.a.state).toBe('success')
  expect(vm.$asyncComputed.a.updating).toBe(false)
  expect(vm.$asyncComputed.a.success).toBe(true)
  expect(vm.$asyncComputed.a.error).toBe(false)
  expect(vm.$asyncComputed.a.exception).toBe(null)
  expect(vm.isUpdating).toBe(false)
})

test("$asyncComputed[name].update does nothing if called after the component is destroyed", async () => {
  let i = 0
  const vm = newVue({
    asyncComputed: {
      a: {
        async get () {
          return ++i
        }
      }
    }
  })

  expect(vm.a).toBeNull()
  await vm.$nextTick()
  expect(vm.a).toBe(1)
  app.unmount(vm)
  vm.$asyncComputed.a.update()
  await vm.$nextTick()
  expect(i).toBe(1)
  expect(vm.a).toBe(1)
})
