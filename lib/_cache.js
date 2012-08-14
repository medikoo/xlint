'use strict';

var parse      = JSON.parse
  , stringify  = JSON.stringify
  , getNull    = require('es5-ext/lib/Function/k')(null)
  , mapToArray = require('es5-ext/lib/Object/map-to-array')
  , memoize    = require('memoizee')
  , deferred   = require('deferred')
  , path       = require('path')
  , stat       = deferred.promisify(require('fs').stat)
  , readFile   = require('next/lib/fs/read-file').readFile
  , writeFile  = require('next/lib/fs/write-file').writeFile
  , findRoot   = require('next/lib/module/find-package-root').findRoot

  , dirname = path.dirname, resolve = path.resolve

  , serializeOpts, getCache, getFileData, filename = '.lintcache';

serializeOpts = memoize(function (opts) {
	return mapToArray(opts, function (value, name) {
		return (value === true) ? name : (name + ':' + value);
	}, null, true).join('|');
});

getCache = memoize(function (root) {
	var data, save, path;
	path = resolve(root, filename);
	save = function () {
		var str;
		try {
			str = stringify(data);
		} catch (e) {
			console.error("xlint: Could not stringify data for cache", data,
				e.message);
			return;
		}
		writeFile(path, str).end(null, function (err) {
			console.error("xlint: Could not write cache '" + filename + "'",
				err.message);
		});
	};
	return readFile(path, { loose: true })(function (str) {
		if (str == null) {
			data = {};
		} else {
			try {
				data = parse(str);
			} catch (e) {
				console.error("xlint: Could not parse data from cache", str);
				data = {};
			}
		}
		return { data: data, save: save };
	});
});

getFileData = function (filename, stats) {
	var dir = dirname(filename)
	return deferred(findRoot(dir)(function (root) {
		return getCache(root || dir);
	}), stats || stat(filename)(null, getNull), filename.slice(dir.length + 1));
};

exports.get = function (filename, options, stats) {
	return getFileData(filename, stats).match(function (cache, stats, name) {
		var data = cache.data;
		if (!data[name]) {
			return null;
		}
		if (!stats || !stats.isFile() ||
				(data[name]._mtime !== stats.mtime.getTime()) ||
				(data[name]._size !== stats.size)) {
			delete data[name];
			cache.save();
			return null;
		}
		return data[name][serializeOpts(options)] || null;
	});
};

exports.save = function (filename, options, report) {
	getFileData(filename).end(function (data) {
		var cache, stat, name;
		cache = data[0];
		stat = data[1];
		name = data[2];
		data = cache.data;

		if (!stat || !stat.isFile()) {
			if (data[name]) {
				delete data[name];
				cache.save();
			}
			console.error("xlint: tried to save cache for not accessible file");
			return;
		}
		if (!data[name] ||
				(data[name]._mtime != stat.mtime.getTime()) ||
				(data[name]._size !== stat.size)) {
			data[name] = { _mtime: stat.mtime.getTime(), _size: stat.size };
		}
		data[name][serializeOpts(options)] = report;
		cache.save();
	});
};
