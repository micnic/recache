'use strict';

/* eslint max-len: off */
/* eslint no-invalid-this: off */
/* eslint prefer-arrow-callback: off */
/* eslint object-shorthand: off */

const events = require('events');
const fs = require('fs');
const recache = require('recache');
const tap = require('tap');

const Cache = require('recache/lib/cache');

const CachePrototype = Cache.prototype;
const CacheDestroy = CachePrototype.destroy;
const CacheList = CachePrototype.list;
const CacheRead = CachePrototype.read;

fs.mkdirSync(`${__dirname}/cache`);
fs.mkdirSync(`${__dirname}/cache/emptydir`);
fs.mkdirSync(`${__dirname}/cache/onefiledir`);
fs.writeFileSync(`${__dirname}/cache/onefiledir/file`, 'file content');
fs.writeFileSync(`${__dirname}/cache/file`, 'file content');

function createFakeInstance(ready, updating, destroyed) {

	const fakeInstance = Object.create(events.EventEmitter.prototype);

	fakeInstance.location = `${__dirname}/cache`;
	fakeInstance.ready = ready;
	fakeInstance.updating = updating;
	fakeInstance.destroyed = destroyed;
	fakeInstance.container = {};
	fakeInstance.watchers = {};
	fakeInstance.options = {};

	return fakeInstance;
}

function createFakeElement(location, isDirectory) {

	const fakeElement = {};

	fakeElement.location = location;
	fakeElement.stats = {};

	if (isDirectory) {
		fakeElement.content = [];
	}

	fakeElement.stats.isDirectory = function () {
		return isDirectory;
	};

	return fakeElement;
}

tap.ok(recache === Cache.create);

tap.ok(typeof CacheDestroy === 'function');
tap.ok(typeof CacheList === 'function');
tap.ok(typeof CacheRead === 'function');

tap.test('Cache.readFile() with existing uncached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['file'] = createFakeElement('file', false);

	Cache.readFile(fakeInstance, 'file', function () {
		test.ok(String(fakeInstance.container['file'].content) === 'file content');
		test.end();
	});
});

tap.test('Cache.readFile() with error and inexistent file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	let asserts = 0;

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	Cache.readFile(fakeInstance, 'inexistent file', function () {
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.readFile() with error and cached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('cached file', false);

	let asserts = 0;

	fakeInstance.container['cached file'] = fakeFile;

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeFile);
		test.ok(fakeInstance.container['cached file'] === undefined);
		asserts++;
	});

	Cache.readFile(fakeInstance, 'cached file', function () {
		test.ok(asserts === 2);
		test.end();
	});
});

tap.test('Cache.readFile() with destroyed cache instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);

	fakeInstance.on('error', function (error) {
		test.ok(error.message === 'Cache instance is destroyed');
		test.end();
	});

	Cache.readFile(fakeInstance, 'file', function () {
		test.fail();
	});
});

tap.test('Cache.readDirectory() with existing empty uncached directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['emptydir'] = createFakeElement('emptydir', true);

	Cache.readDirectory(fakeInstance, 'emptydir', function () {
		test.ok(Array.isArray(fakeInstance.container['emptydir'].content));
		test.ok(fakeInstance.container['emptydir'].content.length === 0);
		test.end();
	});
});

tap.test('Cache.readDirectory() with existing uncached directory with one file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['onefiledir'] = createFakeElement('onefiledir', true);

	Cache.readDirectory(fakeInstance, 'onefiledir', function () {
		test.ok(Array.isArray(fakeInstance.container['onefiledir'].content));
		test.ok(fakeInstance.container['onefiledir'].content.length === 1);
		test.end();
	});
});

tap.test('Cache.readDirectory() with error and inexistent directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	let asserts = 0;

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	Cache.readDirectory(fakeInstance, 'inexistent directory', function () {
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.readDirectory() with error and cached directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('cached directory', true);
	const fakeWatcher = {};

	let asserts = 0;

	fakeInstance.container['cached directory'] = fakeDirectory;
	fakeInstance.watchers['cached directory'] = fakeWatcher;

	fakeWatcher.close = function () {};

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeDirectory);
		test.ok(fakeInstance.container['cached directory'] === undefined);
		asserts++;
	});

	Cache.readDirectory(fakeInstance, 'cached directory', function () {
		test.ok(asserts === 2);
		test.end();
	});
});

