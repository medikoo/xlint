'use strict';

var isCallable    = require('es5-ext/lib/Object/is-callable')
  , resolve       = require('path').resolve
  , stat          = require('deferred').promisify(require('fs').stat)
  , normalizeOpts = require('./_options/normalize')
  , lintDirectory = require('./lint-directory').lintDirectory
  , lintFile      = require('./lint-file').lintFile

  , lintPath;

lintPath = function (path, options) {
	return stat(path)(function (stats) {
		if (stats.isFile()) {
			return lintFile(path, options);
		}
		if (stats.isDirectory()) {
			return lintDirectory(path, options);
		}
		return new TypeError("File is neither file nor directory");
	});
};

module.exports = exports = function (path/*, options, cb*/) {
	var options, cb;

	path = resolve(String(path));
	options = arguments[1];
	cb = arguments[2];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	} else {
		options = Object(options);
		if (options.options) {
			options.options = normalizeOpts(options.options);
		}
	}

	return lintPath(path, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintPath = lintPath;
