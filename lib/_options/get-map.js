'use strict';

var memoize   = require('memoizee')
  , resolve   = require('path').resolve
  , getMap    = require('next/lib/fs/_get-conf-file-map')
  , FindRoot  = require('next/lib/fs/find-root').FindRoot
  , readFile  = require('next/lib/fs/read-file')
  , parse     = memoize(require('./parse'), { primitive: true })

  , Map = getMap.Map

  , isRoot, isRootWatch, check, getOptionsMap;

check = function (data, path) {
	return ((data != null) && parse(data, path).root) || false;
};

isRoot = function (path) {
	var confPath, promise;
	confPath = resolve(path, '.lint');
	promise = readFile(confPath, { loose: true })(function (data) {
		return check(data, path);
	});
	promise.confPath = confPath;
	promise.path = path;
	return promise;
};
isRoot.returnsPromise = true;

isRootWatch = function (path) {
	var confPath, promise, current, watcher;
	confPath = resolve(path, '.lint');
	watcher = readFile(confPath, { loose: true, watch: true });
	promise = watcher(function (data) {
		return (current = check(data, path));
	});
	promise.confPath = confPath;
	promise.path = path;
	watcher.on('change', function (data) {
		var nvalue = check(data, path);
		if (current !== nvalue) {
			promise.value = current = nvalue;
			promise.emit('change', nvalue);
		}
	});
	promise.close = watcher.close;
	return promise;
};
isRootWatch.returnsPromise = true;

getOptionsMap = module.exports = function (path, watch) {
	var map, finder;
	map = new Map(path, watch);
	map.filename = '.lint';
	map.readRules = watch ? getMap.readRulesWatch : getMap.readRules;
	map.parse = parse
	finder = new FindRoot(path, watch);
	finder.isRoot = watch ? isRootWatch : isRoot;
	finder.next();
	return map.init(finder.promise);
};
getOptionsMap.returnsPromise = true;
getOptionsMap.parse = parse;
getOptionsMap.isRoot = isRoot;
getOptionsMap.isRootWatch = isRootWatch;
