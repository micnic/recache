'use strict';

const Cache = require('recache/lib/cache');

/**
 * @template D, T
 * @typedef {import('recache').CacheCallback<D, T>} CacheCallback
 */

/**
 * @typedef {import('recache').CacheOptions} CacheOptions
 */

/**
 * @template D, T
 * @param {[string, CacheOptions?, CacheCallback<D, T>?]} args
 */
module.exports = (...args) => new Cache(...args);