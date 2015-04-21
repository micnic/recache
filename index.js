'use strict';

var events = require('events'),
	utils = require('recache/utils/utils');

// Recache prototype constructor
var recache = function (location, options, callback) {

	var filter = /^.+$/i,
		persistent = false,
		that = this;

	// Call events.EventEmitter in this context
	events.EventEmitter.call(this);

	// Make the options an optional argument
	if (typeof options === 'function') {
		callback = options;
		options = {};
	} else if (!utils.isObject(options)) {
		options = {};
	}

	// Use only regular expressions for filter
	if (options.filter !== undefined && !utils.isRegExp(options.filter)) {
		filter = RegExp(String(options.filter), 'i');
	}

	// Accept only true value for persistent
	if (options.persistent === true) {
		persistent = true;
	}

	// Transform the location in posix format
	location = location.replace(/\\/g, '/');

	// Define private properties for cache
	Object.defineProperties(this, {
		container: {
			value: {},
			writable: true
		},
		filter: {
			value: filter
		},
		location: {
			value: location,
			writable: true
		},
		options: {
			value: {
				persistent: persistent
			}
		},
		ready: {
			value: false,
			writable: true
		},
		watchers: {
			value: {},
			writable: true
		}
	});

	// Add the cached element
	utils.updateElement(this, location, function () {

		// Set the ready flag
		that.ready = true;

		// Execute the callback function
		if (typeof callback === 'function') {
			callback();
		}

		// Emit ready event
		that.emit('ready');
	});
};

// Inherit from events.EventEmitter
recache.prototype = Object.create(events.EventEmitter.prototype, {
	constructor: {
		value: recache
	}
});

// Destroy the cache data
recache.prototype.destroy = function () {

	var that = this;

	// Close the fs watchers
	Object.keys(this.watchers).forEach(function (key) {
		that.watchers[key].close();
	});

	// Reset the cache members
	this.container = null;
	this.location = '';
	this.watchers = null;
};

// Return the object representing the located element
recache.prototype.read = function (location) {

	var result = null;

	// Check for a valid location
	if (this.container) {
		if (typeof location === 'string' && this.container[location]) {
			result = this.container[location];
		} else if (location === undefined) {
			result = this.container[''];
		}
	}

	return result;
};

module.exports = function (location, options, callback) {
	return new recache(location, options, callback);
};