import { EventEmitter } from 'events';
import { Stats } from 'fs';

type DirectoryType = 'directory';
type FileType = 'file';
type CacheDirectoryContent = string[];
type CacheFileContent = Buffer | null;
type VoidListener = () => void;
type CacheDirectoryListener = (directory: Readonly<recache.CacheDirectory>) => void;
type CacheFileListener = (file: Readonly<recache.CacheFile>) => void;
type CacheElementListener = (element: Readonly<recache.CacheElement>) => void;
type ErrorListener = (error: Error) => void;
type CacheEventListener = CacheCallback | VoidListener;
type CacheElementEventListener = CacheElementListener | VoidListener;
type ErrorEventListener = ErrorListener | VoidListener;
type DirectoryEventListener = CacheDirectoryListener | VoidListener;
type FileEventListener = CacheFileListener | VoidListener;

type CacheElementCommons = {

	/**
	 * Container to store user data
	 */
	data: recache.UserData;

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
	stats: Stats;
};

declare namespace recache {

	type CacheCallback = (cache: Cache) => void;

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

	type CacheElementType = DirectoryType | FileType;

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

	type CacheFilter = (path: string, stats: Stats) => boolean;

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

	type UserData = {
		[key: string]: any
	};

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
		addListener(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Add a listener for destroy event
		 */
		addListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add a listener for directory event
		 */
		addListener(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Add a listener for error event
		 */
		addListener(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Add a listener for file event
		 */
		addListener(event: 'file', listener: FileEventListener): this;

		/**
		 * Add a listener for ready event
		 */
		addListener(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Add a listener for unlink event
		 */
		addListener(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Add a listener for update event
		 */
		addListener(event: 'update', listener: CacheEventListener): this;

		// TODO: In Node 10+ add support for .off() method

		/**
		 * Add a listener for change event
		 */
		on(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Add a listener for destroy event
		 */
		on(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add a listener for directory event
		 */
		on(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Add a listener for error event
		 */
		on(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Add a listener for file event
		 */
		on(event: 'file', listener: FileEventListener): this;

		/**
		 * Add a listener for ready event
		 */
		on(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Add a listener for unlink event
		 */
		on(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Add a listener for update event
		 */
		on(event: 'update', listener: CacheEventListener): this;

		/**
		 * Add an one-time listener for change event
		 */
		once(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Add an one-time listener for destroy event
		 */
		once(event: 'destroy', listener: VoidListener): this;

		/**
		 * Add an one-time listener for directory event
		 */
		once(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Add an one-time listener for error event
		 */
		once(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Add an one-time listener for file event
		 */
		once(event: 'file', listener: FileEventListener): this;

		/**
		 * Add an one-time listener for ready event
		 */
		once(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Add an one-time listener for unlink event
		 */
		once(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Add an one-time listener for update event
		 */
		once(event: 'update', listener: CacheEventListener): this;

		/**
		 * Prepend a listener for change event
		 */
		prependListener(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Prepend a listener for destroy event
		 */
		prependListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Prepend a listener for directory event
		 */
		prependListener(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Prepend a listener for error event
		 */
		prependListener(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Prepend a listener for file event
		 */
		prependListener(event: 'file', listener: FileEventListener): this;

		/**
		 * Prepend a listener for ready event
		 */
		prependListener(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Prepend a listener for unlink event
		 */
		prependListener(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Prepend a listener for update event
		 */
		prependListener(event: 'update', listener: CacheEventListener): this;

		/**
		 * Prepend an one-time listener for change event
		 */
		prependOnceListener(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Prepend an one-time listener for destroy event
		 */
		prependOnceListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Prepend an one-time listener for directory event
		 */
		prependOnceListener(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Prepend an one-time listener for error event
		 */
		prependOnceListener(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Prepend an one-time listener for file event
		 */
		prependOnceListener(event: 'file', listener: FileEventListener): this;

		/**
		 * Prepend an one-time listener for ready event
		 */
		prependOnceListener(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Prepend an one-time listener for unlink event
		 */
		prependOnceListener(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Prepend an one-time listener for update event
		 */
		prependOnceListener(event: 'update', listener: CacheEventListener): this;

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
		removeListener(event: 'change', listener: CacheElementEventListener): this;

		/**
		 * Remove a listener for destroy event
		 */
		removeListener(event: 'destroy', listener: VoidListener): this;

		/**
		 * Remove a listener for directory event
		 */
		removeListener(event: 'directory', listener: DirectoryEventListener): this;

		/**
		 * Remove a listener for error event
		 */
		removeListener(event: 'error', listener: ErrorEventListener): this;

		/**
		 * Remove a listener for file event
		 */
		removeListener(event: 'file', listener: FileEventListener): this;

		/**
		 * Remove a listener for ready event
		 */
		removeListener(event: 'ready', listener: CacheEventListener): this;

		/**
		 * Remove a listener for unlink event
		 */
		removeListener(event: 'unlink', listener: CacheElementEventListener): this;

		/**
		 * Remove a listener for update event
		 */
		removeListener(event: 'update', listener: CacheEventListener): this;
	}
}

/**
 * Create and start a file system cache
 */
declare function recache(path: string, options: recache.CacheOptions, callback: recache.CacheCallback): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(path: string, options: recache.CacheOptions): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(path: string, callback: recache.CacheCallback): recache.Cache;

/**
 * Create and start a file system cache
 */
declare function recache(path: string): recache.Cache;

export = recache;