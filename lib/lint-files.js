'use strict';

var map            = Array.prototype.map
  , push           = Array.prototype.push
  , commonLeft     = require('es5-ext/lib/Array/prototype/common-left')
  , getNull        = require('es5-ext/lib/Function/k')(null)
  , invoke         = require('es5-ext/lib/Function/invoke')
  , extend         = require('es5-ext/lib/Object/extend')
  , forEach        = require('es5-ext/lib/Object/for-each')
  , isCallable     = require('es5-ext/lib/Object/is-callable')
  , endsWith       = require('es5-ext/lib/String/prototype/ends-with')
  , deferred       = require('deferred')
  , promisify      = deferred.promisify
  , fs             = require('fs')
  , path           = require('path')
  , isIgnored      = require('next/lib/fs/is-ignored')
  , sep            = require('next/lib/path/sep')
  , getOptsReader  = require('./_options/read').getReader
  , normalizeOpts  = require('./_options/normalize')
  , lintignoreMode = require('./_lintignore-mode')
  , LintFile       = require('./lint-file').LintFile

  , open = promisify(fs.open), read = promisify(fs.read)
  , close = promisify(fs.close)
  , dirname = path.dirname, resolve = path.resolve
  , getIsIgnored = isIgnored.getIsIgnored
  , applyGlobalRules = isIgnored.applyGlobalRules

	, reNoExt = /(?:^|[\/\\])[\0-\u002d\u0030-\u005b\u005d-\uffff]+$/
  , reShebang = /^#![\u0021-\uffff]+(?:\/node|\/env node)\s/

  , lintFiles, LintFiles;

LintFiles = function () {
	this.result = {};
	this.linters = {};
	extend(this, deferred());
	this.promise.close = this.close.bind(this);
	this.clear = this.clear.bind(this);
};
LintFiles.prototype = {
	init: function () {
		if (this.watch) {
			this.ignores = {};
		}
		deferred.map(this.files.map(function (name) {
			if (this.globalRules &&
					applyGlobalRules(this.getFilename(name), this.globalRules)) {
				return null;
			}
			if (endsWith.call(name, '.js')) {
				return this.checkIsIgnored(name);
			}
			if (reNoExt.test(name)) {
				return this.checkSheBang(name)(function (isNodeScript) {
					return isNodeScript ? this.checkIsIgnored(name) : null;
				});
			}
			return null;
		}, this)).end(this.resolve.bind(this, this.result), this.resolve);
		this.promise.root = this.root;
		return this.promise;
	},
	getFilename: function (name) {
		return this.root ? (this.root + sep + name) : name;
	},
	checkSheBang: function (name) {
		return open(this.getFilename(name), 'r')(function (fd) {
			var buffer = new Buffer(100);
			return read(fd, buffer, 0, 100, null)(function () {
				return close(fd)(function () {
					return reShebang.test(String(buffer)) ? true : false;
				});
			}.bind(this), getNull);
		}.bind(this), getNull);
	},
	checkIsIgnored: function (name) {
		var isIgnored = this.isIgnored(this.getFilename(name));
		if (this.watch) {
			this.ignores[name] = isIgnored;
			isIgnored.on('change', function (value) {
				if (value) {
					this.linters[name].close();
					this.clear(name);
				} else {
					this.lint(name);
				}
			}.bind(this));
		}
		return isIgnored(function (isIgnored) {
			return isIgnored ? null: this.lint(name);
		}.bind(this));
	},
	lint: function (name) {
		var lint;
		lint = new LintFile();
		lint.filename = this.getFilename(name);
		lint.inputOptions = this.options;
		lint.watch = this.watch;
		lint.cache = this.cache;
		lint.readOptions = this.readOptions;
		lint = this.linters[name] = lint.init();
		if (this.watch) {
			lint.on('change', function (report) {
				this.result[name] = report;
				if (this.promise.resolved || this.progress) {
					this.promise.emit('change',
						{ type: 'update', name: name, report: report });
				}
			}.bind(this));
			lint.on('end', function () {
				if (this.ignores) {
					this.ignores[name].close();
					delete this.ignores[name];
				}
				this.clear(name);
			}.bind(this));
		}
		return lint(function (report) {
			this.result[name] = report;
			if (this.promise.resolved || this.progress) {
				this.promise.emit('change',
					{ type: 'add', name: name, report: report });
			}
		}.bind(this), function (err) {
			if (!err.code || (err.code === 'EMFILE')) {
				return err;
			}
			if (this.ignores) {
				this.ignores[name].close();
				delete this.ignores[name];
			}
			delete this.linters[name];
		}.bind(this));
	},
	clear: function (name) {
		if (this.linters[name]) {
			delete this.result[name];
			delete this.linters[name];
			if (this.promise.resolved || this.progress) {
				this.promise.emit('change',
					{ type: 'remove', name: name });
			}
		}
	},
	close: function () {
		if (this.linters) {
			forEach(this.linters, invoke('close'));
			if (this.ignores) {
				forEach(this.ignores, invoke('close'));
			}
			delete this.linters;
		}
	}
};

lintFiles = function (files, options) {
	var lint, rootIndex, root, orgIsRoot, name, ignoreRules;

	if (files.length > 1) {
		rootIndex = commonLeft.apply(files[0], files.slice(1));
		if (rootIndex) {
			root = files[0].slice(0, rootIndex - 1);
			files = files.map(function (name) { return name.slice(rootIndex) });
		}
	}

	lint = new LintFiles();
	lint.files = files;
	lint.root = root;
	lint.options = options.options
	lint.watch = options.watch;
	lint.cache = options.cache;
	if (options.ignoreRules) {
		ignoreRules = isArray(options.ignoreRules) ?
			options.ignoreRules.concat('lint') :
			[String(options.ignoreRules), 'lint'];
	} else {
		ignoreRules = ['lint'];
	}

	// Read options
	lint.readOptions = getOptsReader(options.watch);

	name = options.watch ? 'isRoot' : 'isRootWatch';
	orgIsRoot = lintignoreMode[name];
	lintignoreMode[name] = lint.readOptions.isRoot;
	extend(lint, getIsIgnored(ignoreRules, null, options.watch));
	lintignoreMode[name] = orgIsRoot;

	return lint.init();
};
lintFiles.returnsPromise = true;

module.exports = exports = function (files/*, options, cb*/) {
	var options, cb;

	files = map.call(files, function (file) { return resolve(String(file)) });
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

	return lintFiles(files, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFiles = lintFiles;
exports.LintFiles = LintFiles;
