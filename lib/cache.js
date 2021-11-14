'use strict';

const { EventEmitter } = require('events');
const {
	constants,
	promises,
	unwatchFile,
	watch,
	watchFile
} = require('fs');
const { isAbsolute, join } = require('path');
const rAssign = require('r-assign');
const {
	getType,
	isBigInt,
	isBoolean,
	isFunction,
	isInstanceOf,
	isNull,
	isObjectOf,
	isString,
	isUnionOf
} = require('r-assign/lib');

/**
 * @typedef {import('fs').FSWatcher} FSWatcher
 * @typedef {import('fs').BigIntStats} BigIntStats
 * @typedef {import('recache').Cache} CacheInterface
 * @typedef {import('recache').CacheElement} CacheElement
 * @typedef {import('recache').CacheElementType} CacheElementType
 * @typedef {import('recache').CacheOptions} CacheOptions
 * @typedef {import('recache').List} List
 * @typedef {import('recache').ListFilter} ListFilter
 * @typedef {import('recache').UserData} UserData
 */

/**
 * @typedef {|
 * [string] |
 * [string, CacheOptions] |
 * [string, CacheCallback] |
 * [string, CacheOptions, CacheCallback]
 * } CacheArgs
 */

/**
 * @typedef {(cache: Cache) => void} CacheCallback
 */

const { isArray } = Array;
const { assign } = Object;
const { S_IFDIR, S_IFMT, S_IFREG } = constants;
const { cwd } = process;
const { lstat, readdir, readFile } = promises;

const changeEvent = 'change';
const cacheDestroyed = 'Cache instance is destroyed';
const destroyEvent = 'destroy';
const directoryType = 'directory';
const errorEvent = 'error';
const fileType = 'file';
const invalidLocationType = '"location" argument must be a string';
const invalidPathType = '"path" argument must be a non-empty string';
const readyEvent = 'ready';
const releaseEvent = 'release';
const rootSymbol = '<root>';
const solidus = '/';
const unknownElement = 'Unknown file system element';
const unlinkEvent = 'unlink';
const updateEvent = 'update';
const watchEvent = 'watch';

const rootSymbolLength = rootSymbol.length;

/** @type {{ [key: number]: CacheElementType }} */
const types = {
	[S_IFDIR]: directoryType,
	[S_IFREG]: fileType
};

/**
 * Get the cache callback
 * @param {unknown} options
 * @param {unknown} callback
 * @returns {((cache: Cache) => void) | null}
 */
const getCallback = (options, callback) => {

	const isCacheCallback = isFunction([isInstanceOf(Cache)]);

	// Get the cache callback from options parameter
	if (isCacheCallback(options)) {
		return options;
	}

	// Get the cache callback from callback parameter
	if (isCacheCallback(callback)) {
		return callback;
	}

	return null;
};

/**
 * Get the cache options
 * @param {unknown} options
 * @returns {Required<CacheOptions>}
 */
const getOptions = (options) => {

	const isBigIntStats = isObjectOf({
		mode: isBigInt,
		mtimeMs: isBigInt
	});

	const isCacheFilter = isFunction([isString, isBigIntStats], isBoolean);

	return rAssign({
		filter: getType(isUnionOf([isCacheFilter, isNull]), null),
		persistent: getType(isBoolean, false),
		store: getType(isBoolean, false)
	}, options);
};

/**
 * Get the absolute path for the cache
 * @param {unknown} path
 * @returns {string}
 */
const getPath = (path) => {

	// Check for invalid path type
	if (!isString(path) || path.length === 0) {
		throw TypeError(invalidPathType);
	}

	// Return absolute path
	if (!isAbsolute(path)) {
		return join(cwd(), path);
	}

	return path;
};

/**
 * Cache
 * @implements {CacheInterface}
 */
class Cache extends EventEmitter {

	/**
	 * Cache constructor
	 * @param {CacheArgs} args
	 */
	constructor(...args) {

		const [path, options, callback] = args;
		const { filter, persistent, store } = getOptions(options);

		super();

		// Define public properties
		/** @type {UserData} */
		this.data = {};
		this.path = getPath(path);

		// Define private properties
		this._changed = false;
		/** @type {Map<string, CacheElement>} */
		this._container = new Map();
		this._store = store;
		this._destroyed = false;
		this._filter = filter;
		/** @type {(() => void) | null} */
		this._listener = null;
		this._options = {
			persistent
		};
		this._ready = false;
		this._updating = false;
		/** @type {Map<string, FSWatcher>} */
		this._watchers = new Map();
		this._watching = false;

		// Allow multiple elements updates in the same time
		this.setMaxListeners(0);

		// Start watching process
		this.start(getCallback(options, callback));
	}

