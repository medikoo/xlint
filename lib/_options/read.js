'use strict';

var isArray        = Array.isArray
  , push           = Array.prototype.push
  , copy           = require('es5-ext/lib/Array/prototype/copy')
  , remove         = require('es5-ext/lib/Array/prototype/remove')
  , uniq           = require('es5-ext/lib/Array/prototype/uniq')
  , forEach        = require('es5-ext/lib/Object/for-each')
  , isCopy         = require('es5-ext/lib/Object/is-copy')
  , isObject       = require('es5-ext/lib/Object/is-object')
  , some           = require('es5-ext/lib/Object/some')
  , startsWith     = require('es5-ext/lib/String/prototype/starts-with')
  , memoize        = require('memoizee')
  , path           = require('path')
  , getConfMap     = require('fs2/lib/_get-conf-file-map')
  , memoizeWatcher = require('fs2/lib/_memoize-watcher')
  , findRoot       = require('fs2/lib/_find-root')
  , readFile       = require('fs2/lib/read-file')
  , getMap         = require('./get-map')
  , parse          = require('./parse')
  , toList         = require('./to-list')

  , dirname = path.dirname, sep = path.sep
  , ConfMap = getConfMap.ConfMap
  , reader, calculate, comparePaths, read;

comparePaths = function (a, b) {
	return (a > b) ? 1 : -1;
};

calculate = function (filename, map) {
	var options = {}, paths = {};
	some(map.map, function (map, path) {
		if (path > filename) {
			return true;
		}
		forEach(map, function (map, path) {
			if (!isObject(map)) {
				return;
			}
			if (!startsWith.call(filename, path + sep) && (filename !== path)) {
				return;
			}
			if (paths[path]) {
				paths[path].push(map);
			} else {
				paths[path] = [map];
			}
		});
	}, null, comparePaths);

	forEach(paths, function (data) {
		data.forEach(function (map) {
			forEach(map, function (value, name) {
				var list;
				if (isArray(value)) {
					// list
					if (value.hasOwnProperty('mod')) {
						list = options[name];
						if (list && !isArray(list)) {
							list = toList(list);
						}
						value.forEach(function (mod) {
							switch (mod.action) {
								case 'add':
								if (list) {
									push.apply(list, mod.value);
									list = uniq.call(list).sort();
								} else {
									list = copy.call(mod.value);
								}
								break;
								case 'remove':
								if (list) {
									remove.apply(list, mod.value);
								}
							}
						});
						if (!list) {
							return;
						}
						options[name] = list;
					} else {
						options[name] = copy.call(value);
					}
				} else if (value === false) {
					delete options[name];
				} else {
					options[name] = value;
				}
			});
		});
	}, null, comparePaths);

	return options
};

reader = function (filename, mapPromise, watch) {
	var promise, current;
	promise = mapPromise(function (map) {
		return (current = calculate(filename, map));
	});
	if (watch) {
		mapPromise.on('change', function (map) {
			var nopts = calculate(filename, map);
			if (!isCopy(current, nopts, Infinity)) {
				current = nopts;
				promise.emit('change', current);
			}
		});
		promise.close = mapPromise.close;
	}
	return promise;
};

read = module.exports = function (filename, watch) {
	return reader(filename, getMap(dirname(filename), watch), watch);
};
read.reader = reader;
read.getReader = function (watch) {
	var memo, readRules, isRoot, getOptionsMap, getReader;
	memo = watch ? memoizeWatcher : memoize;
	readRules = memo(watch ? getConfMap.readRulesWatcher : getConfMap.readRules);
	isRoot = memo(getMap.isRoot.bind({
		readRules: readRules, watch: watch, filename: '.lint', parse: parse,
		readFile: function (path) {
			return readFile(path, { loose: true, watch: watch });
		}
	}));
	getOptionsMap = memo(function (dirname) {
		var map;
		map = new ConfMap(dirname, watch);
		map.filename = '.lint';
		map.readRules = readRules;
		map.parse = parse;
		return map.init(findRoot(isRoot, dirname, { watch: watch }));
	});

	getReader = function (filename) {
		return reader(filename, getOptionsMap(dirname(filename)), watch);
	};
	getReader.isRoot = isRoot;
	return getReader;
};
