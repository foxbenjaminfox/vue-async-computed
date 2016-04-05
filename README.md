<big><h1 align="center">vue-async-computed</h1></big>

<p align="center">
  <a href="https://npmjs.org/package/vue-async-computed">
    <img src="https://img.shields.io/npm/v/vue-async-computed.svg?style=flat-square"
         alt="NPM Version">
  </a>

  <a href="https://coveralls.io/r/foxbenjaminfox/vue-async-computed">
    <img src="https://img.shields.io/coveralls/foxbenjaminfox/vue-async-computed.svg?style=flat-square"
         alt="Coverage Status">
  </a>

  <a href="https://travis-ci.org/foxbenjaminfox/vue-async-computed">
    <img src="https://img.shields.io/travis/foxbenjaminfox/vue-async-computed.svg?style=flat-square"
         alt="Build Status">
  </a>

  <a href="https://npmjs.org/package/vue-async-computed">
    <img src="http://img.shields.io/npm/dm/vue-async-computed.svg?style=flat-square"
         alt="Downloads">
  </a>

  <a href="https://david-dm.org/foxbenjaminfox/vue-async-computed.svg">
    <img src="https://david-dm.org/foxbenjaminfox/vue-async-computed.svg?style=flat-square"
         alt="Dependency Status">
  </a>

  <a href="https://github.com/foxbenjaminfox/vue-async-computed/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/vue-async-computed.svg?style=flat-square"
         alt="License">
  </a>
</p>

With this plugin, you can have have computed properties in Vue that are computed asynchronously.

Without using this plugin, you can't do this:

````js
new Vue({
  data: {
    userId: 1
  },
  computed: {
    username: {
      // Using vue-resource
      return Vue.http.get('/get-username-by-id', { id: this.userId })
    }
  }
}
````

Or rather, you could, but it wouldn't do what you'd want it to do. But using this plugin, it works just like you'd expect:

````js
new Vue({
  data: {
    userId: 1
  },
  asyncComputed: {
    username: {
      return Vue.http.get('/get-username-by-id', { id: this.userId })
    }
  }
}
````

This is especily useful with ES7 async functions:

````js
new Vue({
  asyncComputed: {
    async someCalculation () {
      const x = await someAsycFunction()
      const y = await anotherAsyncFunction()
      return x + y
    }
  }
})
````

## Install

````sh
npm install --save vue-async-computed
````

## Usage example

````js
import AsyncComputed from 'vue-async-computed'

/* Initialize the plugin */
Vue.use(AsyncComputed)

/* Then, when you create a Vue instance (or component),
   you can pass an object named "asyncComputed" as well as
   or instead of one named "computed". The functions you pass
   to "asyncComputed" should return promises, and the values
   those promises resolve to are then asynchronously bound to
   the Vue instance as the promises resolve. Just like with
   normal computed properties, if the data the property depends
   on changes then the property is re-run automatically.
   
   You can almost completely ignore the fact that behind the
   scenes they are asynchronous. The one thing to remember is
   that until a asynchronously property's promise resolves
   for the first time, the value of the computed property is null.
*/

const vm = new Vue({
  data: {
    x: 2,
    y: 3
  },
  asyncComputed: {
    sum () {
      const sum = this.x + this.y
      return new Promise(resolve =>
        setTimeout(() => resolve(sum), 1000)
      )
    }
  }
})

/* Until one second has passed, vm.sum will be null.
   After that, vm.sum will be 5. If you change vm.x or vm.y,
   one second later vm.sum will automatically update itself to be
   the sum of what you set vm.x and vm.y to be a second before. 
*/
````

## License

MIT © [Benjamin Fox](http://github.com/foxbenjaminfox)

[npm-url]: https://npmjs.org/package/vue-async-computed
[npm-image]: https://img.shields.io/npm/v/vue-async-computed.svg?style=flat-square

[travis-url]: https://travis-ci.org/foxbenjaminfox/vue-async-computed
[travis-image]: https://img.shields.io/travis/foxbenjaminfox/vue-async-computed.svg?style=flat-square

[coveralls-url]: https://coveralls.io/r/foxbenjaminfox/vue-async-computed
[coveralls-image]: https://img.shields.io/coveralls/foxbenjaminfox/vue-async-computed.svg?style=flat-square

[depstat-url]: https://david-dm.org/foxbenjaminfox/vue-async-computed
[depstat-image]: https://david-dm.org/foxbenjaminfox/vue-async-computed.svg?style=flat-square

[download-badge]: http://img.shields.io/npm/dm/vue-async-computed.svg?style=flat-square