	/**
	 * Destroy the cache data
	 * @param {() => void} [callback]
	 */
	destroy(callback) {

		// Check if the cache is not already destroyed
		if (!this._destroyed) {

			// Mark as destroyed
			this._destroyed = true;

			// Reset cache properties
			this._changed = false;
			this._listener = null;
			this._ready = false;
			this._updating = false;

			// Stop watching process
			this.stop();

			// Clear the elements container
			this._container.clear();

			// Emit the destroy event a bit later
			setImmediate(() => {
				this.emit(destroyEvent);

				// Call the provided callback
				if (typeof callback === 'function') {
					callback();
				}
			});
		}
	}

	/**
	 * Return the object representing the located element
	 * @param {string} [location]
	 * @returns {CacheElement | null}
	 */
	get(location = rootSymbol) {

		const element = this._container.get(Cache.normalizeLocation(location));

		// Check if the element is available
		if (element) {
			return element;
		}

		return null;
	}

	/**
	 * Check if the cache contains an element on the provided location
	 * @param {string} location
	 * @returns {boolean}
	 */
	has(location) {

		const key = Cache.normalizeLocation(location);

		return (!this._destroyed && this._container.has(key));
	}

	/**
	 * Return the list of readable paths
	 * @param {ListFilter} [filter]
	 * @returns {List}
	 */
	list(filter) {

		// Check if the cache is destroyed
		if (this._destroyed) {
			return [];
		}

		const list = [...this._container.keys()];

		// Apply the filter function if it is defined
		if (typeof filter === 'function') {
			return list.filter(filter);
		}

		return list;
	}

	/**
	 * Start the watching process
	 * @param {CacheCallback | null} [callback]
	 */
	start(callback) {
		if (!this._destroyed && !this._watching) {
			this._watching = true;

			// Start preparing the cache
			Cache.prepareCache(this, callback);
		}

		return this;
	}

	/**
	 * Stop the watching process
	 */
	stop() {
		if (!this._destroyed && this._watching) {
			this._watching = false;

			// Stop watching the root path for changes
			if (this._listener) {
				unwatchFile(this.path, this._listener);
			}

			// Close the fs watchers
			this._watchers.forEach((watcher) => {
				watcher.close();
			});

			// Clear the fs watchers container
			this._watchers.clear();
		}

		return this;
	}

	/**
	 * Add a file system watcher for the provided element path and location
	 * @param {Cache} cache
	 * @param {string} path
	 * @param {string} location
	 */
	static addWatcher(cache, path, location) {

		if (cache._watching) {

			const watcher = watch(path, cache._options);

			// Add the fs watcher to the list of watchers
			cache._watchers.set(location, watcher);

			// Set the fs watcher event listeners
			watcher.on(errorEvent, (error) => {
				Cache.emitElementError(cache, location, error);
			}).on(changeEvent, () => {
				Cache.listenChange(cache, location);
			});

			// Watch root location for rename, move or remove
			if (location === rootSymbol) {

				// Create and save root change listener
				cache._listener = () => {
					Cache.listenChange(cache, rootSymbol);
				};

				// Watch provided path for changes
				watchFile(path, cache._options, cache._listener);
			}

			// Emit the watched path
			cache.emit(watchEvent, path);
		}
	}

	/**
	 * Create a new cache element, add a watcher if needed and emit the element
	 * @param {Cache} cache
	 * @param {string} path
	 * @param {string} location
	 * @param {BigIntStats} stats
	 */
	static async createElement(cache, path, location, stats) {

		const type = types[Number(stats.mode) & S_IFMT];

		// Check for unknown element type
		if (!type) {
			throw Error(unknownElement);
		}

		/** @type {CacheElement} */
		const element = {
			content: await Cache.getContent(cache, type, path, location),
			data: {},
			location,
			path,
			stats,
			type
		};

		// Add the element to the container
		cache._container.set(location, element);

		// Check if the cache is ready to emit changes
		if (cache._ready) {

			// Set the changed flag
			cache._changed = true;

			// Emit the element event
			cache.emit(element.type, element);
		}

		// Add the watcher for directories or root file element
		if (type === directoryType || location === rootSymbol) {
			Cache.addWatcher(cache, path, location);
		}
	}

