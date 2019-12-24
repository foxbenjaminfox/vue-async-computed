<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Changelog

- [v3.8.1](#v381)
- [v3.8.0](#v380)
- [v3.7.0](#v370)
- [v3.6.1](#v361)
- [v3.6.0](#v360)
- [v3.5.2](#v352)
- [v3.5.1](#v351)
- [v3.5.0](#v350)
- [v3.4.0](#v340)
- [v3.3.0](#v330)
- [v3.2.1](#v321)
- [v3.2.0](#v320)
- [v3.1.3](#v313)
- [v3.1.1](#v311)
- [v3.1.0](#v310)
- [v3.0.1](#v301)
- [v3.0.0](#v300)
- [v2.1.1](#v211)
- [v2.1.0](#v210)
- [v2.0.0](#v200)
- [v1.4.0](#v140)
- [v1.2.0](#v120)
- [v1.1.0](#v110)
- [v1.0.0](#v100)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

### v3.8.1
  * Bugfix release in order to actually publish the typescript types along with the pacakge.

### v3.8.0
  * [#83](https://github.com/foxbenjaminfox/vue-async-computed/pull/83) Stop the update method from working after the component is destroyed.
  * Include the long-requested ([#25](https://github.com/foxbenjaminfox/vue-async-computed/issues/25)) typescript types in the `master` branch.
  * [#85](https://github.com/foxbenjaminfox/vue-async-computed/pull/85) Add support in the typescript types for the array of strings version of `watch`.

### v3.7.0
  * [#68](https://github.com/foxbenjaminfox/vue-async-computed/pull/68) Refactoring to make some of the code be more readable.
  * [#71](https://github.com/foxbenjaminfox/vue-async-computed/pull/71) Add `vm` and `info` arguments to the error handler callback (when `useRawError` is set.)

### v3.6.1
  * Fix for browsers that don't support `Symbol.iterator`.

### v3.6.0
  * Fix bug in handling the argument to the generated `data` function.
  * [#66](https://github.com/foxbenjaminfox/vue-async-computed/pull/66) Add option for `watch` to be an array of property paths instead of a function.

### v3.5.2
  * Point to a pre-transpiled version of the library as the `module` field in package.json.

### v3.5.1
  * [#54](https://github.com/foxbenjaminfox/vue-async-computed/pull/54): Fix the missing execution context during recomputations triggered through the `.update` method in `$asyncComputed`.
  * [#58](https://github.com/foxbenjaminfox/vue-async-computed/pull/58): Fix the reactivity of the `$asyncComputed` object.
  * [#59](https://github.com/foxbenjaminfox/vue-async-computed/pull/59): Distribute also as an ESM module.

### v3.5.0
  * [#45](https://github.com/foxbenjaminfox/vue-async-computed/pull/45): add a status property `$asyncComputed` to each Vue instance with information about the status
    of its async computed properties.

### v3.4.0
  * Add a `shouldUpdate` option, which can control when and if
    an async computed property updates.

### v3.3.0
  * New feature: lazily computed properties.

### v3.2.1
  * Fix bugs with dev dependencies and the new package-lock.json file.
  * Tests on Travis now also run on Node 8.

### v3.2.0
  * Introduce `watch` feature.

### v3.1.3
  * Fix a bug where extra properties on `Object.prototype` would be
    considered relevent to `vue-async-computed`.

### v3.1.1
  * Fix bug where `vue-async-computed` wouldn't find async computed
    properties that were further up the prototype chain.

### v3.1.0
  * Add option for setting a global default value
  * Improve test coverage
  * Async computed properties that return a non-promise value no longer cause
    an error to be thrown. Instead that value is automaticly promoted to a
    promise with `Promise.resolve`.

### v3.0.1
  * More test cases

### v3.0.0
  * Pass the raw error to the error handler when passed the `useRawError` option.
  * Allow default values to be given as functions.

### v2.1.1
  * Automatic installation when used in a script tag.

### v2.1.0
  * Allow object syntax for defining computed properties.
  * Enable custom default values.

### v2.0.0
  * Now compatible with Vue 2.0.

### v1.4.0
  * Add CommonJS support.

### v1.2.0
  * Use the same strategy to merge `asyncComputed` objects as regular `computed` objects.

### v1.1.0

  * Handle errors in async computed properties.

### v1.0.0

 * Initial public version of the library.
