'use strict';

var compact       = require('es5-ext/lib/Object/compact')
  , extend        = require('es5-ext/lib/Object/extend')
  , isCallable    = require('es5-ext/lib/Object/is-callable')
  , isCopy        = require('es5-ext/lib/Object/is-copy')
  , deferred      = require('deferred')
  , stat          = deferred.promisify(require('fs').stat)
  , resolve       = require('path').resolve
  , readFile      = require('next/lib/fs/read-file').readFile
  , normalizeSrc  = require('./_normalize-source')
  , normalizeOpts = require('./_options/normalize')
  , readOptions   = require('./_options/read')
  , cache         = require('./_cache')
  , lint          = require('./lint')

  , LintFile, lintFile;

LintFile = function () {
	extend(this, deferred());
	this.fail = this.fail.bind(this);
};
LintFile.prototype = {
	init: function () {
		this.getOptions();
		if (this.cache) {
			this.getFromCache();
		} else {
			this.get();
		}
		if (this.watch) {
			this.promise.close = this.close.bind(this);
		}
		this.promise.root = this.filename;
		return this.promise;
	},
	getOptions: function () {
		this.optsPromise = this.readOptions(this.filename)
			.aside(function (options) {
				this.options = this.inputOptions ?
					compact(extend(options, this.inputOptions)): options;
			}.bind(this));

		if (this.watch) {
			this.optsPromise.on('change', function (nopts) {
				if (this.inputOptions) {
					nopts = compact(extend(nopts, this.inputOptions));
				}
				if (!isCopy(this.options, nopts, Infinity)) {
					this.options = nopts;
					this.onchange();
				}
			}.bind(this));
		}
	},
	readOptions: function (filename) {
		return readOptions(filename, this.watch);
	},
	getSrc: function () {
		var onend = function () {
			this.optsPromise.close();
			this.promise.emit('end');
		}.bind(this);

		this.filePromise = readFile(this.filename, { watch: this.watch })
			.aside(function (src) {
				this.src = normalizeSrc(String(src));
			}.bind(this), this.promise.resolved ? onend : null);
		if (this.watch) {
			this.filePromise.on('change', function (nsrc) {
				nsrc = normalizeSrc(String(nsrc));
				if (this.src !== nsrc) {
					this.src = nsrc;
					this.onchange();
				}
			}.bind(this));
			this.filePromise.on('end', onend);
		}
	},
	getFromCache: function () {
		deferred(this.optsPromise, stat(this.filename)).end(function (data) {
			if (!data[1].isFile()) {
				this.fail(new Error("'" + this.filename + "' is not a file"));
				return;
			}
			cache.get(this.filename, this.options, data[1]).end(function (result) {
				if (result) {
					result.options = this.options;
					result.path = this.filename;
					this.resolve(result);
					if (this.watch) {
						this.getSrc();
					}
				} else {
					this.get();
				}
			}.bind(this), this.fail);
		}.bind(this), this.fail);
	},
	get: function () {
		this.getSrc();
		deferred(this.optsPromise, this.filePromise).end(function (data) {
			var report = lint(this.src, this.options);
			report.options = this.options;
			report.src = this.src;
			report.path = this.filename;
			this.resolve(report);
			if (this.cache) {
				cache.save(this.filename, this.options, report);
			}
		}.bind(this), this.resolve);
	},
	onchange: function () {
		var nresult = lint(this.src, this.options);
		if (!isCopy(this.promise.value, nresult, Infinity)) {
			this.promise.value = nresult;
			nresult.options = this.options;
			nresult.src = this.src;
			nresult.path = this.filename;
			this.promise.emit('change', nresult);
		}
	},
	close: function () {
		this.optsPromise.close();
		this.filePromise.close();
	},
	fail: function (err) {
		if (this.watch) {
			this.optsPromise.close();
		}
		this.resolve(err);
	}
};

lintFile = function (filename, options) {
	var lint = new LintFile();
	lint.filename = filename;
	lint.inputOptions = options.options;
	lint.watch = options.watch;
	lint.cache = options.cache;
	return lint.init();
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
		options = Object(options);
		if (options.options) {
			options.options = normalizeOpts(options.options);
		}
	}

	return lintFile(filename, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFile = lintFile;
exports.LintFile = LintFile;
