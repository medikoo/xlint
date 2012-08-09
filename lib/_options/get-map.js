'use strict';

var memoize   = require('memoizee')
  , resolve   = require('path').resolve
  , getMap    = require('next/lib/fs/_get-conf-file-map')
  , FindRoot  = require('next/lib/fs/find-root').FindRoot
  , parse     = require('./parse')

  , Map = getMap.Map

  , isRoot, getOptionsMap, GetMap;

isRoot = function (path) {
	var confPath, promise, current, watcher;
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
	map.readRules = memoize(watch ? getMap.readRulesWatch : getMap.readRules);
	map.parse = parse
	finder = new FindRoot(path, watch);
	finder.isRoot = isRoot.bind(map);
	finder.next();
	return map.init(finder.promise);
};
getOptionsMap.returnsPromise = true;
getOptionsMap.isRoot = isRoot;
