'use strict';

var events = require('events'),
	utils = require('recache/utils/utils');

// Recache prototype constructor
var recache = function (location, options, callback) {

	var that = this;

	// Call events.EventEmitter in this context
	events.EventEmitter.call(this);

	// Set the default location
	if (typeof location !== 'string') {
		location = '';
	}

	// Make the options and the callback optional arguments
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	// Set the default options object
	options = utils.assign({}, options);

	// Use only regular expressions for filter
	if (typeof options.dirs === 'string') {
		options.dirs = RegExp(options.dirs, 'i');
	} else if (!(options.dirs instanceof RegExp)) {
		options.dirs = /^.+$/i;
	}

	// Use only regular expressions for filter
	if (typeof options.files === 'string') {
		options.files = RegExp(options.files, 'i');
	} else if (!(options.files instanceof RegExp)) {
		options.files = /^.+$/i;
	}

	// Accept only true value for persistent
	if (options.persistent !== true) {
		options.persistent = false;
	}

	// Transform the location in posix format
	location = location.replace(/\\/g, '/');

	// Define private properties for cache
	Object.defineProperties(this, {
		container: {
			value: {},
			writable: true
		},
		destroyed: {
			value: false,
			writable: true
		},
		dirs: {
			value: options.dirs
		},
		files: {
			value: options.files
		},
		location: {
			value: location,
			writable: true
		},
		options: {
			value: {
				persistent: options.persistent
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

	// Mark as destroyed
	this.destroyed = true;

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