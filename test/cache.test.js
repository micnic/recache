'use strict';

const {
	mkdir,
	rename,
	rmdir,
	symlink,
	unlink,
	writeFile,
	writeFileSync
} = require('fs');
const { join, relative } = require('path');
const rimraf = require('rimraf');
const { equal, fail, match, ok, teardown, test } = require('tap');
const { promisify } = require('util');

const Cache = require('recache/lib/cache');

const nonExistent = 'non-existent';
const testDir = join(__dirname, 'test-dir');
const slink = join(testDir, 'slink');

const cleanUp = () => promisify(rimraf)(testDir);

test('Init tests', async ({ end }) => {

	await cleanUp();

	await promisify(mkdir)(testDir);
	await promisify(mkdir)(join(testDir, 'empty-dir'));
	await promisify(mkdir)(join(testDir, 'dir'));
	await promisify(writeFile)(join(testDir, 'dir', 'file'), '');

	end();
});

test('Cache.prepareArgs()', ({ end }) => {

	try {
		Cache.prepareArgs();
		fail('Method should fail');
	} catch (error) {
		ok(error instanceof Error);
	}

	match(Cache.prepareArgs('path'), {
		options: {},
		path: 'path'
	});

	match(Cache.prepareArgs('path', null), {
		options: {},
		path: 'path'
	});

	const callback = () => null;

	match(Cache.prepareArgs('path', null, callback), {
		callback,
		options: {},
		path: 'path'
	});

	match(Cache.prepareArgs('path', {}), {
		options: {},
		path: 'path'
	});

	const filter = () => true;

	match(Cache.prepareArgs('path', {
		filter,
		persistent: true,
		store: true
	}), {
		options: {
			filter,
			persistent: true,
			store: true
		},
		path: 'path'
	});

	match(Cache.prepareArgs('path', callback), {
		callback,
		options: {},
		path: 'path'
	});

	end();
});

test('Cache.normalizeLocation()', ({ end }) => {

	try {
		Cache.normalizeLocation();
		fail('Method should fail');
	} catch (error) {
		ok(error instanceof Error);
	}

	equal(Cache.normalizeLocation(''), '<root>');
	equal(Cache.normalizeLocation('/'), '<root>');
	equal(Cache.normalizeLocation('<root>'), '<root>');
	equal(Cache.normalizeLocation('/path'), '<root>/path');
	equal(Cache.normalizeLocation('path'), '<root>/path');

	end();
});


test('new Cache(): Non-existent element', ({ end }) => {

	const cache = new Cache(nonExistent);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		ok(error instanceof Error);
	}).on('ready', () => {
		fail('Cache should never be ready for non-existent element');
	});
});

test('new Cache(): Non-existent element with destroy', ({ end }) => {

	const cache = new Cache(nonExistent);

	cache.on('destroy', () => {
		end();
	}).on('ready', () => {
		fail('Cache should never be ready for non-existent element');
	});

	cache.destroy();
});

test('new Cache(): Symlink', async ({ end }) => {

	await promisify(symlink)(join(testDir, 'empty-dir'), slink);

	const cache = new Cache(slink);

	cache.on('destroy', async () => {
		await promisify(unlink)(slink);
		end();
	}).on('ready', () => {
		fail('Cache should never be ready for non-existent element');
	});
});

test('new Cache(): Cache file with error', async ({ end }) => {

	const path = join(testDir, 'temp-file');

	await promisify(writeFile)(path, '');

	const cache = new Cache(path, {
		store: true
	});

	return new Promise((resolve) => {
		cache.on('destroy', () => {
			resolve();
			end();
		}).on('error', (error) => {
			ok(error instanceof Error);
		});

		promisify(unlink)(path);
	});
});

