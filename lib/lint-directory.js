'use strict';

var push           = Array.prototype.push
  , d              = require('es5-ext/lib/Object/descriptor')
  , isCallable     = require('es5-ext/lib/Object/is-callable')
  , endsWith       = require('es5-ext/lib/String/prototype/ends-with')
  , deferred       = require('deferred')
  , resolve        = require('path').resolve
  , readdir        = require('next/lib/fs/readdir')
  , getOptsReader  = require('./_options/read').getReader
  , normalizeOpts  = require('./_options/normalize')
  , lintignoreMode = require('./_lintignore-mode')
  , LintFiles      = require('./lint-files').LintFiles

  , reExtension = new RegExp('(?:^|[\\/\\\\])(?:'
		+ '[\0-\\-0-\\[\\]-\uffff]+|'
		+ '[\0-\\.0-\\[\\]-\uffff]*\\.js)$')

  , lintDirectory, LintDirectory;

LintDirectory = function () { LintFiles.call(this) };
LintDirectory.prototype = Object.create(LintFiles.prototype, {
	init: d(function () {
		var waiting;
		this.reader = readdir(this.root, {
			watch: this.watch, depth: this.depth, progress: this.progress,
			ignoreRules: this.ignoreRules,
			type: { file: true }, pattern: reExtension
		});
		if (this.watch || this.progress) {
			if (this.progress) {
				waiting = [];
			}
			this.reader.on('change', function (data) {
				if (this.promise.resolved) {
					data.added.forEach(this.prelint, this);
				} else {
					push.apply(waiting, data.added.map(this.prelint, this));
				}
				data.removed.forEach(function (name) {
					if (this.linters[name]) {
						this.linters[name].close();
						this.clear(name);
					}
				}, this);
			}.bind(this));
			this.reader.on('end', function () {
				delete this.linters;
				this.promise.emit('end');
			}.bind(this));
		}
		this.reader.end(function (names) {
			deferred.map(this.progress ? waiting : names.map(this.prelint, this))
				.end(this.resolve.bind(this, this.result), this.resolve);
		}.bind(this), this.resolve);
		return this.promise;
	}),
	prelint: d(function (name) {
		if (endsWith.call(name, '.js')) return this.lint(name);
		return this.checkSheBang(name)(function (isNodeScript) {
			return isNodeScript ? this.lint(name) : null;
		});
	}),
	close: d(function () {
		if (this.linters) {
			this.reader.close();
			LintFiles.prototype.close.call(this);
		}
	})
});

lintDirectory = function (path, options) {
	var lint, orgIsRoot, name, promise;

	lint = new LintDirectory();
	lint.root = path;
	lint.options = options.options
	lint.watch = options.watch;
	lint.cache = options.cache;
	lint.depth = options.depth;
	lint.progress = options.progress;
	if (options.ignoreRules) {
		lint.ignoreRules = isArray(options.ignoreRules) ?
			options.ignoreRules.concat('lint') :
			[String(options.ignoreRules), 'lint'];
	} else {
		lint.ignoreRules = ['lint'];
	}

	lint.readOptions = getOptsReader(options.watch);

	name = options.watch ? 'isRoot' : 'isRootWatch';
	orgIsRoot = lintignoreMode[name];
	lintignoreMode[name] = lint.readOptions.IsRoot;
	promise = lint.init();
	lintignoreMode[name] = orgIsRoot;
	return promise;
};
lintDirectory.returnsPromise = true;

module.exports = exports = function (dirname/*, options, cb*/) {
	var options, cb;

	dirname = resolve(String(dirname));
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

	return lintDirectory(dirname, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintDirectory = lintDirectory;
exports.LintDirectory = LintDirectory;
