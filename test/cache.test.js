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
const tap = require('tap');
const { promisify } = require('util');

const Cache = require('recache/lib/cache');

const nonExistent = 'non-existent';
const testDir = join(__dirname, 'test-dir');
const slink = join(testDir, 'slink');

const cleanUp = () => promisify(rimraf)(testDir);

tap.test('Init tests', async (test) => {

	await cleanUp();

	await promisify(mkdir)(testDir);
	await promisify(mkdir)(join(testDir, 'empty-dir'));
	await promisify(mkdir)(join(testDir, 'dir'));
	await promisify(writeFile)(join(testDir, 'dir', 'file'), '');

	test.end();
});

tap.test('Cache.prepareArgs()', (test) => {

	test.test('No arguments provided', (t) => {
		try {
			Cache.prepareArgs();
			t.fail('Method should fail');
		} catch (error) {
			t.ok(error instanceof Error);
		}

		t.end();
	});

	test.test('Path provided', (t) => {

		const args = Cache.prepareArgs('path');

		t.match(args, {
			options: {},
			path: 'path'
		});

		t.end();
	});

	test.test('Path and null options provided', (t) => {

		const args = Cache.prepareArgs('path', null);

		t.match(args, {
			options: {},
			path: 'path'
		});

		t.end();
	});

	test.test('Path, null options and callback provided', (t) => {

		const callback = () => null;
		const args = Cache.prepareArgs('path', null, callback);

		t.match(args, {
			callback,
			options: {},
			path: 'path'
		});

		t.end();
	});

	test.test('Path and empty options provided', (t) => {

		const args = Cache.prepareArgs('path', {});

		t.match(args, {
			options: {},
			path: 'path'
		});

		t.end();
	});

	test.test('Path and all options provided', (t) => {

		const filter = () => true;
		const args = Cache.prepareArgs('path', {
			filter,
			persistent: true,
			store: true
		});

		t.match(args, {
			options: {
				filter,
				persistent: true,
				store: true
			},
			path: 'path'
		});

		t.end();
	});

	test.test('Path and callback provided', (t) => {

		const callback = () => null;
		const args = Cache.prepareArgs('path', callback);

		t.match(args, {
			callback,
			options: {},
			path: 'path'
		});

		t.end();
	});

	test.end();
});

tap.test('Cache.normalizeLocation()', (test) => {

	test.test('Invalid location', (t) => {
		try {
			Cache.normalizeLocation();
			t.fail('Method should fail');
		} catch (error) {
			t.ok(error instanceof Error);
		}

		t.end();
	});

	test.test('Empty string', (t) => {
		t.equal(Cache.normalizeLocation(''), '<root>');

		t.end();
	});

	test.test('Solidus', (t) => {
		t.equal(Cache.normalizeLocation('/'), '<root>');

		t.end();
	});

	test.test('Start with root', (t) => {
		t.equal(Cache.normalizeLocation('<root>'), '<root>');

		t.end();
	});

	test.test('Start with solidus', (t) => {
		t.equal(Cache.normalizeLocation('/path'), '<root>/path');

		t.end();
	});

	test.test('Just path', (t) => {
		t.equal(Cache.normalizeLocation('path'), '<root>/path');

		t.end();
	});

	test.end();
});