	/**
	 * Emit error to the cache and unlink element
	 * @param {Cache} cache
	 * @param {string} location
	 * @param {Error} error
	 * @returns {Promise<void>}
	 */
	static emitElementError(cache, location, error) {

		return new Promise((resolve) => {

			// Emit the error a bit later
			setImmediate(() => {

				// Do not emit errors if cache was already destroyed
				if (!cache._destroyed) {

					// Emit the error to the cache
					cache.emit(errorEvent, error);

					// Unlink the element
					Cache.unlinkElement(cache, location);
				}

				resolve();
			});
		});
	}

	/**
	 * @param {Cache} cache
	 * @param {CacheElementType} type
	 * @param {string} path
	 * @param {string} location
	 * @return {Promise<Buffer|string[]|null>}
	 */
	static getContent(cache, type, path, location) {

		return Cache.contentBehaviors[type](cache, path, location);
	}

	/**
	 * Get the content of the directory
	 * @param {Cache} cache
	 * @param {string} path
	 * @param {string} location
	 * @returns {Promise<string[] | null>}
	 */
	static async getDirectoryContent(cache, path, location) {

		// Try to save the directory content
		try {

			const content = await readdir(path);

			// Check for destroyed cache
			if (cache._destroyed) {
				throw Error(cacheDestroyed);
			}

			// Update directory child elements
			await Cache.iterateDirectory(cache, location, content);

			return content;
		} catch (error) {
			if (error instanceof Error) {
				await Cache.emitElementError(cache, location, error);
			}
		}

		return null;
	}

	/**
	 * Get the content of the file
	 * @param {Cache} cache
	 * @param {string} path
	 * @param {string} location
	 * @returns {Promise<Buffer | null>}
	 */
	static async getFileContent(cache, path, location) {

		// Check if the content of the file should be saved in the cache
		if (cache._store) {

			// Try to save the file content
			try {
				const content = await readFile(path);

				// Check for destroyed cache
				if (cache._destroyed) {
					throw Error(cacheDestroyed);
				}

				return content;
			} catch (error) {
				if (error instanceof Error) {
					await Cache.emitElementError(cache, location, error);
				}
			}
		}

		return null;
	}

	/**
	 * Check if the provided path should be added to the cache
	 * @param {Cache} cache
	 * @param {string} path
	 * @param {BigIntStats} stats
	 * @returns {boolean}
	 */
	static isPathAccepted(cache, path, stats) {

		// Check for cache filter
		if (typeof cache._filter === 'function') {
			return cache._filter(path, stats);
		}

		return true;
	}

	/**
	 * Iterate a directory and update all its child elements
	 * @param {Cache} cache
	 * @param {string} location
	 * @param {string[]} content
	 * @param {number} [index]
	 * @returns {Promise<void>}
	 */
	static async iterateDirectory(cache, location, content, index = 0) {

		// Check for existing iterated element
		if (index < content.length) {

			const child = location + solidus + content[index];

			// Update the directory child element
			await Cache.updateLocation(cache, child);

			// Continue to the next child
			await Cache.iterateDirectory(cache, location, content, index + 1);
		}
	}

	/**
	 * Listener for changes
	 * @param {Cache} cache
	 * @param {string} location
	 */
	static async listenChange(cache, location) {

		// Wait for the cache to be released
		await Cache.whenReleased(cache);

		// Continue change update only if the cache is not destroyed
		if (!cache._destroyed) {

			// Reset the changed flag
			cache._changed = false;

			// Set the updating flag
			cache._updating = true;

			// Update the modified element
			await Cache.updateLocation(cache, location);

			// Reset the updating flag
			cache._updating = false;

			// Emit the update event if any changes were made
			if (cache._changed) {
				cache.emit(updateEvent, cache);
			}

			// Emit the internal release event
			cache.emit(releaseEvent);
		}
	}

	/**
	 * Normalize location to use ${rootSymbol}/${location} structure
	 * @param {string} location
	 * @returns {string}
	 */
	static normalizeLocation(location) {

		// Check for valid location
		if (typeof location !== 'string') {
			throw TypeError(invalidLocationType);
		}

		// Check for empty string provided
		if (location.length === 0 || location === solidus) {
			return rootSymbol;
		}

		// Check for location started with root notation
		if (location.startsWith(rootSymbol)) {
			return location;
		}

		// Check for location started with root slash
		if (location.startsWith(solidus)) {
			return rootSymbol + location;
		}

		return rootSymbol + solidus + location;
	}

