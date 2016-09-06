'use strict';

const events = require('events');
const fs = require('fs');

class Cache extends events.EventEmitter {

	constructor(location, options, callback) {

		super();

		// Define cache properties
		Object.defineProperties(this, {
			container: {
				value: {},
				writable: true
			},
			data: {
				enumerable: true,
				value: {},
				writable: true
			},
			destroyed: {
				value: false,
				writable: true
			},
			filter: {
				value: options.filter,
				writable: true
			},
			location: {
				value: location,
				writable: true
			},
			options: {
				value: {
					persistent: options.persistent
				},
				writable: true
			},
			ready: {
				value: false,
				writable: true
			},
			updating: {
				value: false,
				writable: true
			},
			watchers: {
				value: {},
				writable: true
			}
		});

		// Seal cache object to prevent extensions
		Object.seal(this);

		// Add the cached element
		Cache.updateElement(this, '', () => {

			// Set the ready flag
			this.ready = true;

			// Execute the callback function
			if (typeof callback === 'function') {
				callback.call(this, this);
			}

			// Emit ready event
			this.emit('ready', this);
		});
	}

	// Destroy the cache data
	destroy() {

		// Check if the cache is not destroyed
		if (!this.destroyed) {

			// Close the fs watchers
			Object.keys(this.watchers).forEach((key) => {
				this.watchers[key].close();
			});

			// Mark as destroyed
			this.destroyed = true;

			// Reset the cache members
			this.container = null;
			this.data = null;
			this.filter = null;
			this.location = null;
			this.options = null;
			this.ready = null;
			this.updating = null;
			this.watchers = null;
		}
	}

	// Return the list of readable locations
	list(filter) {

		let list = [];

		// Check if the cache is not destroyed
		if (!this.destroyed) {

			// Prepare the list of cached elements
			list = Object.keys(this.container);

			// Apply the filter function if it is defined
			if (typeof filter === 'function') {
				list = list.filter(filter);
			}
		}

		return list;
	}

	// Return the object representing the located element
	read(location) {

		let result = null;

		// Check if the cache is not destroyed
		if (!this.destroyed) {

			// Check for a valid location
			if (typeof location !== 'string') {
				location = '';
			}

			// Remove the leading slash from the location string
			if (location[0] === '/') {
				location = location.substr(1);
			}

			// Check if the element is located in the cache
			if (this.container[location]) {
				result = this.container[location];
			}
		}

		return result;
	}

	// Add a new directory to the cache
	static addDirectory(instance, location, callback) {

		// Prepare the directory content
		Cache.readDirectory(instance, location, () => {

			const directory = instance.container[location];
			const rlocation = `${instance.location}/${location}`;
			const watcher = fs.watch(rlocation, instance.options);

			// Emit the directory event if the instance is ready
			if (instance.ready) {
				instance.emit('directory', directory);
			}

			// Add the fs watcher to the list of watchers
			instance.watchers[location] = watcher;

			// Set the fs watcher event listeners
			/* istanbul ignore next: do not test watcher events */
			watcher.on('error', (error) => {
				instance.emit('error', error);
				Cache.unlink(instance, directory);
			}).on('change', () => {
				Cache.startUpdate(instance, location);
			});

			// Execute the callback
			callback();
		});
	}

	// Add a new file to the cache
	static addFile(instance, location, callback) {

		// Read the file content
		Cache.readFile(instance, location, () => {

			// Emit the file event if the instance is ready
			if (instance.ready) {
				instance.emit('file', instance.container[location]);
			}

			// Execute the callback
			callback();
		});
	}

	// Cache factory method
	static create(location, options, callback) {

		// Check for if a valid location is provided
		if (typeof location !== 'string' || !location.length) {
			throw TypeError('"location" argument must be a non-empty string');
		}

		let filter = null;
		let persistent = true;

		// Make the options and the callback optional arguments
		if (typeof options === 'function') {
			callback = options;
			options = null;
		} else if (options && typeof options === 'object') {

			// Get the filter function if it exists
			if (typeof options.filter === 'function') {
				filter = options.filter;
			}

			// Get the persistent value
			persistent = (options.persistent !== false);
		}

		// Transform the location in posix format
		location = location.replace(/\\/g, '/');

		// Prevent any mutation in the external options object
		options = Object.assign(Object.seal({
			filter,
			persistent
		}), options);

		return new Cache(location, options, callback);
	}

	// Read the content of the directory
	static readDirectory(instance, location, callback) {

		// Get the content of the directory
		fs.readdir(`${instance.location}/${location}`, (error, files) => {

			// Check if the instance was not destroyed in the meanwhile
			if (!instance.destroyed) {

				const directory = instance.container[location];

				// Check for errors and begin to fetch directory elements
				if (error) {

					// Emit the error to the instance
					instance.emit('error', error);

					// Unlink the directory if it is in the cache
					if (directory) {
						Cache.unlink(instance, directory);
					}

					// Continue process
					callback();
				} else {

					let index = 0;

					const getNext = function () {
						if (files[index]) {

							let clocation = files[index];

							// Join the directory location with child location
							if (location.length) {
								clocation = `${location}/${clocation}`;
							}

							// Update the directory child element
							Cache.updateElement(instance, clocation, getNext);
							index++;
						} else {
							callback();
						}
					};

					// Save directory content
					directory.content = files;

					// Start updating directory child elements
					getNext();
				}
			} else {
				instance.emit('error', Error('Cache instance is destroyed'));
			}
		});
	}