tap.test('Cache.readDirectory() with destroyed cache instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);

	fakeInstance.on('error', function (error) {
		test.ok(error.message === 'Cache instance is destroyed');
		test.end();
	});

	Cache.readDirectory(fakeInstance, 'emptydir', function () {
		test.fail();
	});
});

tap.test('Cache.unlinkElement() with a file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('file', false);

	let asserts = 0;

	fakeInstance.container['file'] = fakeFile;

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeFile);
		asserts++;
	});

	Cache.unlinkElement(fakeInstance, 'file');

	test.ok(asserts === 1);
	test.end();
});

tap.test('Cache.unlinkElement() with an empty directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('directory', true);
	const fakeWatcher = {};

	let asserts = 0;

	fakeInstance.container['directory'] = fakeDirectory;
	fakeInstance.watchers['directory'] = fakeWatcher;

	fakeWatcher.close = function () {};

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeDirectory);
		asserts++;
	});

	Cache.unlinkElement(fakeInstance, 'directory');

	test.ok(asserts === 1);
	test.end();
});

tap.test('Cache.unlinkElement() with an directory with one file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('directory', true);
	const fakeFile = createFakeElement('directory/file', false);
	const fakeWatcher = {};

	let asserts = 0;

	fakeInstance.container['directory'] = fakeDirectory;
	fakeInstance.container['directory/file'] = fakeFile;
	fakeInstance.watchers['directory'] = fakeWatcher;

	fakeDirectory.content = ['file'];

	fakeWatcher.close = function () {};

	fakeInstance.on('unlink', function (element) {
		if (asserts === 0) {
			test.ok(element === fakeFile);
		} else if (asserts === 1) {
			test.ok(element === fakeDirectory);
		}

		asserts++;
	});

	Cache.unlinkElement(fakeInstance, 'directory');

	test.ok(asserts === 2);
	test.end();
});

tap.test('Cache.addFile() when cache instance is not ready', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['file'] = createFakeElement('file', false);

	Cache.addFile(fakeInstance, 'file', function () {
		test.ok(String(fakeInstance.container['file'].content) === 'file content');
		test.end();
	});
});

