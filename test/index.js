import test from "tape"
import AsyncComputed from "../src"
import Vue from 'vue'

const testErrorLog = []
Vue.use(AsyncComputed, {
  errorHandler: msg => testErrorLog.push(msg)
})

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
  t.plan(4)
  const vm = new Vue({
    asyncComputed: {
      a () {
        return Promise.reject("error")
      }
    }
  })
  t.equal(vm.a, null)
  t.equal(testErrorLog.length, 0)
  Vue.nextTick(() => {
    t.equal(vm.a, null)
    t.equal(testErrorLog.length, 1)
  })
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
