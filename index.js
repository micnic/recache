'use strict';

const Cache = require('recache/lib/cache');

/**
 * @typedef {import('recache').CacheCallback} CacheCallback
 * @typedef {import('recache').CacheOptions} CacheOptions
 * @typedef {import('recache/lib/cache').CacheArgs} CacheArgs
 */

/**
 * @param {CacheArgs} args
 */
module.exports = (...args) => new Cache(...args);