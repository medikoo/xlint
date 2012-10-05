'use strict';

var d              = require('es5-ext/lib/Object/descriptor')
  , isCallable     = require('es5-ext/lib/Object/is-callable')
  , callable       = require('es5-ext/lib/Object/valid-callable')
  , endsWith       = require('es5-ext/lib/String/prototype/ends-with')
  , deferred       = require('deferred')
  , resolve        = require('path').resolve
  , readdir        = require('fs2/lib/readdir')
  , getOptsReader  = require('./_options/read').getReader
  , normalizeOpts  = require('./_options/normalize')
  , lintignoreMode = require('./_lintignore-mode')
  , LintFiles      = require('./lint-files').LintFiles

  , isArray = Array.isArray, push = Array.prototype.push

  , reExtension = new RegExp('(?:^|[\\/\\\\])(?:' +
		'[\0-\\-0-\\[\\]-\uffff]+|' +
		'[\0-\\.0-\\[\\]-\uffff]*\\.js)$')

  , lintDirectory, LintDirectory;

LintDirectory = function () { LintFiles.call(this); };
LintDirectory.prototype = Object.create(LintFiles.prototype, {
	init: d(function () {
		var waiting;
		this.reader = readdir(this.root, { watch: this.watch, depth: this.depth,
			stream: this.stream, ignoreRules: this.ignoreRules, type: { file: true },
			pattern: reExtension });
		if (this.watch || this.stream) {
			if (this.stream) {
				waiting = [];
			}
			this.reader.on('change', function (data) {
				if (this.promise.resolved) {
					deferred.map(data.added, this.prelint, this).end();
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
			(this.stream ? deferred.map(waiting) :
					deferred.map(names, this.prelint, this))
				.end(this.resolve.bind(this, this.result), this.resolve);
		}.bind(this), this.resolve);
		this.promise.root = this.root;
		return this.promise;
	}),
	prelint: d(function (name) {
		if (endsWith.call(name, '.js')) return this.lint(name);
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