tap.test('Cache.addFile() when cache instance is ready', (test) => {

	const fakeInstance = createFakeInstance(true, false, false);
	const fakeFile = createFakeElement('file', false);

	let asserts = 0;

	fakeInstance.container['file'] = fakeFile;

	fakeInstance.on('file', function (file) {
		test.ok(file === fakeFile);
		asserts++;
	});

	Cache.addFile(fakeInstance, 'file', function () {
		test.ok(String(fakeInstance.container['file'].content) === 'file content');
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.addDirectory() when cache is not ready', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['emptydir'] = createFakeElement('emptydir', false);
	fakeInstance.options.persistent = false;

	Cache.addDirectory(fakeInstance, 'emptydir', function () {
		test.ok(Array.isArray(fakeInstance.container['emptydir'].content));
		test.ok(fakeInstance.container['emptydir'].content.length === 0);
		test.ok(!!fakeInstance.watchers['emptydir']);

		fakeInstance.watchers['emptydir'].close();

		test.end();
	});
});

tap.test('Cache.addDirectory() when cache is ready', (test) => {

	const fakeInstance = createFakeInstance(true, false, false);
	const fakeDirectory = createFakeElement('emptydir', true);

	let asserts = 0;

	fakeInstance.container['emptydir'] = fakeDirectory;
	fakeInstance.options.persistent = false;

	fakeInstance.on('directory', function (directory) {
		test.ok(directory === fakeDirectory);
		asserts++;
	});

	Cache.addDirectory(fakeInstance, 'emptydir', function () {
		test.ok(Array.isArray(fakeInstance.container['emptydir'].content));
		test.ok(fakeInstance.container['emptydir'].content.length === 0);
		test.ok(!!fakeInstance.watchers['emptydir']);

		test.ok(asserts === 1);

		fakeInstance.watchers['emptydir'].close();

		test.end();
	});
});

tap.test('Cache.updateFile()', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('file', false);

	let asserts = 0;

	fakeInstance.container['file'] = fakeFile;

	fakeInstance.on('change', function (element) {
		test.ok(element === fakeFile);
		asserts++;
	});

	Cache.updateFile(fakeInstance, 'file', function () {
		test.ok(String(fakeInstance.container['file'].content) === 'file content');
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.updateDirectory() with empty directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('emptydir', true);

	let asserts = 0;

	fakeInstance.container['emptydir'] = fakeDirectory;

	fakeInstance.on('change', function (element) {
		test.ok(element === fakeDirectory);
		asserts++;
	});

	Cache.updateDirectory(fakeInstance, 'emptydir', function () {
		test.ok(Array.isArray(fakeInstance.container['emptydir'].content));
		test.ok(fakeInstance.container['emptydir'].content.length === 0);
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.updateDirectory() with a directory with one file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('onefiledir', true);

	let asserts = 0;

	fakeInstance.container['onefiledir'] = fakeDirectory;
	fakeDirectory.content = ['file'];

	fakeInstance.on('change', function (element) {
		test.ok(element === fakeDirectory);
		asserts++;
	});

	Cache.updateDirectory(fakeInstance, 'onefiledir', function () {
		test.ok(Array.isArray(fakeInstance.container['onefiledir'].content));
		test.ok(fakeInstance.container['onefiledir'].content.length === 1);
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.updateDirectory() with a directory with removed file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('onefiledir', true);
	const fakeFile = createFakeElement('onefiledir/removedfile', false);

	let asserts = 0;

	fakeInstance.container['onefiledir'] = fakeDirectory;
	fakeInstance.container['onefiledir/removedfile'] = fakeFile;
	fakeDirectory.content = ['file', 'removedfile'];

	fakeInstance.on('change', function (element) {
		test.ok(element === fakeDirectory);
		asserts++;
	});

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeFile);
		asserts++;
	});

	Cache.updateDirectory(fakeInstance, 'onefiledir', function () {
		test.ok(Array.isArray(fakeInstance.container['onefiledir'].content));
		test.ok(fakeInstance.container['onefiledir'].content.length === 1);
		test.ok(asserts === 2);
		test.end();
	});
});

tap.test('Cache.updateElement() with an uncached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	Cache.updateElement(fakeInstance, 'file', function () {
		test.ok(fakeInstance.container['file'].location === 'file');
		test.ok(String(fakeInstance.container['file'].content) === 'file content');
		test.ok(!!fakeInstance.container['file'].stats);
		test.end();
	});
});

tap.test('Cache.updateElement() with an uncached directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	Cache.updateElement(fakeInstance, 'emptydir', function () {
		test.ok(fakeInstance.container['emptydir'].location === 'emptydir');
		test.ok(fakeInstance.container['emptydir'].content.length === 0);
		test.ok(!!fakeInstance.container['emptydir'].stats);

		fakeInstance.watchers['emptydir'].close();

		test.end();
	});
});

tap.test('Cache.updateElement() with a filtered uncached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.filter = function () {
		return false;
	};

	Cache.updateElement(fakeInstance, 'file', function () {
		test.ok(fakeInstance.container['file'] === undefined);
		test.end();
	});
});

tap.test('Cache.updateElement() with an unmodified cached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('file', false);
	const stats = fs.statSync(`${__dirname}/cache/file`);

	fakeInstance.container['file'] = fakeFile;

	fakeFile.stats = stats;

	Cache.updateElement(fakeInstance, 'file', function () {
		test.ok(fakeInstance.container['file'].stats === stats);
		test.end();
	});
});

tap.test('Cache.updateElement() with an unmodified cached directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('emptydir', true);
	const stats = fs.statSync(`${__dirname}/cache/emptydir`);

	fakeInstance.container['emptydir'] = fakeDirectory;
	fakeDirectory.stats = stats;

	Cache.updateElement(fakeInstance, 'emptydir', function () {
		test.ok(fakeInstance.container['emptydir'].stats === stats);
		test.end();
	});
});

tap.test('Cache.updateElement() with a modified cached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('file', false);
	const stats = {};

	fakeInstance.container['file'] = fakeFile;
	fakeFile.stats = stats;
	stats.mtime = 0;

	Cache.updateElement(fakeInstance, 'file', function () {
		test.ok(fakeInstance.container['file'].stats !== stats);
		test.end();
	});
});

