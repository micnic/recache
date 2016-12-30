<img src="https://raw.github.com/micnic/recache/master/logo.png"/>

# 0.4.3

[![Gitter](https://badges.gitter.im/recache.png)](https://gitter.im/micnic/recache)

recache is a file system cache which loads the provided folder or file into the memory, recursively watches the folder tree and updates the data on changes. It provides the content and the stats for each element stored in the cache.

#### Works with node.js 4.0+!
#### Any feedback is welcome!
If you found any issues using this module please report it on Github, it will be fixed as soon as possible :)

#### More simple modules:
- [simpleR](https://www.npmjs.com/package/simpler)
- [simpleS](https://www.npmjs.com/package/simples)
- [simpleT](https://www.npmjs.com/package/simplet)

## Instalation

    npm install recache

## API

`recache(location[, options, callback])`

- `location`: [ string ] - location of the cached root element
- `options`: [ object ] - cache configuration options, optional
    - `filter`: [ function(location: string, stats: fs.Stats) => boolean ] - filter cached elements, by default all elements are cached
    - `persistent`: [ boolean ] - enable persistence, default is true
- `callback`: [ function(cache: recache.Cache) => void ] - function called when cache is ready

`recache` will load directories and files provided in the `location` argument. Directories are recursively traversed, their content is loaded into the memory and watched for changes. Two options can be defined for the cache: `filter` - a function which receives two arguments, the location and the stats of the current element, it has to return a boolean value to filter the names of the files or the directories that should be cached (by default all files and directories contained by the provided directory are cached) and `persistent` - a boolean value to define if the process should continue while the cache is watching for changes (by default the created cache is persistent). The last argument is a callback function which is executed only once, in the beginning when all the files and directories are loaded in the memory (`ready` event). `recache` should be used only with directories and files which are used often in a certain process, but not frequently modified, thus speeding up the access to the stored files and directories. Note that the stored content should not surpass the available memory.

### Members

`.data`

Metadata about the cache, it is an empty object which should be used by the user.

`.read([location])`

location: string

To read data from the cache `.read()` method is used with a provided relative location to the location of the cached directory. If no location is provided then the object of the cached directory or of the cached file is returned. If the required location was no found then `null` is returned. Each returned object has 4 members: `content` - the content of the element, for directories it is an array of strings which represents the name of the contained files or subdirectories, for files it is a buffer with the content of the file, `data` - the metadata of the element, it is an empty object which may be filled by the user of the cache `location` - the location of the element relative to the root element of the cache, `stats` - the file system stats of the element.

`.list([filter])`

filter: (element: string, index: number, list: string[]) => boolean

To list all possible readable sources `.list()` method is used with an optional parameter to filter elements. If no filter parameter is provided then all readable elements of the cache are returned as an array of strings.

`.destroy()`

Destroy the cached data.

### Emitted events

- `error` - when an error raised, provides the error as the callback argument
- `ready` - when all the files and directories are loaded for the first time
- `update` - when one or multiple changes were made inside the cache
- `directory` - when a new directory is added to the cache, provides the directory object as the callback argument
- `file` - when a new file is added to the cache, provides the file object as the callback argument
- `change` - when a directory or a file is changed, provides the element object as the callback argument
- `unlink` - when a directory or a file is removed, provides the element object as the callback argument

## Example

```js
const recache = require('recache');

const cache = recache('static_files', {
    filter: (location, stats) => {              // filter for hidden files, by default all files and directories are cached

        let result = false;

        if (stats.isFile()) {
            result = /^(?!\.).+$/.test(location);
        }

        return result;
    },
    persistent: true	                        // make persistent cache, default is true
}, (cache) => {
    console.log('Cache ready !!!');

    // cache.read(...);
});

cache.on('error', (error) => {
    console.log('Something unexpected happened');
    console.log(error.stack);
});

cache.on('ready', (cache) => { // The event which triggers the provided callback
    console.log('Cache ready !!!');

    // cache.read(...);
});

cache.on('update', (cache) => {
    console.log('Cache updated !');

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

/* List */
cache.list();
/*
File
=> ['']

Directory
=> ['', '1.txt', '2.txt', '3.txt', ...]
*/

/* Read */
cache.read();
/*
File
=>  {
        content: Buffer<00 01 02 ...>   // content of the file
        data: {},                       // metadata of the file, you fill it
        location: '',                   // location of the file
        stats: {                        // stats of the file
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }

Directory
=>  {
        content: ['1.txt', '2.txt', '3.txt', ...],  // content of the directory
        data: {},                                   // metadata of the directory, you fill it
        location: '',                               // location of the directory
        stats: {                                    // stats of the directory
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }
*/
```