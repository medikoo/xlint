'use strict';

var isCallable    = require('es5-ext/object/is-callable')
  , callable      = require('es5-ext/object/valid-callable')
  , resolve       = require('path').resolve
  , stat          = require('deferred').promisify(require('fs').stat)
  , eePipe        = require('event-emitter').pipe
  , normalizeOpts = require('./_options/normalize')
  , lintDirectory = require('./lint-directory').lintDirectory
  , lintFile      = require('./lint-file').lintFile

  , lintPath;

lintPath = function (linter, path, options) {
	var promise, processor;
	promise = stat(path)(function (stats) {
		var isFile;
		if (stats.isFile()) {
			isFile = true;
			processor = lintFile(linter, path, options);
		} else if (stats.isDirectory()) {
			processor = lintDirectory(linter, path, options);
		} else {
			return new TypeError("File is neither file nor directory");
		}
		if (options.stream || options.watch) {
			eePipe(processor, promise);
			promise.close = processor.close;
		}
		promise.root = processor.root;
		return isFile ? processor(function (data) {
			if (options.stream) {
				promise.emit('change', { type: 'add', name: '', report: data });
			}
			return { '.': data };
		}) : processor;
	});
	promise.xlintId = linter.xlintId;
	return promise;
};

module.exports = exports = function (linter, path/*, options, cb*/) {
	var options, cb;

	callable(linter);
	path = resolve(String(path));
	options = arguments[2];
	cb = arguments[3];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	} else {
		options = Object(options);
		if (options.options) {
			options.options = normalizeOpts(options.options);
		}
	}

	return lintPath(linter, path, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintPath = lintPath;
