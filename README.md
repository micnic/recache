<img src="https://raw.github.com/micnic/recache/master/logo.png"/>

[![npm version](https://img.shields.io/npm/v/recache.svg?logo=npm&style=flat-square)](https://www.npmjs.com/package/recache)
[![npm downloads](https://img.shields.io/npm/dm/recache.svg?style=flat-square)](https://www.npmjs.com/package/recache)
[![npm types](https://img.shields.io/npm/types/recache.svg?style=flat-square)](https://www.npmjs.com/package/recache)
[![node version](https://img.shields.io/node/v/recache.svg?style=flat-square)](https://www.npmjs.com/package/recache)
[![license](https://img.shields.io/npm/l/recache.svg?style=flat-square)](https://www.npmjs.com/package/recache)

`recache` is a file system cache, it watches recursively a directory tree or a
file content and updates the data on changes, optionally it may provide the
content and the stats for each element stored in the cache.

## Comparison with `fs.watch` and `fs.watchFile`
`recache` provides a more reliable cross-platform way to deal with file system
watching, subdirectories are being watched recursively. Under the hood `recache`
uses `fs.watch()` and `fs.watchFile()`, but alleviates the different caveats
that node fs watch methods have by checking fs stats.

## Comparison with `chokidar`
In general `chokidar` and `recache` solve the same problems related to
unreliable default node fs watching methods. While `chokidar` is more focused on
watching for fs changes in multiple locations and calling functions on specific
events, `recache` is about watching a single directory tree or file and also
reading its paths, stats and content directly using only its API. `recache` is a
pure JS solution and does not require any code compilation on installation.

## Installation

    npm i recache

## API

`recache(path[, options, callback])`

- `path`: [ string ] - path for the root element to be cached
- `options`: [ object ] - cache configuration options, optional
  - `filter`: [ (path: string, stats: fs.Stats) => boolean ] - filter
    cached elements, by default all elements are cached
  - `persistent`: [ boolean ] - enable persistence of file system watchers,
    default is false
  - `store`: [ boolean ] - enable file content saving, default is false
- `callback`: [ (cache: recache.Cache) => void ] - function called when
  cache is ready

`recache` will load directories and files provided in the `path` argument.
Directories are recursively traversed, their content is loaded into the memory
and watched for changes. Following options can be defined for the cache:
- `filter` - a function which receives two arguments, the absolute path and file
  system stats of traversed directories or files, it has to return a boolean
  value to filter the elements should be cached, by default all elements from
  the provided path are cached
- `persistent` - a boolean value to define if the process should continue while
  the cache is watching for changes, by default the created cache is not
  persistent.
- `store` - a boolean value to enable storing the files content in the cache, by
  default files content is not saved in the cache, note that if this option is
  enabled files content should not surpass the available memory

The last argument is a callback function which is executed only once, in the
beginning when all the files and directories are loaded in the memory, the same
functionality can be achieved by listening for the `ready` event.

### Members

`.data`

Metadata about the cache, it is an empty object which should be used by the
user.

`.path`

The absolute path of the root element of the cache.

`.get([location])`

location: string

Get the element from the provided relative location. If no location is provided
then the element from the root location is returned. If the required location
was no found then `null` is returned. Returned element is object that has the
following readonly properties:
- `content` - the content of the element, for directories it is an array of
  strings which represents the name of the contained files or subdirectories,
  for files it is a buffer with the content of the file if it was set to be
  stored in the options or `null` otherwise
- `data` - the metadata of the element, it is an empty object which may be
  filled by the user of the cache
- `location` - the relative location of the element to the root element of the
  cache
- `path` - the absolute path of the element in the file system
- `stats` - the file system stats of the element

`.has(location)`

location: string

Checks if the cache has an element on the provided location.

`.list([filter])`

filter: (location: string, index: number, list: string[]) => boolean

List all possible readable sources with an optional parameter to filter
elements. If no filter parameter is provided then all readable elements of the
cache are returned as an array of strings.

`.start([callback])`

callback: (cache: recache.Cache) => void

Starts the cache, this method is called automatically when the cache is created,
it is not necessary to call it manually. It may be called only after the cache
was stopped. This method accepts a callback function which is executed only once
when the cache is started.

`.stop()`

Stops watching the file system for changes, this method is called automatically
when the cache is destroyed, it is not necessary to call it manually.

`.destroy()`

Destroy the cached data.

### Emitted events

- `error` - (error: Error) - when an error raised, provides the error as the
  callback argument
- `ready` - (cache: recache.Cache) - when all the files and directories are
  loaded for the first time
- `update` - (cache: recache.Cache) - when one or multiple changes were made
  inside the cache
- `directory` - (element: recache.CacheElement) - when a new directory is added
  to the cache, provides the directory object as the callback argument
- `file` - (element: recache.CacheElement) - when a new file is added to the
  cache, provides the file object as the callback argument
- `change` - (element: recache.CacheElement) - when a directory or a file is
  changed, provides the element object as the callback argument
- `unlink` - (element: recache.CacheElement) - when a directory or a file is
  removed, provides the element object as the callback argument
- `destroy` - when the cache is destroyed, no parameter is provided

## Example

```js
const recache = require('recache');

const cache = recache('/path/to/files', {
    filter: (path, stats) => {                  // Filter cache elements

        // Filter for hidden files
        if (stats.isFile()) {
            return /^(?!\.).+$/.test(path);
        }

        return false;
    },
    persistent: true,                           // Make persistent cache
    store: true                                 // Enable file content storage
}, (cache) => {
    console.log('Cache ready!');

    // cache.read(...);
});

cache.on('error', (error) => {
    console.log('Something unexpected happened');
    console.log(error.stack);
});

cache.on('ready', (cache) => {
    console.log('Cache ready!');

    // cache.read(...);
});

cache.on('update', (cache) => {
    console.log('Cache updated!');

    // cache.read(...);
});

cache.on('directory', (directory) => {
    console.log('new directory added: "' + directory.location + '"');
});

cache.on('file', (file) => {
    console.log('new file added: "' + file.location + '"');
});

cache.on('change', (element) => {
    if (element.stats.isDirectory()) {
        console.log('directory "' + element.location + '" changed');
    } else {
        console.log('file "' + element.location + '" changed');
    }
});

cache.on('unlink', (element) => {
    if (element.stats.isDirectory()) {
        console.log('directory "' + element.location + '" removed');
    } else {
        console.log('file "' + element.location + '" removed');
    }
});

cache.on('destroy', () => {
    console.log('Cache destroyed!');
});

/* List cache elements */
cache.list();
/*
File
=> ['']

Directory
=> ['', '1.txt', '2.txt', '3.txt', ...]
*/

/* Get cache elements */
cache.get();
/*
File
=>  {
        content: Buffer<00 01 02 ...>   // file content
        data: {},                       // file metadata
        location: '<root>/file',        // file location
        path: '/path/to/file',          // file path
        stats: {                        // file stats
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }

Directory
=>  {
        content: ['1.txt', '2.txt', '3.txt', ...],  // directory content
        data: {},                                   // directory metadata
        location: '<root>/directory',               // directory location
        path: '/path/to/directory',                 // directory path
        stats: {                                    // directory stats
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }
*/
```