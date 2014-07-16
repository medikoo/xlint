'use strict';

var getNull        = require('es5-ext/function/constant')(null)
  , invoke         = require('es5-ext/function/invoke')
  , assign         = require('es5-ext/object/assign')
  , forEach        = require('es5-ext/object/for-each')
  , isCallable     = require('es5-ext/object/is-callable')
  , callable       = require('es5-ext/object/valid-callable')
  , endsWith       = require('es5-ext/string/#/ends-with')
  , deferred       = require('deferred')
  , fs             = require('fs')
  , path           = require('path')
  , commonPath     = require('path2/common')
  , isIgnored      = require('fs2/is-ignored')
  , getOptsReader  = require('./lib/options/read').getReader
  , normalizeOpts  = require('./lib/options/normalize')
  , lintignoreMode = require('./lib/lintignore-mode')
  , LintFile       = require('./lint-file').LintFile

  , map = Array.prototype.map
  , isArray = Array.isArray
  , promisify = deferred.promisify
  , read = promisify(fs.read)
  , open = promisify(fs.open), close = promisify(fs.close)
  , resolve = path.resolve, sep = path.sep
  , getIsIgnored = isIgnored.getIsIgnored
  , applyGlobalRules = isIgnored.applyGlobalRules

  , reNoExt = /(?:^|[\/\\])[\0-\u002d\u0030-\u005b\u005d-\uffff]+$/
  , reShebang = /^#![\u0021-\uffff]+(?:\/node|\/env node)\s/

  , lintFiles, LintFiles;

LintFiles = function () {
	this.result = {};
	this.linters = {};
	assign(this, deferred());
	this.promise.close = this.close.bind(this);
	this.clear = this.clear.bind(this);
};
LintFiles.prototype = {
	init: function () {
		if (this.watch) this.ignores = {};
		deferred.map(this.files, function (name) {
			if (this.globalRules && applyGlobalRules(this.getFilename(name), this.globalRules)) {
				return null;
			}
			if (endsWith.call(name, '.' + this.fileExt)) return this.checkIsIgnored(name);
			if ((this.fileExt === 'js') && reNoExt.test(name)) {
				return this.checkSheBang(name)(function (isNodeScript) {
					return isNodeScript ? this.checkIsIgnored(name) : null;
				});
			}
			return null;
		}, this).done(this.resolve.bind(this, this.result), this.reject);
		this.promise.root = this.root;
		this.promise.xlintId = this.linter.xlintId;
		return this.promise;
	},
	getFilename: function (name) {
		return this.root ? (this.root + sep + name) : name;
	},
	checkSheBang: function (name) {
		return open(this.getFilename(name), 'r')(function (fd) {
			var buffer = new Buffer(100);
			return read(fd, buffer, 0, 100, null)(function () {
				close(fd);
				return reShebang.test(String(buffer)) ? true : false;
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
			return isIgnored ? null : this.lint(name);
		}.bind(this));
	},
	lint: function (name) {
		var lint;
		lint = new LintFile();
		lint.linter = this.linter;
		lint.filename = lint.realFilename = this.getFilename(name);
		lint.inputOptions = this.options;
		lint.watch = this.watch;
		lint.cache = this.cache;
		lint.readOptions = this.readOptions;
		lint = this.linters[name] = lint.init();
		if (this.watch) {
			lint.on('change', function (report) {
				this.result[name] = report;
				if (this.promise.resolved || this.stream) {
					this.promise.emit('change', { type: 'update', name: name, report: report });
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
			if (this.promise.resolved || this.stream) {
				this.promise.emit('change', { type: 'add', name: name, report: report });
			}
		}.bind(this), function (err) {
			if (!err.code || (err.code === 'EMFILE')) return err;
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
			if (this.promise.resolved || this.stream) {
				this.promise.emit('change', { type: 'remove', name: name });
			}
		}
	},
	close: function () {
		if (this.linters) {
			forEach(this.linters, invoke('close'));
			if (this.ignores) forEach(this.ignores, invoke('close'));
			delete this.linters;
		}
	}
};

lintFiles = function (linter, files, options) {
	var lint, rootIndex, root, orgIsRoot, name, ignoreRules;

	if (files.length > 1) {
		root = commonPath.apply(null, files);
		if (root) {
			rootIndex = root.length + 1;
			files = files.map(function (name) { return name.slice(rootIndex); });
		}
	}

	lint = new LintFiles();
	lint.linter = linter;
	lint.files = files;
	lint.root = root;
	lint.options = options.options;
	lint.watch = options.watch;
	lint.cache = options.cache;
	lint.fileExt = options.fileExt || 'js';
	if (options.ignoreRules) {
		ignoreRules = isArray(options.ignoreRules)
			? options.ignoreRules.concat('lint') : [String(options.ignoreRules), 'lint'];
	} else {
		ignoreRules = ['lint'];
	}

	// Read options
	lint.readOptions = getOptsReader(options.watch);

	name = options.watch ? 'isRoot' : 'isRootWatcher';
	orgIsRoot = lintignoreMode[name];
	lintignoreMode[name] = lint.readOptions.isRoot;
	assign(lint, getIsIgnored(ignoreRules, null, options.watch));
	lintignoreMode[name] = orgIsRoot;

	return lint.init();
};
lintFiles.returnsPromise = true;

module.exports = exports = function (linter, files/*, options, cb*/) {
	var options, cb;

	callable(linter);
	files = map.call(files, function (file) { return resolve(String(file)); });
	options = arguments[2];
	cb = arguments[3];
	if ((cb == null) && isCallable(options)) {
		cb = options;
		options = {};
	} else {
		options = Object(options);
		if (options.options) options.options = normalizeOpts(options.options);
	}

	return lintFiles(linter, files, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintFiles = lintFiles;
exports.LintFiles = LintFiles;