tap.test('Cache.updateElement() with a modified cached directory', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeDirectory = createFakeElement('emptydir', true);
	const stats = {};

	fakeInstance.container['emptydir'] = fakeDirectory;
	fakeDirectory.stats = stats;
	stats.mtime = 0;

	stats.isDirectory = function () {
		return true;
	};

	Cache.updateElement(fakeInstance, 'emptydir', function () {
		test.ok(fakeInstance.container['emptydir'].stats !== stats);
		test.end();
	});
});

tap.test('Cache.updateElement() with error and inexistent file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	let asserts = 0;

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	Cache.updateElement(fakeInstance, 'inexistent file', function () {
		test.ok(asserts === 1);
		test.end();
	});
});

tap.test('Cache.updateElement() with error and cached file', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);
	const fakeFile = createFakeElement('cached file', false);

	let asserts = 0;

	fakeInstance.container['cached file'] = fakeFile;

	fakeInstance.on('error', function (error) {
		test.type(error, Error);
		asserts++;
	});

	fakeInstance.on('unlink', function (element) {
		test.ok(element === fakeFile);
		test.ok(fakeInstance.container['cached file'] === undefined);
		asserts++;
	});

	Cache.updateElement(fakeInstance, 'cached file', function () {
		test.ok(asserts === 2);
		test.end();
	});
});

tap.test('Cache.updateElement() with destroyed cache instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);

	fakeInstance.on('error', function (error) {
		test.ok(error.message === 'Cache instance is destroyed');
		test.end();
	});

	Cache.updateElement(fakeInstance, 'file', function () {
		test.fail();
	});
});

/*tap.test('Cache.startUpdate() with ready and not updated cache instance', (test) => {

	const fakeInstance = createFakeInstance(true, false, false);

	Cache.startUpdate(fakeInstance, 'file');

	test.ok(fakeInstance.updating);

	fakeInstance.on('update', function (instance) {
		test.ok(instance === fakeInstance);
		test.ok(!fakeInstance.updating);
		test.end();
	});
});

tap.test('Cache.startUpdate() with not ready cache instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	Cache.startUpdate(fakeInstance, 'file');

	fakeInstance.ready = true;
	fakeInstance.emit('ready');

	test.ok(fakeInstance.updating);

	fakeInstance.on('update', function (instance) {
		test.ok(instance === fakeInstance);
		test.ok(!fakeInstance.updating);
		test.end();
	});
});

tap.test('Cache.startUpdate() with ready but updating cache instance', (test) => {

	const fakeInstance = createFakeInstance(true, true, false);

	Cache.startUpdate(fakeInstance, 'file');

	fakeInstance.updating = false;
	fakeInstance.emit('update');

	test.ok(fakeInstance.updating);

	fakeInstance.on('update', function (instance) {
		test.ok(instance === fakeInstance);
		test.ok(!fakeInstance.updating);
		test.end();
	});
});*/

tap.test('Cache.create() with no arguments', (test) => {
	try {
		Cache.create();
	} catch (error) {
		test.type(error, TypeError);
		test.ok(error.message === '"location" argument must be a non-empty string');
		test.end();
	}
});

tap.test('Cache.create() with location provided', (test) => {

	const cache = Cache.create(`${__dirname}/cache`);

	test.ok(!cache.destroyed);
	test.ok(!cache.ready);
	test.ok(!cache.updating);
	test.ok(cache.filter === null);
	test.ok(cache.location === `${__dirname}/cache`);
	test.ok(cache.options.persistent === true);

	cache.on('ready', function (instance) {
		test.ok(cache === this);
		test.ok(cache === instance);
		test.ok(cache.ready);

		cache.destroy();

		test.end();
	});
});

tap.test('Cache.create() with location and options without filter provided', (test) => {

	const cache = Cache.create(`${__dirname}/cache`, {
		persistent: false
	});

	test.ok(!cache.destroyed);
	test.ok(!cache.ready);
	test.ok(!cache.updating);
	test.ok(cache.filter === null);
	test.ok(cache.location === `${__dirname}/cache`);
	test.ok(cache.options.persistent === false);

	cache.on('ready', function (instance) {
		test.ok(cache === this);
		test.ok(cache === instance);
		test.ok(cache.ready);

		cache.destroy();

		test.end();
	});
});

