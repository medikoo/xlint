'use strict';

var noop      = require('es5-ext/lib/Function/noop')
  , memoize   = require('memoizee')
  , deferred  = require('deferred')
  , path      = require('path')
  , getMap    = require('next/lib/fs/_get-conf-file-map')
  , findRoot  = require('next/lib/fs/_find-root')
  , parse     = require('./parse')

  , dirname = path.dirname, resolve = path.resolve
  , Map = getMap.Map

  , isRoot, getOptionsMap, GetMap;

isRoot = function (path) {
	var confPath, promise, current, watcher;

	if (dirname(path) === path) {
		promise = deferred(true);
		promise.close = noop;
		return promise;
	}

	watcher = this.readRules(path);
	promise = watcher(function (data) {
		return (current = ((data && data.root) || false));
	});
	promise.path = path;
	if (this.watch) {
		watcher.on('change', function (data) {
			var nvalue = ((data && data.root) || false);
			if (current !== nvalue) {
				promise.value = current = nvalue;
				promise.emit('change', nvalue);
			}
		});
		promise.close = watcher.close;
	}
	return promise;
};

getOptionsMap = module.exports = function (path, watch) {
	var map, finder;
	map = new Map(path, watch);
	map.filename = '.lint';
	map.readRules = memoize(watch ? getMap.readRulesWatcher : getMap.readRules);
	map.parse = parse
	return map.init(findRoot(isRoot.bind(map), path, { watch: watch }));
};
getOptionsMap.returnsPromise = true;
getOptionsMap.isRoot = isRoot;
