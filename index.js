'use strict';

const Cache = require('recache/lib/cache');

/**
 * @typedef {import('recache')} recache
 */

/**
 * @type {recache}
 */
module.exports = (...args) => new Cache(...args);