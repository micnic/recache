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