	/**
	 * Initiate cache
	 * @param {Cache} cache
	 * @param {CacheCallback | null} [callback]
	 * @returns {Promise<void>}
	 */
	static async prepareCache(cache, callback) {

		// Start caching the provided element
		await Cache.updateLocation(cache, rootSymbol);

		// Check if the cache does not have a root element to destroy it
		if (!cache.has(rootSymbol)) {
			cache.destroy();
		}

		// Check if the cache was not destroyed in the meanwhile
		if (!cache._destroyed) {

			// Set the ready flag
			cache._ready = true;

			// Execute the callback function
			if (typeof callback === 'function') {
				callback.call(cache, cache);
			}

			// Emit ready event
			cache.emit(readyEvent, cache);

			// Emit the internal release event to call next updates
			cache.emit(releaseEvent);
		}
	}

	/**
	 * Remove the element from the cache container
	 * @param {Cache} cache
	 * @param {string} location
	 */
	static unlinkElement(cache, location) {

		const element = cache.get(location);

		// Check if the element is inside the cache container
		if (element) {

			const { content, type } = element;

			// Recursively remove the content of the directory
			if (type === directoryType && isArray(content)) {

				const watchers = cache._watchers;
				const watcher = watchers.get(location);

				// Close and remove the directory file watcher
				if (watcher) {
					watcher.close();
					watchers.delete(location);
				}

				// Remove each child of the directory
				content.forEach((child) => {

					// Unlink the child element
					Cache.unlinkElement(cache, location + solidus + child);
				});
			}

			// Remove the element object from the container object
			cache._container.delete(location);

			// Set the changed flag
			cache._changed = true;

			// Emit the unlink event
			cache.emit(unlinkEvent, element);

			// Check for root element and destroy cache
			if (location === rootSymbol) {
				cache.destroy();
			}
		}
	}

	/**
	 * Update an existing element
	 * @param {Cache} cache
	 * @param {CacheElement} element
	 * @param {BigIntStats} stats
	 * @returns {Promise<void>}
	 */
	static async updateElement(cache, element, stats) {

		const { content, location, path, type } = element;
		const newContent = await Cache.getContent(cache, type, path, location);

		// Update element content and stats
		assign(element, {
			content: newContent,
			stats
		});

		// Set changed cache
		cache._changed = true;

		// Filter the removed elements from directory and unlink them
		if (type === directoryType && isArray(content) && isArray(newContent)) {
			content.forEach((child) => {

				// Check if child is still existing
				if (!newContent.includes(child)) {

					// Unlink the selected element
					Cache.unlinkElement(cache, location + solidus + child);
				}
			});
		}

		// Emit change event
		cache.emit(changeEvent, element);
	}

	/**
	 * Check location and update it based on its stats
	 * @param {Cache} cache
	 * @param {string} location
	 * @returns {Promise<void>}
	 */
	static async updateLocation(cache, location) {

		// Try to get elements stats
		try {

			const path = join(cache.path, location.slice(rootSymbolLength));
			const stats = await lstat(path, { bigint: true });

			// Check for destroyed cache
			if (cache._destroyed) {
				throw Error(cacheDestroyed);
			}

			// Check for valid element
			if (stats.isDirectory() || stats.isFile()) {

				const element = cache.get(location);

				// Check for available element
				if (element) {

					const { content } = element;

					// Check if element stats modified time changed
					if (element.stats.mtimeMs !== stats.mtimeMs) {
						await Cache.updateElement(cache, element, stats);
					} else if (isArray(content)) {
						await Cache.iterateDirectory(cache, location, content);
					}
				} else if (Cache.isPathAccepted(cache, path, stats)) {
					await Cache.createElement(cache, path, location, stats);
				}
			}
		} catch (error) {

			// Emit element error and unlink it
			if (error instanceof Error) {
				await Cache.emitElementError(cache, location, error);
			}
		}
	}

	/**
	 * Await for cache cache to be releases
	 * @param {Cache} cache
	 * @returns {Promise<void>}
	 */
	static whenReleased(cache) {

		return new Promise((resolve) => {
			if (!cache._ready || cache._updating) {
				cache.once(releaseEvent, async () => {

					// Recursive check for cache to be released
					await Cache.whenReleased(cache);

					// Resolve current promise
					resolve();
				});
			} else {
				resolve();
			}
		});
	}
}

// Define cache content behaviors
Cache.contentBehaviors = {
	directory: Cache.getDirectoryContent,
	file: Cache.getFileContent
};

module.exports = Cache;