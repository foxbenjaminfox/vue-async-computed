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

**This plugin is now Vue 2.0 compatible!**

With this plugin, you can have computed properties in Vue that are computed asynchronously.

Without using this plugin, you can't do this:

````js
new Vue({
  data: {
    userId: 1
  },
  computed: {
    username () {
      // Using vue-resource
      return Vue.http.get('/get-username-by-id/' + this.userId)
        // This assumes that this endpoint will send us a response
        // that contains something like this:
        // { 
        //   "username": "username-goes-here"
        // }
        .then(response => response.data.username)
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
    username () {
      return Vue.http.get('/get-username-by-id/' + this.userId)
        .then(response => response.data.username)
    }
  }
}
````

This is especially useful with ES7 async functions:

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

Alternately, you can link it directly from a CDN:

````html
<script src="https://unpkg.com/vue-async-computed"></script>
<!-- 
  That will always point to the latest version of vue-async-computed.
  You probably want to instead pin it to a specific version:
-->
<script src="https://unpkg.com/vue-async-computed@3.2.0"></script>
````

When used with a module system such as `webpack` or `browserify`, you need to explicitly install `vue-async-computed` via `Vue.use()`:

````js
import Vue from 'vue'
import AsyncComputed from 'vue-async-computed'

Vue.use(AsyncComputed)
````

You don't need to do this when using global script tags. So long as you include `vue-async-computed` in a script tag after Vue itself, it will be installed automatically.

## Usage example

````js
import AsyncComputed from 'vue-async-computed'

/* Initialize the plugin */
Vue.use(AsyncComputed)

/*
   Then, when you create a Vue instance (or component),
   you can pass an object named "asyncComputed" as well as
   or instead of the standard "computed" option. The functions
   you pass to "asyncComputed" should return promises, and the values
   those promises resolve to are then asynchronously bound to the
   Vue instance as they resolve. Just as with normal computed
   properties, if the data the property depends on changes
   then the property is re-run automatically.
   
   You can almost completely ignore the fact that behind the
   scenes they are asynchronous. The one thing to remember is
   that until a asynchronous property's promise resolves
   for the first time, the value of the computed property is null.
*/

const vm = new Vue({
  data: {
    x: 2,
    y: 3
  },
  asyncComputed: {
    sum () {
      const total = this.x + this.y
      return new Promise(resolve =>
        setTimeout(() => resolve(total), 1000)
      )
    }
  }
})

/*
   Until one second has passed, vm.sum will be null.  After that,
   vm.sum will be 5. If you change vm.x or vm.y, then one
   second later vm.sum will automatically update itself to be
   the sum of the values to which you set vm.x and vm.y the previous second.
*/
````

[Like with regular synchronous computed properties](https://vuejs.org/guide/computed.html#Computed-Setter), you can pass an object
with a `get` method instead of a function, but unlike regular computed
properties, async computed properties are always getter-only. If the
object provided has a `set` method it will be ignored.

Async computed properties can also have a custom default value, which will
be used until the data is loaded for the first time:

````js
new Vue({
  data: {
    postId: 1
  },
  asyncComputed: {
    blogPostContent: {
      // The `get` function is the same as the function you would
      // pass directly as the value to `blogPostContent` if you
      // didn't need to specify a default value.
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
       },
       // The computed proporty `blogPostContent` will have 
       // the value 'Loading...' until the first time the promise
       // returned from the `get` function resolves.
       default: 'Loading...'
    }
  }
}

/*
   Now you can display {{blogPostContent}} in your template, which
   will show a loading message until the blog post's content arrives
   from the server.
*/
````

You can instead define the default value as a function, in order to depend on
props or on data:

````js
new Vue({
  data: {
    postId: 1
  },
  asyncComputed: {
    blogPostContent: {
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
      },
      default () {
        return 'Loading post ' + this.postId
      }
    }
  }
}
````

You can also set a custom global default value in the options passed to `Vue.use`:

````javascript
Vue.use(AsyncComputed, {
  default: 'Global default value'
})
````

## Recalculation

Just like normal computed properties, async computed properties keep track of their dependencies, and are only
recalculated if those dependencies change. But often you'll have an async computed property you'll want to run again
without any of its (local) dependencies changing, such as for instance the data may have changed in the database.

You can set up a `watch` function, whose purpose is to set up listeners on additinal dependencies. Your async computed
property will then be recalculated also if any of the watched dependencies change, in addition to the real dependencies
the property itself has:
````js

new Vue({
  data: {
    postId: 1,
    timesPostHasBeenUpdated: 0
  },
  asyncComputed: {
    // blogPostContent will update its contents if postId is changed
    // to point to a diffrent post, but will also refetch the post's
    // contents when you increment timesPostHasBeenUpdated.
    blogPostContent: {
      get () {
        return Vue.http.get('/post/' + this.postId)
          .then(response => response.data.postContent)
      },
      watch () {
        this.timesPostHasBeenUpdated
      }
    }
  }
}
````

## Error handling

By default, in case of a rejected promise in an async computed property, vue-async-computed will take care of logging the error for you.

If you want to use a custom logging function, the plugin takes an `errorHandler` option, which should be the function you want called with the error information. By default, it will be called with the error's stack trace as an argument, but if you want the raw error itself you can set the
`useRawError` option to `true`.

For example: 

````js
Vue.use(AsyncComputed, {
  errorHandler (stack) {
    console.log('Hey, an error!')
    console.log('---')
    console.log(stack)
  }
)

// Or with `useRawError`:
Vue.use(AsyncComputed, {
  useRawError: true,
  errorHandler (err) {
    console.log('An error occurred!')
    console.log('The error message was: ' + err.msg)
    console.log('And the stack trace was:')
    console.log(err.stack)
  }
)
````

You can pass `false` as the `errorHandler` in order to silently ignore rejected promises.

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
