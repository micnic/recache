import { EventEmitter } from 'events';
import { BigIntStats } from 'fs';

type CacheDirectoryContent = string[];
type CacheFileContent = Buffer | null;
type DirectoryType = 'directory';
type FileType = 'file';

declare namespace recache {
	type CacheElementType = DirectoryType | FileType;
	type UserData = Record<string, any>;

	type CacheElementCommons = {
		/**
		 * Container to store user data
		 */
		data: UserData;

		/**
		 * Internal location of the cache element inside the cache
		 */
		location: string;

		/**
		 * Absolute path of the cache element in file system
		 */
		path: string;

		/**
		 * File system stats of the cache element
		 */
		stats: BigIntStats;
	};

	type CacheDirectory = CacheElementCommons & {
		/**
		 * Content of the cache directory
		 */
		content: CacheDirectoryContent;

		/**
		 * Type of the cache element
		 */
		type: DirectoryType;
	};

	type CacheElement = CacheElementCommons & {
		/**
		 * Content of the cache element
		 */
		content: CacheDirectoryContent | CacheFileContent;

		/**
		 * Type of the cache element
		 */
		type: CacheElementType;
	};

	type CacheFile = CacheElementCommons & {
		/**
		 * Content of the cache file
		 */
		content: CacheFileContent;

		/**
		 * Type of the cache element
		 */
		type: FileType;
	};

	type CacheFilter = (path: string, stats: BigIntStats) => boolean;

	type CacheOptions = Partial<{
		/**
		 * Filter for cached elements, by default all elements are cached
		 */
		filter: CacheFilter;

		/**
		 * Flag to enable persistence of file system watchers
		 * @default false
		 */
		persistent: boolean;

		/**
		 * Flag to enable file content saving
		 * @default false
		 */
		store: boolean;
	}>;

	type List = string[];
	type ListFilter = (location: string, index: number, list: List) => boolean;
	type VoidListener = () => void;
	type CacheDirectoryListener = (directory: Readonly<CacheDirectory>) => void;
	type CacheFileListener = (file: Readonly<CacheFile>) => void;
	type CacheElementListener = (element: Readonly<CacheElement>) => void;
	type ErrorListener = (error: Error) => void;

	interface Cache extends EventEmitter {
		/**
		 * Container to store user data
		 */
		readonly data: UserData;

		/**
		 * Path of the cache
		 */
		readonly path: string;

		/**
		 * Destroy the cache data
		 */
		destroy(): void;

		/**
		 * Return the object representing the located element
		 */
		get(location?: string): Readonly<CacheElement> | null;

		/**
		 * Check if the cache contains an element on the provided location
		 */
		has(location: string): boolean;

		/**
		 * Return the list of readable locations
		 */
		list(filter?: ListFilter): List;

		/**
		 * Add a listener for change event
		 */
		addListener(event: 'change', listener: CacheElementListener): this;

		/**
		 * Add a listener for destroy event
		 */
		addListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add a listener for directory event
		 */
		addListener(event: 'directory', listener: CacheDirectoryListener): this;

		/**
		 * Add a listener for error event
		 */
		addListener(event: 'error', listener: ErrorListener): this;

		/**
		 * Add a listener for file event
		 */
		addListener(event: 'file', listener: CacheFileListener): this;

