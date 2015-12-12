<img src="https://raw.github.com/micnic/recache/master/logo.png"/>

# 0.3.1

[![Gitter](https://badges.gitter.im/recache.png)](https://gitter.im/micnic/recache)

recache is a file system cache which loads the provided folder or file into the memory, recursively watches the folder tree and updates the data on changes. It provides the content and the stats for each element stored in the cache.

#### Works with node.js 0.10+ and io.js 1.0+ !
#### Any feedback is welcome!

#### More simple modules:
- [simpleR](https://www.npmjs.com/package/simpler)
- [simpleS](https://www.npmjs.com/package/simples)
- [simpleT](https://www.npmjs.com/package/simplet)

## Instalation

    npm install recache

## Usage

`recache(location[, options, callback])`

location: string

options: object

callback: function

`recache` can cache directories and files based on the provided location. Directories are recursively traversed, their content is loaded into the memory and watched for changes. Three options can be defined for the cache: `files` and `dirs` - regular expressions or a strings to define the patterns of the names of the files or the directories that should be cached (by default all files and directories contained by the provided directory are cached) and `persistent` - a boolean value to define if the process should continue while the cache is watching for changes. The last argument is callback function which is executed only once, in the beginning when all the files and directories are loaded in the memory (`ready` event). `recache` should be used only with directories and files which are used often in a certain process, but not frequently modified, thus speeding up the access to the stored files and directories. Note that the stored content should not surpass the available memory.

Emitted events:

`error` - when an error raised, provides the error as the callback argument

`ready` - when all the files and directories are loaded for the first time

`update` - when one or multiple changes were made inside the cache

`directory` - when a new directory is added to the cache, provides the directory object as the callback argument

`file` - when a new file is added to the cache, provides the file object as the callback argument

`change` - when a directory or a file is changed, provides the element object as the callback argument

`unlink` - when a directory or a file is removed, provides the element object as the callback argument

```js
var cache = recache('static_files');
```

`.read([location])`

location: string

To read data from the cache `.read()` method is used with a provided relative location to the location of the cached directory. If no location is provided then the object of the object of the cached directory is returned. If the required location was no found then `null` is returned. Each returned object has 4 members: `content` - the content of the element, `data` - an object with metadata which may be filled with any data by the user of the cache, `location` - the relative location of the element inside the cache, `stats` - the fs stats of the required element.

`.destroy()`

Destroy the cached data.

## Example

```js
var recache = require('recache');

var cache = recache('static_files', {
    dirs: /^(?!\.).+$/,     // filter for hidden directories, default is /^.+$/i
    files: /^.+\.txt$/,     // filter for files that have the extension "txt", default is /^.+$/i
    persistent: true        // make persistent cache, default is false
}, function () {
    console.log('Cache ready !!!');
});

cache.on('error', function (error) {
    console.log('Something unexpected happened');
    console.log(error.stack);
});

cache.on('ready', function () { // The event which triggers the provided callback
    console.log('Cache ready !!!');
});

cache.on('update', function () {
    console.log('Cache updated !');
});

cache.on('directory', function (directory) {
    console.log('new directory added: "' + directory.location + '"');
});

cache.on('file', function (file) {
    console.log('new file added: "' + file.location + '"');
});

cache.on('change', function (element) {
    if (element.stats.isDirectory()) {
        console.log('directory "' + element.location + '" changed');
    } else {
        console.log('file "' + element.location + '" changed');
    }
});

cache.on('unlink', function (element) {
    if (element.stats.isDirectory()) {
        console.log('directory "' + element.location + '" removed');
    } else {
        console.log('file "' + element.location + '" removed');
    }
});

/* Read */
cache.read();
/*
File
=>  {
        content: Buffer<00 01 02 ...>
        location: '',
        stats: {
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }

Directory
=>  {
        content: ['1.txt', '2.txt', '3.txt', ...]
        location: '',
        stats: {
            atime: ...
            ctime: ...
            mtime: ...
            ...
        }
    }
*/
```