<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
# Changelog

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