test('new Cache(): Cache directory with error', async ({ end }) => {

	const path = join(testDir, 'temp-dir');

	await promisify(mkdir)(path);

	const cache = new Cache(path);

	return new Promise((resolve) => {
		cache.on('destroy', () => {
			resolve();
			end();
		}).on('error', (error) => {
			ok(error instanceof Error);
		});

		promisify(rmdir)(path);
	});
});

test('new Cache(): Empty directory', ({ end }) => {

	const path = join(testDir, 'empty-dir');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('ready', (c) => {
		equal(cache, c);
		cache.destroy();
	});
});

test('new Cache(): Non-empty directory with filter', ({ end }) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path, {
		filter(location) {
			return relative(path, location) !== 'file';
		}
	});

	cache.on('destroy', () => {
		end();
	}).on('ready', (c) => {
		equal(c.list().length, 1);
		equal(cache, c);
		cache.destroy();
	});
});

test('new Cache(): Non-empty directory with store', ({ end }) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path, {
		store: true
	});

	cache.on('destroy', () => {
		end();
	}).on('ready', (c) => {
		equal(cache, c);
		cache.destroy();
	});
});

test('new Cache(): Root file', ({ end }) => {

	const path = join(testDir, 'dir', 'file');

	const cache = new Cache(path, (c) => {
		equal(cache, c);
		match(cache, {
			data: {},
			path
		});
	});

	cache.on('destroy', () => {
		end();
	}).on('ready', (c) => {
		equal(cache, c);
		cache.destroy();
	});
});

test('new Cache(): Remove root directory on ready', ({ end }) => {

	const path = join(testDir, 'empty-dir');
	const cache = new Cache(path, {
		persistent: true
	});

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		ok(error instanceof Error);
	}).on('ready', (c) => {
		equal(cache, c);

		promisify(rmdir)(path);
	});
});

test('new Cache(): Modify root file before ready', ({ end }) => {

	const path = join(testDir, 'dir', 'file');

	const cache = new Cache(path, {
		persistent: true
	});

	cache.on('change', (element) => {
		equal(element.location, '<root>');
	}).on('destroy', () => {
		end();
	}).on('error', (error) => {
		fail(error.message);
	}).on('ready', () => {
		ok(cache.has('/'));
	}).on('update', (c) => {
		equal(cache, c);
		cache.destroy();
	}).on('watch', () => {
		writeFileSync(path, 'data');
	});
});

test('new Cache(): Modify root file on ready', ({ end }) => {

	const path = join(testDir, 'dir', 'file');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('ready', async () => {
		await promisify(writeFile)(path, 'data');
	}).on('update', (c) => {
		equal(cache, c);
		cache.destroy();
	}).on('change', (element) => {
		equal(element.location, '<root>');
	});
});

test('new Cache(): Rename root file on ready', ({ end }) => {

	const path = join(testDir, 'dir', 'file');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		ok(error instanceof Error);
	}).on('ready', async () => {
		await promisify(rename)(path, `${path}2`);
	});
});

test('Cache.prototype.destroy()', ({ end }) => {

	const cache = new Cache(testDir);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		fail(error.message);
	}).on('ready', () => {
		cache.destroy();
		cache.destroy(); // Check for errors when calling destroy twice
	});
});

test('Cache.prototype.get()', ({ end }) => {

	const path = join(testDir);

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		fail(error.message);
	}).on('ready', (c) => {
		ok(typeof c.get() === 'object');
		ok(typeof c.get('/') === 'object');
		equal(c.get(nonExistent), null);
		cache.destroy();
	});
});

test('Cache.prototype.has()', ({ end }) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		fail(error.message);
	}).on('ready', (c) => {
		ok(c.has('/'));
		cache.destroy();
	});
});

test('Cache.prototype.list()', ({ end }) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		end();
	}).on('error', (error) => {
		fail(error.message);
	}).on('ready', (c) => {
		match(c.list(), ['<root>']);
		match(c.list((location) => {
			return location !== '<root>';
		}), []);

		cache.destroy();

		match(c.list(), []);
	});
});

teardown(cleanUp);