'use strict';

var isCallable     = require('es5-ext/object/is-callable')
  , callable       = require('es5-ext/object/valid-callable')
  , reEscape       = require('es5-ext/reg-exp/escape')
  , endsWith       = require('es5-ext/string/#/ends-with')
  , d              = require('d')
  , deferred       = require('deferred')
  , memoize        = require('memoizee/plain')
  , resolve        = require('path').resolve
  , readdir        = require('fs2/readdir')
  , getOptsReader  = require('./lib/options/read').getReader
  , normalizeOpts  = require('./lib/options/normalize')
  , lintignoreMode = require('./lib/lintignore-mode')
  , LintFiles      = require('./lint-files').LintFiles

  , isArray = Array.isArray, push = Array.prototype.push
  , getReExtension, lintDirectory, LintDirectory;

getReExtension = memoize(function (ext) {
	if (ext === 'js') {
		return new RegExp('(?:^|[\\/\\\\])(?:[\0-\\-0-\\[\\]-\uffff]+|' +
			'[\0-\\.0-\\[\\]-\uffff]*\\.' + reEscape(ext) + ')$');
	}
	return new RegExp('\\.' + reEscape(ext) + '$');
});

LintDirectory = function () { LintFiles.call(this); };
LintDirectory.prototype = Object.create(LintFiles.prototype, {
	init: d(function () {
		var waiting;
		this.reader = readdir(this.root, { watch: this.watch, depth: this.depth,
			stream: this.stream, ignoreRules: this.ignoreRules, type: { file: true },
			pattern: getReExtension(this.fileExt) });
		if (this.watch || this.stream) {
			if (this.stream) {
				waiting = [];
			}
			this.reader.on('change', function (data) {
				if (this.promise.resolved) {
					deferred.map(data.added, this.prelint, this).done();
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
		this.reader.done(function (names) {
			(this.stream ? deferred.map(waiting) :
					deferred.map(names, this.prelint, this))
				.done(this.resolve.bind(this, this.result), this.reject);
		}.bind(this), this.reject);
		this.promise.root = this.root;
		this.promise.xlintId = this.linter.xlintId;
		return this.promise;
	}),
	prelint: d(function (name) {
		if (endsWith.call(name, this.fileExt)) return this.lint(name);
		if (this.fileExt !== 'js') return null;
		return this.checkSheBang(name)(function (isNodeScript) {
			return isNodeScript ? this.lint(name) : null;
		}.bind(this));
	}),
	close: d(function () {
		if (this.linters) {
			this.reader.close();
			LintFiles.prototype.close.call(this);
		}
	})
});

lintDirectory = function (linter, path, options) {
	var lint, orgIsRoot, name, promise;

	lint = new LintDirectory();
	lint.root = path;
	lint.linter = linter;
	lint.options = options.options;
	lint.watch = options.watch;
	lint.cache = options.cache;
	lint.depth = options.depth;
	lint.fileExt = options.fileExt || 'js';
	lint.stream = options.stream;
	if (options.ignoreRules) {
		lint.ignoreRules = isArray(options.ignoreRules) ?
				options.ignoreRules.concat('lint') :
				[String(options.ignoreRules), 'lint'];
	} else {
		lint.ignoreRules = ['lint'];
	}

	lint.readOptions = getOptsReader(options.watch);

	name = options.watch ? 'isRootWatcher' : 'isRoot';
	orgIsRoot = lintignoreMode[name];
	lintignoreMode[name] = lint.readOptions.isRoot;
	promise = lint.init();
	lintignoreMode[name] = orgIsRoot;
	return promise;
};
lintDirectory.returnsPromise = true;

module.exports = exports = function (linter, dirname/*, options, cb*/) {
	var options, cb;

	callable(linter);
	dirname = resolve(String(dirname));
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

	return lintDirectory(linter, dirname, options).cb(cb);
};
exports.returnsPromise = true;
exports.lintDirectory = lintDirectory;
exports.LintDirectory = LintDirectory;
