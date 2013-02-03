'use strict';

var compact       = require('es5-ext/lib/Object/compact')
  , extend        = require('es5-ext/lib/Object/extend')
  , forEach       = require('es5-ext/lib/Object/for-each')
  , isCallable    = require('es5-ext/lib/Object/is-callable')
  , isCopy        = require('es5-ext/lib/Object/is-copy')
  , callable      = require('es5-ext/lib/Object/valid-callable')
  , contains      = require('es5-ext/lib/String/prototype/contains')
  , deferred      = require('deferred')
  , stat          = deferred.promisify(require('fs').stat)
  , resolve       = require('path').resolve
  , readFile      = require('fs2/lib/read-file').readFile
  , normalizeSrc  = require('./_normalize-source')
  , normalizeOpts = require('./_options/normalize')
  , readOptions   = require('./_options/read')
  , cache         = require('./_cache')

  , LintFile, lintFile, parseOptions;

parseOptions = function (goptions, id) {
	var options = {};
	id = id.toLowerCase();
	forEach(goptions, function (value, name) {
		var oid;
		if (contains.call(name, '.')) {
			oid = name.split('.', 1)[0];
			if (oid !== id) {
				return;
			}
			name = name.slice(oid.length + 1);
		}
		options[name] = value;
	});
	return options;
};

LintFile = function () {
	extend(this, deferred());
	this.fail = this.fail.bind(this);
	this.onchange = this.onchange.bind(this);
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
		this.optsPromise = this.readOptions(this.realFilename)
			.aside(function (options) {
				this.options = parseOptions(this.inputOptions ?
						compact(extend(options, this.inputOptions)) : options,
					this.linter.xlintId);
			}.bind(this));

		if (this.watch) {
			this.optsPromise.on('change', function (nopts) {
				if (this.inputOptions) {
					nopts = compact(extend(nopts, this.inputOptions));
				}
				nopts = parseOptions(nopts, this.linter.xlintId);
				if (!isCopy(this.options, nopts, Infinity)) {
					this.options = nopts;
					if (this.promise.resolved) {
						this.filePromise.aside(this.onchange);
					}
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
				if (this.promise.resolved) {
					this.promise.value.src = this.src;
				}
			}.bind(this), this.promise.resolved ? onend : null);
		if (this.watch) {
			this.filePromise.on('change', function (nsrc) {
				nsrc = normalizeSrc(String(nsrc));
				if (this.src !== nsrc) {
					this.src = nsrc;
					if (this.promise.resolved) {
						this.onchange();
					}
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
			cache.get(this.linter, this.filename, this.options, data[1])
				.end(function (result) {
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
		deferred(this.optsPromise, this.filePromise).end(function () {
			var report = this.linter(this.src, this.options);
			report.options = this.options;
			report.src = this.src;
			report.path = this.filename;
			this.resolve(report);
			if (this.cache) {
				cache.save(this.linter, this.filename, this.options, report);
			}
		}.bind(this), this.resolve);
	},
	onchange: function () {
		var old, nresult;
		old = this.promise.value;
		nresult = this.linter(this.src, this.options);
		nresult.options = old.options;
		nresult.path = old.path;
		nresult.src = old.src;
		if (!isCopy(old, nresult, Infinity)) {
			nresult.options = this.options;
			nresult.src = this.src;
			nresult.path = this.filename;
			this.promise.value = nresult;
			this.promise.emit('change', nresult);
		} else {
			old.options = this.options;
			old.src = this.src;
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

lintFile = function (linter, filename, options) {
	var lint = new LintFile();
	lint.linter = linter;
	lint.filename = filename;
	lint.realFilename = (options.realFilename == null) ? filename :
		String(options.realFilename);
	lint.inputOptions = options.options;
	lint.watch = options.watch;
	lint.cache = options.cache;
	return lint.init();
};
lintFile.returnsPromise = true;

module.exports = exports = function (linter, filename/*, options, cb*/) {
	var options, cb;

	callable(linter);
	filename = resolve(String(filename));
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

	return lintFile(linter, filename, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFile = lintFile;
exports.LintFile = LintFile;
