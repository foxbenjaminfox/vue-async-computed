<big><h1 align="center">vue-async-computed</h1></big>

<p align="center">
  <a href="https://npmjs.org/package/vue-async-computed">
    <img src="https://img.shields.io/npm/v/vue-async-computed.svg?style=flat-square"
         alt="NPM Version">
  </a>

  <a href="https://github.com/foxbenjaminfox/vue-async-computed/actions/workflows/ci.yml">
    <img src="https://img.shields.io/github/actions/workflow/status/foxbenjaminfox/vue-async-computed/ci.yml?style=flat-square"
         alt="Build Status">
  </a>

  <a href="https://npmjs.org/package/vue-async-computed">
    <img src="https://img.shields.io/npm/dm/vue-async-computed.svg?style=flat-square"
         alt="Downloads">
  </a>

  <a href="https://github.com/foxbenjaminfox/vue-async-computed/blob/master/LICENSE">
    <img src="https://img.shields.io/npm/l/vue-async-computed.svg?style=flat-square"
         alt="License">
  </a>
</p>

With this plugin, you can have computed properties in Vue that are computed asynchronously.

Without using this plugin, you can't do this:

```js
export default {
  data () {
    return {
      userId: 1
    }
  },
  computed: {
    username () {
      return fetch(`/get-username-by-id/${this.userId}`)
        // This assumes that this endpoint will send us a response
        // that contains something like this:
        // {
        //   "username": "username-goes-here"
        // }
        .then(response => response.json())
        .then(user => user.username)
    }
  }
}
```

Or rather, you could, but it wouldn't do what you'd want it to do. But using this plugin, it works just like you'd expect:

```js
export default {
  data () {
    return {
      userId: 1
    }
  },
  asyncComputed: {
    username () {
      return fetch(`/get-username-by-id/${this.userId}`)
        .then(r => r.json())
        .then(user => user.username)
    }
  }
}
```

This is especially useful with ES7 async functions:

```js
export default {
  asyncComputed: {
    async someCalculation () {
      const x = await someAsycFunction()
      const y = await anotherAsyncFunction()
      return x + y
    }
  }
}
```

## Install

```sh
npm install --save vue-async-computed
```

And then install `vue-async-computed` via `app.use()` to make it available for all your components:

```js
import { createApp } from 'vue'
import App from './App.vue'
import AsyncComputed from 'vue-async-computed'

const app = createApp(App)
app.use(AsyncComputed)
app.mount('#app')
```

Alternately, you can link it directly from a CDN:

```html
<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
<script src="https://unpkg.com/vue-async-computed@4.0.0"></script>

<div id="app">
  <input type="number" v-model="x"> + <input type="number" v-model="y">
  = {{sum == null ? 'Loading' : sum}}
</div>

<script>
  const app = Vue.createApp({
    data () {
      return {
        x: 2,
        y: 3
      }
    },
    asyncComputed: {
      async sum () {
        await new Promise(resolve => setTimeout(resolve, 1000))
        return this.x + this.y
      }
    }
  })
  app.use(AsyncComputed)
  app.mount('#app')
</script>
```

## Usage example

```js
export default {
  data () {
    return {
      x: 2,
      y: 3
    }
  },

  /*
    When you create a Vue instance (or component),
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
  asyncComputed: {
    /*
      Until one second has passed, vm.sum will be null. After that,
      vm.sum will be 5. If you change vm.x or vm.y, then one
      second later vm.sum will automatically update itself to be
      the sum of the values to which you set vm.x and vm.y the previous second.
    */
    async sum () {
      await new Promise(resolve => setTimeout(resolve, 1000))
      return this.x + this.y
    }
  }
}
```