tap.test('Cache.create() with location and options with filter provided', (test) => {

	const filter = function (location, stats) {

		test.ok(typeof location === 'string');
		test.ok(typeof stats === 'object');

		asserts++;

		return true;
	};

	const cache = Cache.create(`${__dirname}/cache`, {
		persistent: false,
		filter: filter
	});

	let asserts = 0;

	test.ok(!cache.destroyed);
	test.ok(!cache.ready);
	test.ok(!cache.updating);
	test.ok(cache.filter === filter);
	test.ok(cache.location === `${__dirname}/cache`);
	test.ok(cache.options.persistent === false);

	cache.on('ready', function (instance) {
		test.ok(cache === this);
		test.ok(cache === instance);
		test.ok(cache.ready);
		test.ok(asserts === 5);

		cache.destroy();

		test.end();
	});
});

tap.test('Cache.create() with location and callback provided', (test) => {

	const cache = Cache.create(`${__dirname}/cache`, function (instance) {
		test.ok(cache === instance);
		test.ok(cache === this);
		asserts++;
	});

	let asserts = 0;

	test.ok(!cache.destroyed);
	test.ok(!cache.ready);
	test.ok(!cache.updating);
	test.ok(cache.filter === null);
	test.ok(cache.location === `${__dirname}/cache`);
	test.ok(cache.options.persistent === true);

	cache.on('ready', function (instance) {
		test.ok(cache === this);
		test.ok(cache === instance);
		test.ok(cache.ready);
		test.ok(asserts === 1);

		cache.destroy();

		test.end();
	});
});

tap.test('Cache.prototype.destroy() called on a valid instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	CacheDestroy.call(fakeInstance);

	test.ok(fakeInstance.destroyed);
	test.ok(fakeInstance.container === null);
	test.ok(fakeInstance.filter === null);
	test.ok(fakeInstance.location === null);
	test.ok(fakeInstance.options === null);
	test.ok(fakeInstance.ready === null);
	test.ok(fakeInstance.updating === null);
	test.ok(fakeInstance.watchers === null);
	test.end();
});

tap.test('Cache.prototype.destroy() called on a destroyed instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);

	CacheDestroy.call(fakeInstance);

	test.ok(fakeInstance.destroyed);
	test.end();
});

tap.test('Cache.prototype.list() called on a valid instance without filter', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container['file'] = createFakeElement('file', false);

	const list = CacheList.call(fakeInstance);

	test.ok(Array.isArray(list));
	test.ok(list.length === 1);
	test.ok(list[0] === 'file');
	test.end();
});

tap.test('Cache.prototype.list() called on a valid instance with filter', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	let asserts = 0;

	fakeInstance.container['file'] = createFakeElement('file', false);

	const list = CacheList.call(fakeInstance, function (location) {
		test.ok(typeof location === 'string');
		asserts++;
		return false;
	});

	test.ok(Array.isArray(list));
	test.ok(list.length === 0);
	test.ok(asserts === 1);
	test.end();
});

tap.test('Cache.prototype.list() called on a destroyed instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);
	const list = CacheList.call(fakeInstance);

	test.ok(Array.isArray(list));
	test.ok(list.length === 0);
	test.end();
});

tap.test('Cache.prototype.read() called on a valid instance without arguments', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container[''] = createFakeElement('', false);

	test.ok(CacheRead.call(fakeInstance) === fakeInstance.container['']);
	test.end();
});

tap.test('Cache.prototype.read() called on a valid instance with a root slash as argument', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	fakeInstance.container[''] = createFakeElement('', false);

	test.ok(CacheRead.call(fakeInstance, '/') === fakeInstance.container['']);
	test.end();
});

tap.test('Cache.prototype.read() called on a valid instance with an inexistent location', (test) => {

	const fakeInstance = createFakeInstance(false, false, false);

	test.ok(CacheRead.call(fakeInstance, 'inexistent location') === null);
	test.end();
});

tap.test('Cache.prototype.read() called on a destroyed instance', (test) => {

	const fakeInstance = createFakeInstance(false, false, true);

	test.ok(CacheRead.call(fakeInstance) === null);
	test.end();
});

tap.tearDown(function () {
	fs.unlinkSync(`${__dirname}/cache/file`);
	fs.rmdirSync(`${__dirname}/cache/emptydir`);
	fs.unlinkSync(`${__dirname}/cache/onefiledir/file`);
	fs.rmdirSync(`${__dirname}/cache/onefiledir`);
	fs.rmdirSync(`${__dirname}/cache`);
});