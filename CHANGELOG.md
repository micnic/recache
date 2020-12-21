## 0.5.3
- Add types to package.json
- Add `.editorconfig`
- Small refactor for event handling

## 0.5.2
- Stricter rules for types

## 0.5.1
- Fix JSDoc types and improve type guards

## 0.5.0
- Support Node 8+
- Add possibility to disable file content caching using `store` option
- Replace `.read()` with `.get()`
- Add `.has()` method
- Add `location` and `path` properties for cached elements
- Add typescript types definitions
- Add `destroy` event

## 0.4.3
- Fix possibility to read object prototype properties of the container object

## 0.4.2
- Fix multiple stability issues introduced in 0.4.0
- Ignore unreadable elements errors because of the Node.js watcher behavior
- Allow multiple updates at the same time without memory leak warning
- Do not emit update if actually no changes were made

## 0.4.1
- Fix error when a file is provided as the root element
- Remove trailing slashes in the provided root element location

## 0.4.0
- Upgrade code to ES6
- Drop support of Node.js <4.0
- Add `.list()` method
- Add `data` member for cache instance and element objects
- Fix some cases where cache fails to update its content on fast changes

## 0.3.1
- Stop caching process if the cache is destroyed while reading files and directories

## 0.3.0
- Fix modified files not triggering change event
- Remove `data` member from element object as it is not very used

## 0.2.1
- Always emit directory and file events, not only when the cache is ready

## 0.2.0
- Added possibility to filter elements using strings
- Added separated filter options for files and directories
- Small readme fixes

## 0.1.0
- First public release