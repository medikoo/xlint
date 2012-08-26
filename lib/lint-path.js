'use strict';

var isCallable    = require('es5-ext/lib/Object/is-callable')
  , resolve       = require('path').resolve
  , stat          = require('deferred').promisify(require('fs').stat)
  , eePipe        = require('event-emitter').pipe
  , normalizeOpts = require('./_options/normalize')
  , lintDirectory = require('./lint-directory').lintDirectory
  , lintFile      = require('./lint-file').lintFile

  , lintPath;

lintPath = function (path, options) {
	var promise, linter;
	return (promise = stat(path)(function (stats) {
		var isFile;
		if (stats.isFile()) {
			isFile = true;
			linter = lintFile(path, options);
		} else if (stats.isDirectory()) {
			linter = lintDirectory(path, options);
		} else {
			return new TypeError("File is neither file nor directory");
		}
		if (options.progress || options.watch) {
			eePipe(linter, promise);
			promise.close = linter.close;
		}
		promise.root = linter.root;
		return isFile ? linter(function (data) {
			if (options.progress) {
				promise.emit('change', { type: 'add', name: '', report: data });
			}
			return { "": data };
		}) : linter;
	}));
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
