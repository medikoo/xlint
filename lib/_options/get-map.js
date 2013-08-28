'use strict';

var noop      = require('es5-ext/function/noop')
  , memoize   = require('memoizee')
  , deferred  = require('deferred')
  , dirname   = require('path').dirname
  , getMap    = require('fs2/lib/_get-conf-file-map')
  , findRoot  = require('fs2/lib/_find-root')
  , parse     = require('./parse')

  , ConfMap = getMap.ConfMap

  , isRoot, getOptionsMap;

isRoot = function (path) {
	var promise, current, watcher;

	if (dirname(path) === path) {
		promise = deferred(false);
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
				promise.emit('change', nvalue, path);
			}
		});
		promise.close = watcher.close;
	}
	return promise;
};

getOptionsMap = module.exports = function (path, watch) {
	var map;
	map = new ConfMap(path, watch);
	map.filename = '.lint';
	map.readRules = memoize(watch ? getMap.readRulesWatcher : getMap.readRules,
		{ primitive: true });
	map.parse = parse;
	return map.init(findRoot(isRoot.bind(map), path, { watch: watch }));
};
getOptionsMap.returnsPromise = true;
getOptionsMap.isRoot = isRoot;
