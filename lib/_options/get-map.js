'use strict';

var memoize   = require('es5-ext/lib/Function/prototype/memoize')
  , promisify = require('deferred').promisify
  , readFile  = promisify(require('fs').readFile)
  , resolve   = require('path').resolve
  , getMap    = require('next/lib/fs/_get-conf-file-map')
  , FindRoot  = require('next/lib/fs/find-root').FindRoot
  , watchPath = require('next/lib/fs/watch-path')
  , parse     = memoize.call(require('./parse'), { primitive: true })

  , Map = getMap.Map

  , isRoot, isRootWatch, check, getOptionsMap;

check = function (path, dirname) {
	return readFile(path)(function (data) {
		return parse(data, dirname).root;
	}, false);
};

isRoot = function (path) {
	var confPath, promise;
	confPath = resolve(path, '.lint');
	promise = check(confPath, path);
	promise.confPath = confPath;
	promise.path = path;
	return promise;
};

isRootWatch = function (path) {
	var promise, current;
	promise = isRoot(path);
	promise.aside(function (value) {
		current = value;
	});
	watchPath(promise.confPath).on('change', function (event) {
		if (current == null) {
			return;
		}
		if (event.type == 'remove') {
			if (current) {
				current = promise.value = false;
				promise.emit('change', current, path);
			}
		} else {
			check(promise.confPath).end(function (isRoot) {
				if (isRoot !== current) {
					current = promise.value = isRoot;
					promise.emit('change', current, path);
				}
			});
		}
	});
	return promise;
};

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
getOptionsMap.parse = parse;
getOptionsMap.isRoot = isRoot;
getOptionsMap.isRootWatch = isRootWatch;
