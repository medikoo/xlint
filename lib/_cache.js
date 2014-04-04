'use strict';

var getNull   = require('es5-ext/function/constant')(null)
  , toArray   = require('es5-ext/object/to-array')
  , memoize   = require('memoizee')
  , deferred  = require('deferred')
  , path      = require('path')
  , stat      = deferred.promisify(require('fs').stat)
  , readFile  = require('fs2/lib/read-file').readFile
  , writeFile = require('fs2/lib/write-file').writeFile
  , findRoot  = require('next/lib/module/find-package-root').findRoot

  , parse = JSON.parse, stringify = JSON.stringify
  , dirname = path.dirname, resolve = path.resolve

  , serializeOpts, getCache, getFileData, filename = '.lintcache';

serializeOpts = memoize(function (opts) {
	return toArray(opts, function (value, name) {
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
		writeFile(path, str, {}).done(null, function (err) {
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
}, { primitive: true });

getFileData = function (filename, stats) {
	var dir = dirname(filename), name;
	return deferred(findRoot(dir)(function (root) {
		if (!root) {
			root = dir;
		}
		name = filename.slice(root.length + 1);
		return getCache(root);
	}), stats || stat(filename)(null, getNull))(function (data) {
		return [data[0], data[1], name];
	});
};

exports.get = function (linter, filename, options, stats) {
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
		return data[name][String(linter.xlintId) + ':' + serializeOpts(options)] ||
			null;
	});
};

exports.save = function (linter, filename, options, report) {
	getFileData(filename).done(function (data) {
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
				(data[name]._mtime !== stat.mtime.getTime()) ||
				(data[name]._size !== stat.size)) {
			data[name] = { _mtime: stat.mtime.getTime(), _size: stat.size };
		}
		data[name][String(linter.xlintId) + ':' + serializeOpts(options)] = report;
		cache.save();
	});
};
