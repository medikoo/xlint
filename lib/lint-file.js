'use strict';

var isCallable  = require('es5-ext/lib/Object/is-callable')
  , isCopy      = require('es5-ext/lib/Object/is-copy')
  , deferred    = require('deferred')
  , resolve     = require('path').resolve
  , readFile    = require('next/lib/fs/read-file')
  , lint        = require('./lint')
  , normalize   = require('./_normalize-source')
  , readOptions = require('./_options/read')

  , lintFile;

lintFile = function (filename, options) {
	var fileWatch, lintOptsWatch, src, lintOpts, promise, result, onchange;

	fileWatch = readFile(filename, { watch: options.watch });
	lintOptsWatch = readOptions(filename, options.watch);

	promise = deferred(fileWatch, lintOptsWatch)(function (data) {
		src = normalize(String(data[0]));
		lintOpts = data[1];
		fileWatch.on('end', function () {
			lintOptsWatch.close();
			promise.emit('end');
		});
		return (result = lint(src, lintOpts));
	}, function (err) {
		lintOptsWatch.close();
		return err;
	});

	onchange = function () {
		var nresult = lint(src, lintOpts);
		if (!isCopy(result, nresult, Infinity)) {
			promise.value = result = nresult;
			promise.emit('change', result);
		}
	};

	fileWatch.on('change', function (nsrc) {
		nsrc = normalize(String(nsrc));
		if (src !== nsrc) {
			src = nsrc;
			onchange();
		}
	});
	lintOptsWatch.on('change', function (nopts) {
		lintOpts = nopts;
		onchange();
	});

	promise.close = function () {
		fileWatch.close();
		lintOptsWatch.close();
	};
	return promise;
};
lintFile.returnsPromise = true;

module.exports = exports = function (filename/*, options, cb*/) {
	var options, cb;

	filename = resolve(String(filename));
	options = Object(arguments[1]);
	cb = arguments[2];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	}

	return lintFile(filename, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFile = lintFile;