[Like with regular synchronous computed properties](https://vuejs.org/guide/essentials/computed.html#writable-computed), you can pass an object
with a `get` method instead of a function, but unlike regular computed
properties, async computed properties are always getter-only. If the
object provided has a `set` method it will be ignored.

Async computed properties can also have a custom default value, which will
be used until the data is loaded for the first time:

```js
export default {
  data () {
    return {
      postId: 1
    }
  },
  asyncComputed: {
    blogPostContent: {
      // The `get` function is the same as the function you would
      // pass directly as the value to `blogPostContent` if you
      // didn't need to specify a default value.
      async get () {
        const post = await fetch(`/post/${this.postId}`)
          .then(response => response.json())
        return post.postContent
      },
       // The computed property `blogPostContent` will have
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
```

You can instead define the default value as a function, in order to depend on
props or on data:

```js
export default {
  data () {
    return {
      postId: 1
    }
  },
  asyncComputed: {
    blogPostContent: {
      async get () {
        const post = await fetch(`/post/${this.postId}`)
          .then(response => response.json())
        return post.postContent
      },
      default () {
        return `Loading post ${this.postId}...`
      }
    }
  }
}
```

You can also set a custom global default value in the options passed to `app.use`:

```javascript
app.use(AsyncComputed, {
  default: 'Global default value'
})
```

## Recalculation

Just like normal computed properties, async computed properties keep track of their dependencies, and are only
recalculated if those dependencies change. But often you'll have an async computed property you'll want to run again
without any of its (local) dependencies changing, such as for instance the data may have changed in the database.

You can set up a `watch` property, listing the additional dependencies to watch.
Your async computed property will then be recalculated also if any of the watched
dependencies change, in addition to the real dependencies the property itself has:

```js
export default {
  data () {
    return {
      postId: 1,
      timesPostHasBeenUpdated: 0
    }
  },
  asyncComputed: {
    // blogPostContent will update its contents if postId is changed
    // to point to a diffrent post, but will also refetch the post's
    // contents when you increment timesPostHasBeenUpdated.
    blogPostContent: {
      async get () {
        const post = await fetch(`/post/${this.postId}`)
          .then(response => response.json())
        return post.postContent
      },
      watch: ['timesPostHasBeenUpdated']
    }
  }
}
```

Just like with Vue's normal `watch`, you can use a dotted path in order to watch a nested property. For example, `watch: ['a.b.c', 'd.e']` would declare a dependency on `this.a.b.c` and on `this.d.e`.

You can trigger re-computation of an async computed property manually, e.g. to re-try if an error occurred during evaluation. This should be avoided if you are able to achieve the same result using a watched property.

````js
export default {
  asyncComputed: {
    blogPosts: {
      async get () {
        return fetch('/posts')
          .then(response => response.json())
      }
    }
  },
  methods: {
    refresh() {
      // Triggers an immediate update of blogPosts
      // Will work even if an update is in progress.
      this.$asyncComputed.blogPosts.update()
    }
  }
}
````

### Conditional Recalculation

Using `watch` it is possible to force the computed property to run again unconditionally.
If you need more control over when the computation should be rerun you can use `shouldUpdate`:

```js

export default {
  data () {
    return {
      postId: 1,
      // Imagine pageType can be one of 'index', 'details' and 'edit'.
      pageType: 'index'
    }
  },
  asyncComputed: {
    blogPostContent: {
      async get () {
        const post = await fetch(`/post/${this.postId}`)
          .then(response => response.json())
        return post.postContent
      },
      // Will update whenever the pageType or postId changes,
      // but only if the pageType is not 'index'. This way the
      // blogPostContent will be refetched only when loading the
      // 'details' and 'edit' pages.
      shouldUpdate () {
        return this.pageType !== 'index'
      }
    }
  }
}
```

The main advantage over adding an `if` statement within the get function is that the old value is still accessible even if the computation is not re-run.

## Lazy properties

Normally, computed properties are both run immediately, and re-run as necessary when their dependencies change.
With async computed properties, you sometimes don't want that. With `lazy: true`, an async computed
property will only be computed the first time it's accessed.

For example:
```js
export default {
  data () {
    return {
      id: 1
    }
  },
  asyncComputed: {
    mightNotBeNeeded: {
      lazy: true,
      async get () {
        return fetch(`/might-not-be-needed/${this.id}`)
          .then(response => response.json())
          .then(response => response.value)
      }
      // The value of `mightNotBeNeeded` will only be
      // calculated when it is first accessed.
    }
  }
}
```

## Computation status

For each async computed property, an object is added to `$asyncComputed` that contains information about the current computation state of that object. This object contains the following properties:

```js
{
  // Can be one of updating, success, error
  state: 'updating',
  // A boolean that is true while the property is updating.
  updating: true,
  // The property finished updating without errors (the promise was resolved) and the current value is available.
  success: false,
  // The promise was rejected.
  error: false,
  // The raw error/exception with which the promise was rejected.
  exception: null
}
```

It is meant to be used in your rendering code to display update / error information:

````html
<script>
export default {
  asyncComputed: {
    async posts() {
      return fetch('/posts').then(r => r.json())
    }
  }
}
</script>
<template>
  <!-- This will display a loading message every time the posts are updated: -->
  <template v-if="$asyncComputed.posts.updating">Loading...</template>
  
  <!-- You can display an error message if loading the posts failed. -->
  <template v-else-if="$asyncComputed.posts.error">
    Error while loading posts: {{ $asyncComputed.posts.exception }}
    <button @click="$asyncComputed.posts.update()">Retry</button>
  </template>
  
  <!-- Or finally, display the result: -->
  <template v-else>
    {{ posts }}
  </template>
</template>
````

Note: If you want to display a special message the first time the posts load, you can use the fact that the default value is null:

```html
<div v-if="$asyncComputed.posts.updating && posts === null"> Loading posts </div>
```

## Global error handling

By default, in case of a rejected promise in an async computed property, vue-async-computed will take care of logging the error for you.

If you want to use a custom logging function, the plugin takes an `errorHandler`
option, which should be the function you want called with the error information.
By default, it will be called with only the error's stack trace as an argument,
but if you register the `errorHandler` with `useRawError` set to `true` the
function will receive the raw error, a reference to the `Vue` instance that
threw the error and the error's stack trace.

For example:

```js
app.use(AsyncComputed, {
  errorHandler (stack) {
    console.log('Hey, an error!')
    console.log('---')
    console.log(stack)
  }
})

// Or with `useRawError`:
app.use(AsyncComputed, {
  useRawError: true,
  errorHandler (err, vm, stack) {
    console.log('An error occurred!')
    console.log('The error message was: ' + err.msg)
    console.log('And the stack trace was:')
    console.log(stack)
  }
})
```

You can pass `false` as the `errorHandler` in order to silently ignore rejected promises.

## License

MIT © [Benjamin Fox](https://github.com/foxbenjaminfox)
