'use strict';

var isArray    = Array.isArray
  , push       = Array.prototype.push
  , copy       = require('es5-ext/lib/Array/prototype/copy')
  , remove     = require('es5-ext/lib/Array/prototype/remove')
  , compact    = require('es5-ext/lib/Object/compact')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , isObject   = require('es5-ext/lib/Object/is-object')
  , some       = require('es5-ext/lib/Object/some')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , dirname    = require('path').dirname
  , sep        = require('next/lib/path/sep')
  , getMap     = require('./get-map')

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
						value.forEach(function (mod) {
							switch (mod.action) {
								case 'add':
								if (list) {
									push.apply(list, mod.value);
									list.sort();
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
						value = list;
					} else {
						value = copy.call(value);
					}
				}
				options[name] = value;
			});
		});
	}, null, comparePaths);

	return compact(options);
};

reader = function (filename, mapPromise, watch) {
	var promise, current;
	if (watch) {
		mapPromise.on('change', function (map) {
			var nopts = calculate(filename, map);
			if (!isCopy(current, nopts, Infinity)) {
				current = nopts;
				promise.emit('change', current);
			}
		});
	}
	return (promise = mapPromise(function (map) {
		return (current = calculate(filename, map));
	}));
};

read = module.exports = function (filename, watch) {
	return reader(filename, getMap(dirname(filename), watch), watch);
};
read.reader = reader;
