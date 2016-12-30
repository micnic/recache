'use strict';

const events = require('events');
const fs = require('fs');

class Cache extends events.EventEmitter {

	constructor(location, options, callback) {

		super();

		// Define cache properties
		Object.defineProperties(this, {
			container: {
				value: Object.create(null),
				writable: true
			},
			data: {
				enumerable: true,
				value: Object.create(null),
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
				value: Object.create(null),
				writable: true
			}
		});

		// Start caching the provided element
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

		// Allow multiple elements updates in the same time
		this.setMaxListeners(0);
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

			// Check if the instance is ready to emit changes
			if (instance.ready) {

				// Increase the number of changes made
				instance.changes++;

				// Emit the directory event
				instance.emit('directory', directory);
			}

			// Add the fs watcher to the list of watchers
			instance.watchers[location] = watcher;

			// Set the fs watcher event listeners
			watcher.on('error', (error) => {
				instance.emit('error', error);
				Cache.unlinkElement(instance, location);
			}).on('change', () => {
				Cache.startUpdate(instance, location);
			});

			// Execute the callback function
			callback();
		});
	}

	// Add a new file to the cache
	static addFile(instance, location, callback) {

		// Read the file content
		Cache.readFile(instance, location, () => {

			const file = instance.container[location];

			// Check if the instance is ready to emit changes
			if (instance.ready) {

				// Increase the number of changes made
				instance.changes++;

				// Emit the file event
				instance.emit('file', file);
			}

			// Check for file root element to add a fs watcher
			if (!location) {

				const watcher = fs.watch(instance.location, instance.options);

				// Add the fs watcher to the list of watchers
				instance.watchers[location] = watcher;

				// Set the fs watcher event listeners
				watcher.on('error', (error) => {
					instance.emit('error', error);
					Cache.unlinkElement(instance, location);
				}).on('change', () => {
					Cache.startUpdate(instance, location);
				});
			}

			// Execute the callback function
			callback();
		});
	}

	// Cache factory method
	static create(location, options, callback) {

		let filter = null;
		let persistent = true;

		// Check for if a valid location is provided
		if (typeof location !== 'string' || !location.length) {
			throw TypeError('"location" argument must be a non-empty string');
		}

		// Make the options and the callback optional arguments
		if (typeof options === 'function') {
			callback = options;
			options = null;
		} else if (options && typeof options === 'object') {

			// Get the persistent value
			persistent = (options.persistent !== false);

			// Get the filter function if it exists
			if (typeof options.filter === 'function') {
				filter = options.filter;
			}

			// Nullify callback argument if it is not a function
			if (typeof callback !== 'function') {
				callback = null;
			}
		} else {
			callback = null;
			options = null;
		}

		// Transform the location in posix format and remove trailing slashes
		location = location.replace(/\\/g, '/').replace(/\/+$/, '');

		// Prevent any mutation in the external options object
		options = Object.assign({
			filter,
			persistent
		}, options);

		return new Cache(location, options, callback);
	}

	// Iterate a directory and update all its child elements
	static iterateDirectory(instance, directory, callback) {

		const next = () => {
			if (directory.content[index]) {

				let clocation = directory.content[index];

				// Join the directory location with child location
				if (directory.location.length) {
					clocation = `${directory.location}/${clocation}`;
				}

				// Update the directory child element
				Cache.updateElement(instance, clocation, next);

				// Get the index of the next child element
				index++;
			} else {
				callback();
			}
		};

		let index = 0;

		// Start the iteration process
		next();
	}

	// Read the content of the directory
	static readDirectory(instance, location, callback) {

		let rlocation = instance.location;

		// If it is not the root element set the relative location
		if (location) {
			rlocation += `/${location}`;
		}

		// Get the content of the directory
		fs.readdir(rlocation, (error, files) => {

			// Check if the instance was not destroyed in the meanwhile
			if (instance.destroyed) {
				instance.emit('error', Error('Cache instance is destroyed'));
			} else {

				const directory = instance.container[location];

				// Check for errors and begin to fetch directory elements
				if (error) {

					// Emit the error to the instance
					instance.emit('error', error);

					// Unlink the directory
					Cache.unlinkElement(instance, location);

					// Continue process
					callback();
				} else {

					// Save directory content
					directory.content = files;

					// Update directory child elements
					Cache.iterateDirectory(instance, directory, callback);
				}
			}
		});
	}

	// Read the content of the file
	static readFile(instance, location, callback) {

		let rlocation = instance.location;

		// If it is not the root element set the relative location
		if (location) {
			rlocation += `/${location}`;
		}

		// Get the content of the file
		fs.readFile(rlocation, (error, content) => {

			// Check if the instance was not destroyed in the meanwhile
			if (instance.destroyed) {
				instance.emit('error', Error('Cache instance is destroyed'));
			} else {

				const file = instance.container[location];

				// Check for errors and continue to add the file content
				if (error) {

					// Emit the error to the instance
					instance.emit('error', error);

					// Unlink the file
					Cache.unlinkElement(instance, location);
				} else {

					// Save file content
					file.content = content;
				}

				// Execute the callback function
				callback();
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
			instance.once('release', () => {
				Cache.startUpdate(instance, location);
			});
		} else {

			instance.changes = 0;

			// Set the updating flag
			instance.updating = true;

			// Update the modified element
			Cache.updateElement(instance, location, () => {

				// Reset the updating flag
				instance.updating = false;

				// Emit the update event if any changes were made
				if (instance.changes) {
					instance.emit('update', instance);
				}

				// Emit the internal release event to call next updates in queue
				instance.emit('release');
			});
		}
	}

	// Remove the element from the cache container
	static unlinkElement(instance, location) {

		const element = instance.container[location];

		// Check if the element is inside the cache container
		if (element) {

			// Recursively remove the content of the directory
			if (element.stats.isDirectory()) {

				// Close and remove the directory file watcher
				instance.watchers[location].close();
				delete instance.watchers[location];

				// Remove each child of the directory
				element.content.forEach((clocation) => {

					// Check for non-root location
					if (location) {
						clocation = `${location}/${clocation}`;
					}

					// Unlink the child element
					Cache.unlinkElement(instance, clocation);
				});
			}

			// Remove the element object from the container object
			delete instance.container[location];

			// Increase the number of changes made
			instance.changes++;

			// Emit the unlink event
			instance.emit('unlink', element);
		}
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

					if (location) {
						child = `${location}/${child}`;
					}

					// Unlink the selected element
					Cache.unlinkElement(instance, child);
				}
			});

			// Increase the number of changes made
			instance.changes++;

			// Emit the change event
			instance.emit('change', directory);

			// Execute the callback function
			callback();
		});
	}

	// Prepare a cache element
	static updateElement(instance, location, callback) {

		let rlocation = instance.location;

		// If it is not the root element set the relative location
		if (location) {
			rlocation += `/${location}`;
		}

		// Get the stats of the element
		fs.stat(rlocation, (error, stats) => {

			// Check if the instance was not destroyed in the meanwhile
			if (!instance.destroyed) {

				const element = instance.container[location];
				const filter = instance.filter;

				// Check for possible errors
				if (error) {

					// Unlink the element
					Cache.unlinkElement(instance, location);

					// Continue process
					callback();
				} else if (element) {
					if (Number(element.stats.mtime) === Number(stats.mtime)) {
						if (stats.isDirectory()) {
							Cache.iterateDirectory(instance, element, callback);
						} else {
							callback();
						}
					} else {

						// Save element stats
						element.stats = stats;

						// Increase the number of changes made
						instance.changes++;

						// Update the cached object
						if (stats.isDirectory()) {
							Cache.updateDirectory(instance, location, callback);
						} else {
							Cache.updateFile(instance, location, callback);
						}
					}
				} else if (!location || !filter || filter(location, stats)) {

					// Create the element container
					instance.container[location] = Object.create(null);

					// Set element properties
					instance.container[location].content = null;
					instance.container[location].data = Object.create(null);
					instance.container[location].location = location;
					instance.container[location].stats = stats;

					// Increase the number of changes made
					instance.changes++;

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

		// Read the file content and emit change event if needed
		Cache.readFile(instance, location, () => {

			// Increase the number of changes made
			instance.changes++;

			// Emit change event
			instance.emit('change', instance.container[location]);

			// Execute the callback function
			callback();
		});
	}
}

module.exports = Cache;