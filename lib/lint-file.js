'use strict';

var isCallable    = require('es5-ext/lib/Object/is-callable')
  , isCopy        = require('es5-ext/lib/Object/is-copy')
  , deferred      = require('deferred')
  , resolve       = require('path').resolve
  , readFile      = require('next/lib/fs/read-file')
  , lint          = require('./lint')
  , normalizeSrc  = require('./_normalize-source')
  , normalizeOpts = require('./_options/normalize')
  , readOptions   = require('./_options/read')

  , lintFile;

lintFile = function (filename, options) {
	var filePromise, lintOptsPromise, src, lintOpts, promise, result, onchange;

	filePromise = readFile(filename, { watch: options.watch });
	lintOptsPromise = readOptions(filename, options.watch);

	promise = deferred(filePromise, lintOptsPromise)(function (data) {
		src = normalizeSrc(String(data[0]));
		lintOpts = data[1];
		if (options.watch) {
			filePromise.on('end', function () {
				lintOptsPromise.close();
				promise.emit('end');
			});
		}
		return (result = lint(src, lintOpts));
	}, options.watch ? function (err) {
		lintOptsPromise.close();
		return err;
	} : null);

	if (options.watch) {
		onchange = function () {
			var nresult = lint(src, lintOpts);
			if (!isCopy(result, nresult, Infinity)) {
				promise.value = result = nresult;
				promise.emit('change', result);
			}
		};

		filePromise.on('change', function (nsrc) {
			nsrc = normalizeSrc(String(nsrc));
			if (src !== nsrc) {
				src = nsrc;
				onchange();
			}
		});
		lintOptsPromise.on('change', function (nopts) {
			lintOpts = nopts;
			onchange();
		});

		promise.close = function () {
			filePromise.close();
			lintOptsPromise.close();
		};
	}
	return promise;
};
lintFile.returnsPromise = true;

module.exports = exports = function (filename/*, options, cb*/) {
	var options, cb;

	filename = resolve(String(filename));
	options = arguments[1];
	cb = arguments[2];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	} else {
		options = normalizeOpts(options);
	}

	return lintFile(filename, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFile = lintFile;