		/**
		 * Add a listener for ready event
		 */
		addListener(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Add a listener for unlink event
		 */
		addListener(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Add a listener for update event
		 */
		addListener(event: 'update', listener: (cache: Cache) => void): this;

		/**
		 * Remove a listener for change event
		 */
		off(event: 'change', listener: CacheElementListener): this;

		/**
		 * Remove a listener for destroy event
		 */
		off(event: 'destroy', listener: VoidListener): this;

		/**
		 * Remove a listener for directory event
		 */
		off(event: 'directory', listener: CacheDirectoryListener): this;

		/**
		 * Remove a listener for error event
		 */
		off(event: 'error', listener: ErrorListener): this;

		/**
		 * Remove a listener for file event
		 */
		off(event: 'file', listener: CacheFileListener): this;

		/**
		 * Remove a listener for ready event
		 */
		off(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Remove a listener for unlink event
		 */
		off(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Remove a listener for update event
		 */
		off(event: 'update', listener: (cache: Cache) => void): this;

		/**
		 * Add a listener for change event
		 */
		on(event: 'change', listener: CacheElementListener): this;

		/**
		 * Add a listener for destroy event
		 */
		on(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add a listener for directory event
		 */
		on(event: 'directory', listener: CacheDirectoryListener): this;

		/**
		 * Add a listener for error event
		 */
		on(event: 'error', listener: ErrorListener): this;

		/**
		 * Add a listener for file event
		 */
		on(event: 'file', listener: CacheFileListener): this;

		/**
		 * Add a listener for ready event
		 */
		on(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Add a listener for unlink event
		 */
		on(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Add a listener for update event
		 */
		on(event: 'update', listener: (cache: Cache) => void): this;

		/**
		 * Add an one-time listener for change event
		 */
		once(event: 'change', listener: CacheElementListener): this;

		/**
		 * Add an one-time listener for destroy event
		 */
		once(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add an one-time listener for directory event
		 */
		once(event: 'directory', listener: CacheDirectoryListener): this;

		/**
		 * Add an one-time listener for error event
		 */
		once(event: 'error', listener: ErrorListener): this;

		/**
		 * Add an one-time listener for file event
		 */
		once(event: 'file', listener: CacheFileListener): this;

		/**
		 * Add an one-time listener for ready event
		 */
		once(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Add an one-time listener for unlink event
		 */
		once(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Add an one-time listener for update event
		 */
		once(event: 'update', listener: (cache: Cache) => void): this;

		/**
		 * Prepend a listener for change event
		 */
		prependListener(event: 'change', listener: CacheElementListener): this;

		/**
		 * Prepend a listener for destroy event
		 */
		prependListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Prepend a listener for directory event
		 */
		prependListener(
			event: 'directory',
			listener: CacheDirectoryListener
		): this;

		/**
		 * Prepend a listener for error event
		 */
		prependListener(event: 'error', listener: ErrorListener): this;

		/**
		 * Prepend a listener for file event
		 */
		prependListener(event: 'file', listener: CacheFileListener): this;

		/**
		 * Prepend a listener for ready event
		 */
		prependListener(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Prepend a listener for unlink event
		 */
		prependListener(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Prepend a listener for update event
		 */
		prependListener(
			event: 'update',
			listener: (cache: Cache) => void
		): this;

		/**
		 * Prepend an one-time listener for change event
		 */
		prependOnceListener(
			event: 'change',
			listener: CacheElementListener
		): this;

		/**
		 * Prepend an one-time listener for destroy event
		 */
		prependOnceListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Prepend an one-time listener for directory event
		 */
		prependOnceListener(
			event: 'directory',
			listener: CacheDirectoryListener
		): this;

		/**
		 * Prepend an one-time listener for error event
		 */
		prependOnceListener(event: 'error', listener: ErrorListener): this;

		/**
		 * Prepend an one-time listener for file event
		 */
		prependOnceListener(event: 'file', listener: CacheFileListener): this;

		/**
		 * Prepend an one-time listener for ready event
		 */
		prependOnceListener(
			event: 'ready',
			listener: (cache: Cache) => void
		): this;

		/**
		 * Prepend an one-time listener for unlink event
		 */
		prependOnceListener(
			event: 'unlink',
			listener: CacheElementListener
		): this;

		/**
		 * Prepend an one-time listener for update event
		 */
		prependOnceListener(
			event: 'update',
			listener: (cache: Cache) => void
		): this;

		/**
		 * Remove all listeners for change event
		 */
		removeAllListeners(event: 'change'): this;

		/**
		 * Remove all listeners for destroy event
		 */
		removeAllListeners(event: 'destroy'): this;

		/**
		 * Remove all listeners for directory event
		 */
		removeAllListeners(event: 'directory'): this;

		/**
		 * Remove all listeners for error event
		 */
		removeAllListeners(event: 'error'): this;

		/**
		 * Remove all listeners for file event
		 */
		removeAllListeners(event: 'file'): this;

		/**
		 * Remove all listeners for ready event
		 */
		removeAllListeners(event: 'ready'): this;

		/**
		 * Remove all listeners for unlink event
		 */
		removeAllListeners(event: 'unlink'): this;

		/**
		 * Remove all listeners for update event
		 */
		removeAllListeners(event: 'update'): this;

		/**
		 * Remove a listener for change event
		 */
		removeListener(event: 'change', listener: CacheElementListener): this;

		/**
		 * Remove a listener for destroy event
		 */
		removeListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Remove a listener for directory event
		 */
		removeListener(
			event: 'directory',
			listener: CacheDirectoryListener
		): this;

		/**
		 * Remove a listener for error event
		 */
		removeListener(event: 'error', listener: ErrorListener): this;

		/**
		 * Remove a listener for file event
		 */
		removeListener(event: 'file', listener: CacheFileListener): this;

		/**
		 * Remove a listener for ready event
		 */
		removeListener(event: 'ready', listener: (cache: Cache) => void): this;

		/**
		 * Remove a listener for unlink event
		 */
		removeListener(event: 'unlink', listener: CacheElementListener): this;

		/**
		 * Remove a listener for update event
		 */
		removeListener(event: 'update', listener: (cache: Cache) => void): this;
	}

	type CacheCallback = (cache: Cache) => void;
}

/**
 * Create and start a file system cache
 */
declare function recache(
	path: string,
	options: recache.CacheOptions,
	callback: recache.CacheCallback
): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(
	path: string,
	options: recache.CacheOptions
): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(
	path: string,
	callback: recache.CacheCallback
): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(path: string): recache.Cache;

export = recache;