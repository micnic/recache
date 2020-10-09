'use strict';

const Cache = require('recache/lib/cache');

/**
 * @typedef {import('recache').CacheCallback} CacheCallback
 * @typedef {import('recache').CacheOptions} CacheOptions
 */

/**
 * @param {[string, CacheOptions?, CacheCallback?]} args
 */
module.exports = (...args) => new Cache(...args);