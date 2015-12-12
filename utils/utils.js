'use strict';

var fs = require('fs'),
	path = require('path');

var utils = exports;

// Add a new directory to the cache
utils.addDirectory = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Prepare the directory content
	utils.readDirectory(instance, location, function () {

		var timer = null,
			watcher = fs.watch(location, instance.options);

		// Emit the directory event
		instance.emit('directory', instance.container[rpath]);

		// Add the fs watcher to the list of watchers
		instance.watchers[rpath] = watcher;

		// Set fs watcher event listeners
		watcher.on('error', function () {
			this.close(); // silently close the fs watcher on errors
			delete instance.watchers[rpath];
		}).on('change', function () {

			// Clear the previous possible timer set
			clearTimeout(timer);

			// Set a timer to update the cache more rare than a second
			timer = setTimeout(function () {
				utils.updateElement(instance, location, function () {
					instance.emit('update');
				});
			}, 1000);
		});

		// Execute the callback
		callback();
	});
};

// Add a new file to the cache
utils.addFile = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Prepare the file content
	utils.readFile(instance, location, function () {

		// Emit the file event
		instance.emit('file', instance.container[rpath]);

		// Execute the callback
		callback();
	});
};

// Partial polyfill for ES6 Object.assign
utils.assign = function (target, source) {

	// Check if the source is an object and copy its properties
	if (utils.isObject(source)) {
		Object.keys(source).forEach(function (key) {
			target[key] = source[key];
		});
	}

	return target;
};

// Create a new object element in the cache container
utils.createElement = function (instance, location, stats) {
	instance.container[location] = {
		location: location,
		stats: stats
	};
};

// Check for an object value
utils.isObject = function (value) {
	return Object.prototype.toString.call(value) === '[object Object]';
};

// Read the content of the directory
utils.readDirectory = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Get the content of the directory
	fs.readdir(location, function (error, files) {

		var index = 0;

		// Get the next element in the directory
		function getNext() {

			var element = files[index],
				joined = '';

			// Check for a defined element and add it to the cache
			if (element) {

				// Update the current element
				joined = location + '/' + element;
				utils.updateElement(instance, joined, getNext);

				// Get the index of the next file
				index++;
			} else {
				callback();
			}
		}

		// Check for errors and begin to fetch directory elements
		if (error) {
			if (instance.container[rpath]) {
				utils.unlink(instance, rpath);
			} else {
				instance.emit('error', error);
			}
		} else if (!instance.destroyed) {
			instance.container[rpath].content = files;
			instance.emit('read', location);
			getNext();
		}
	});
};

// Read the content of the file
utils.readFile = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Get the content of the file
	fs.readFile(location, function (error, content) {
		if (error) {
			if (instance.container[rpath]) {
				utils.unlink(instance, rpath);
			} else {
				instance.emit('error', error);
			}
		} else if (!instance.destroyed) {
			instance.container[rpath].content = content;
			callback();
		}
	});
};

// Return a posix path which is relative to the root of the cache
utils.relative = function (instance, location) {
	return path.relative(instance.location, location).replace(/\\/g, '/');
};

// Remove the element from the location
utils.unlink = function (instance, location) {

	// Check if there is an element on the provided location
	if (instance.container[location]) {

		// Recursively remove the content of the directory
		if (instance.container[location].stats.isDirectory()) {
			instance.container[location].content.forEach(function (element) {
				utils.unlink(instance, location + '/' + element);
			});
		}

		// Emit the unlink event and remove the element object
		instance.emit('unlink', instance.container[location]);
		delete instance.container[location];
	}
};

// Update an existing directory
utils.updateDirectory = function (instance, location, callback) {

	var rpath = utils.relative(instance, location),
		stack = instance.container[rpath].content.slice();

	// Get the content of the directory and emit the change event
	utils.readDirectory(instance, location, function () {

		// Filter the removed elements and emit unlink events for them
		stack.filter(function (element) {
			return instance.container[rpath].content.indexOf(element) < 0;
		}).forEach(function (element) {

			var joined = location + '/' + element;

			utils.unlink(instance, utils.relative(instance, joined));
		});

		// Emit the change event and execute the callback
		instance.emit('change', instance.container[rpath]);
		callback();
	});
};

// Prepare a cache element
utils.updateElement = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Get the stats of the element
	fs.stat(location, function (error, stats) {

		var basename = path.basename(location),
			element = instance.container[rpath];

		// Check for possible errors
		if (error) {
			if (element) {
				utils.unlink(instance, rpath);
			} else {
				instance.emit('error', error);
			}
		} else if (!instance.destroyed) {

			// Prepare the object of the element
			if (element) {
				if (Number(element.stats.mtime) === Number(stats.mtime)) {
					if (stats.isDirectory()) {
						utils.readDirectory(instance, location, callback);
					} else {
						callback();
					}
				} else {

					// Update the current element stats
					element.stats = stats;

					// Update the cached object
					if (stats.isDirectory()) {
						utils.updateDirectory(instance, location, callback);
					} else {
						utils.updateFile(instance, location, callback);
					}
				}
			} else {

				// Filter the elements and add them to the cache
				if (stats.isDirectory() && instance.dirs.test(basename)) {
					utils.createElement(instance, rpath, stats);
					utils.addDirectory(instance, location, callback);
				} else if (stats.isFile() && instance.files.test(basename)) {
					utils.createElement(instance, rpath, stats);
					utils.addFile(instance, location, callback);
				} else {
					callback();
				}
			}
		}
	});
};

// Update an existing file
utils.updateFile = function (instance, location, callback) {

	var rpath = utils.relative(instance, location);

	// Get the content of the file and emit the change event
	utils.readFile(instance, location, function () {
		instance.emit('change', instance.container[rpath]);
		callback();
	});
};