tap.test('Cache.prototype.constructor()', (test) => {

	test.test('Non-existent element', (t) => {

		const cache = new Cache(nonExistent);

		cache.on('destroy', () => {
			t.end();
		}).on('error', (error) => {
			t.ok(error instanceof Error);
		}).on('ready', () => {
			t.fail('Cache should never be ready for non-existent element');
		});
	});

	test.test('Non-existent element with destroy', (t) => {

		const cache = new Cache(nonExistent);

		cache.on('destroy', () => {
			t.end();
		}).on('ready', () => {
			t.fail('Cache should never be ready for non-existent element');
		});

		cache.destroy();
	});

	test.test('Symlink', async (t) => {

		await promisify(symlink)(join(testDir, 'empty-dir'), slink);

		const cache = new Cache(slink);

		cache.on('destroy', async () => {
			await promisify(unlink)(slink);
			t.end();
		}).on('ready', () => {
			t.fail('Cache should never be ready for non-existent element');
		});
	});

	test.test('Cache file with error', async (t) => {

		const path = join(testDir, 'temp-file');

		await promisify(writeFile)(path, '');

		const cache = new Cache(path, {
			store: true
		});

		return new Promise((resolve) => {
			cache.on('destroy', () => {
				resolve();
				t.end();
			}).on('error', (error) => {
				t.ok(error instanceof Error);
			});

			promisify(unlink)(path);
		});
	});

	test.test('Cache directory with error', async (t) => {

		const path = join(testDir, 'temp-dir');

		await promisify(mkdir)(path);

		const cache = new Cache(path);

		return new Promise((resolve) => {
			cache.on('destroy', () => {
				resolve();
				t.end();
			}).on('error', (error) => {
				t.ok(error instanceof Error);
			});

			promisify(rmdir)(path);
		});
	});

	test.test('Empty directory', (t) => {

		const path = join(testDir, 'empty-dir');

		const cache = new Cache(path);

		cache.on('destroy', () => {
			t.end();
		}).on('ready', (c) => {
			t.equal(cache, c);
			cache.destroy();
		});
	});

	test.test('Non-empty directory with filter', (t) => {

		const path = join(testDir, 'dir');

		const cache = new Cache(path, {
			filter(location) {
				return relative(path, location) !== 'file';
			}
		});

		cache.on('destroy', () => {
			t.end();
		}).on('ready', (c) => {
			t.equal(c.list().length, 1);
			t.equal(cache, c);
			cache.destroy();
		});
	});

	test.test('Non-empty directory with store', (t) => {

		const path = join(testDir, 'dir');

		const cache = new Cache(path, {
			store: true
		});

		cache.on('destroy', () => {
			t.end();
		}).on('ready', (c) => {
			t.equal(cache, c);
			cache.destroy();
		});
	});

	test.test('Root file', (t) => {

		const path = join(testDir, 'dir', 'file');

		const cache = new Cache(path, (c) => {
			t.equal(cache, c);
			t.match(cache, {
				data: {},
				path
			});
		});

		cache.on('destroy', () => {
			t.end();
		}).on('ready', (c) => {
			t.equal(cache, c);
			cache.destroy();
		});
	});

	test.test('Remove root directory on ready', (t) => {

		const path = join(testDir, 'empty-dir');
		const cache = new Cache(path, {
			persistent: true
		});

		cache.on('destroy', () => {
			t.end();
		}).on('error', (error) => {
			t.ok(error instanceof Error);
		}).on('ready', (c) => {
			t.equal(cache, c);

			promisify(rmdir)(path);
		});
	});

	test.test('Modify root file before ready', (t) => {

		const path = join(testDir, 'dir', 'file');

		const cache = new Cache(path, {
			persistent: true
		});

		cache.on('change', (element) => {
			t.equal(element.location, '<root>');
		}).on('destroy', () => {
			t.end();
		}).on('error', (error) => {
			t.fail(error.message);
		}).on('ready', () => {
			t.ok(cache.has('/'));
		}).on('update', (c) => {
			t.equal(cache, c);
			cache.destroy();
		}).on('watch', () => {
			writeFileSync(path, 'data');
		});
	});

	test.test('Modify root file on ready', (t) => {

		const path = join(testDir, 'dir', 'file');

		const cache = new Cache(path);

		cache.on('destroy', () => {
			t.end();
		}).on('ready', async () => {
			await promisify(writeFile)(path, 'data');
		}).on('update', (c) => {
			t.equal(cache, c);
			cache.destroy();
		}).on('change', (element) => {
			t.equal(element.location, '<root>');
		});
	});

	test.test('Rename root file on ready', (t) => {

		const path = join(testDir, 'dir', 'file');

		const cache = new Cache(path);

		cache.on('destroy', () => {
			t.end();
		}).on('error', (error) => {
			t.ok(error instanceof Error);
		}).on('ready', async () => {
			await promisify(rename)(path, `${path}2`);
		});
	});

	test.end();
});

tap.test('Cache.prototype.destroy()', (test) => {

	const cache = new Cache(testDir);

	cache.on('destroy', () => {
		test.end();
	}).on('error', (error) => {
		test.fail(error.message);
	}).on('ready', () => {
		cache.destroy();
		cache.destroy(); // Check for errors when calling destroy twice
	});
});

tap.test('Cache.prototype.get()', (test) => {

	const path = join(testDir);

	const cache = new Cache(path);

	cache.on('destroy', () => {
		test.end();
	}).on('error', (error) => {
		test.fail(error.message);
	}).on('ready', (c) => {
		test.ok(typeof c.get() === 'object');
		test.ok(typeof c.get('/') === 'object');
		test.equal(c.get(nonExistent), null);
		cache.destroy();
	});
});

tap.test('Cache.prototype.has()', (test) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		test.end();
	}).on('error', (error) => {
		test.fail(error.message);
	}).on('ready', (c) => {
		test.ok(c.has('/'));
		cache.destroy();
	});
});

tap.test('Cache.prototype.list()', (test) => {

	const path = join(testDir, 'dir');

	const cache = new Cache(path);

	cache.on('destroy', () => {
		test.end();
	}).on('error', (error) => {
		test.fail(error.message);
	}).on('ready', (c) => {
		test.match(c.list(), ['<root>']);
		test.match(c.list((location) => {
			return location !== '<root>';
		}), []);

		cache.destroy();

		test.match(c.list(), []);
	});
});

tap.tearDown(cleanUp);