	// Read the content of the file
	static readFile(instance, location, callback) {

		// Get the content of the file
		fs.readFile(`${instance.location}/${location}`, (error, content) => {

			// Check if the instance was not destroyed in the meanwhile
			if (!instance.destroyed) {

				const file = instance.container[location];

				// Check for errors and continue to add the file content
				if (error) {

					// Emit the error to the instance
					instance.emit('error', error);

					// Unlink the file if it is in the cache
					if (file) {
						Cache.unlink(instance, file);
					}

					// Continue process
					callback();
				} else {
					file.content = content;
					callback();
				}
			} else {
				instance.emit('error', Error('Cache instance is destroyed'));
			}
		});
	}

	// Start updating the cache instance
	static startUpdate(instance, location) {

		// Block updating if the instance is not ready or is already updating
		if (!instance.ready) {
			instance.once('ready', () => {
				Cache.startUpdate(instance, location);
			});
		} else if (instance.updating) {
			instance.once('update', () => {
				Cache.startUpdate(instance, location);
			});
		} else {

			// Set the updating flag
			instance.updating = true;

			// Update the root element
			Cache.updateElement(instance, location, () => {
				instance.updating = false;
				instance.emit('update', instance);
			});
		}
	}

	// Remove the element from the cache container
	static unlink(instance, element) {

		// Recursively remove the content of the directory
		if (element.stats.isDirectory()) {

			// Close and remove the directory file watcher
			instance.watchers[element.location].close();
			delete instance.watchers[element.location];

			// Remove each child of the directory
			element.content.forEach((child) => {

				const location = `${element.location}/${child}`;

				// Unlink the child element
				Cache.unlink(instance, instance.container[location]);
			});
		}

		// Remove the element object from the container object
		delete instance.container[element.location];

		// Emit the unlink event
		instance.emit('unlink', element);
	}

	// Update an existing directory
	static updateDirectory(instance, location, callback) {

		const directory = instance.container[location];
		const prev = directory.content.slice();

		// Get the content of the directory and emit the change event
		Cache.readDirectory(instance, location, () => {

			// Filter the removed elements and unlink them
			prev.forEach((child) => {

				// Check if child is still existing
				if (directory.content.indexOf(child) < 0) {

					const clocation = `${location}/${child}`;

					// Unlink the selected element
					Cache.unlink(instance, instance.container[clocation]);
				}
			});

			// Emit the change event and execute the callback
			instance.emit('change', directory);
			callback();
		});
	}

	// Prepare a cache element
	static updateElement(instance, location, callback) {

		// Get the stats of the element
		fs.stat(`${instance.location}/${location}`, (error, stats) => {

			// Check if the instance was not destroyed in the meanwhile
			if (!instance.destroyed) {

				const element = instance.container[location];
				const filter = instance.filter;

				// Check for possible errors
				if (error) {

					// Emit the error to the instance
					instance.emit('error', error);

					// Unlink the element if it is in the cache
					if (element) {
						Cache.unlink(instance, element);
					}

					// Continue process
					callback();
				} else if (element) {
					if (Number(element.stats.mtime) === Number(stats.mtime)) {
						if (stats.isDirectory()) {
							Cache.readDirectory(instance, location, callback);
						} else {
							callback();
						}
					} else {

						// Update the current element stats
						element.stats = stats;

						// Update the cached object
						if (stats.isDirectory()) {
							Cache.updateDirectory(instance, location, callback);
						} else {
							Cache.updateFile(instance, location, callback);
						}
					}
				} else if (!filter || filter(location, stats)) {

					// Create the element
					instance.container[location] = {};

					// Define element properties
					Object.defineProperties(instance.container[location], {
						content: {
							enumerable: true,
							value: null,
							writable: true
						},
						data: {
							enumerable: true,
							value: {},
							writable: true
						},
						location: {
							enumerable: true,
							value: location
						},
						stats: {
							enumerable: true,
							value: stats
						}
					});

					// Seal element object to prevent extensions
					Object.seal(instance.container[location]);

					// Add the element based on its type
					if (stats.isDirectory()) {
						Cache.addDirectory(instance, location, callback);
					} else {
						Cache.addFile(instance, location, callback);
					}
				} else {
					callback();
				}
			} else {
				instance.emit('error', Error('Cache instance is destroyed'));
			}
		});
	}

	// Update an existing file
	static updateFile(instance, location, callback) {

		// Read the file content, emit the change event and execute the callback
		Cache.readFile(instance, location, () => {
			instance.emit('change', instance.container[location]);
			callback();
		});
	}
}

module.exports = Cache;