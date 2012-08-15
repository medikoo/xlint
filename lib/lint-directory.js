'use strict';

var push           = Array.prototype.push
  , d              = require('es5-ext/lib/Object/descriptor')
  , isCallable     = require('es5-ext/lib/Object/is-callable')
  , endsWith       = require('es5-ext/lib/String/prototype/ends-with')
  , memoize        = require('memoizee')
  , deferred       = require('deferred')
  , path           = require('path')
  , getConfMap     = require('next/lib/fs/_get-conf-file-map')
  , memoizeWatcher = require('next/lib/fs/_memoize-watcher')
  , FindRoot       = require('next/lib/fs/find-root').FindRoot
  , readdir        = require('next/lib/fs/readdir')
  , readFile       = require('next/lib/fs/read-file')
  , isRoot         = require('./_options/get-map').isRoot
  , parse          = require('./_options/parse')
  , optsReader     = require('./_options/read').reader
  , normalizeOpts  = require('./_options/normalize')
  , lintignoreMode = require('./_lintignore-mode')
  , LintFiles       = require('./lint-files').LintFiles

  , dirname = path.dirname, resolve = path.resolve
  , ConfMap = getConfMap.Map
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
	var watch, lint, readRules, getOptionsMap, memo, localIsRoot
	  , orgIsRoot, name, promise;

	watch = options.watch;

	lint = new LintDirectory();
	lint.root = path;
	lint.options = options.options
	lint.watch = watch;
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

	memo = watch ? memoizeWatcher : memoize;
	readRules = memo(watch ? getConfMap.readRulesWatch : getConfMap.readRules);
	localIsRoot = memo(isRoot.bind({
		readRules: readRules, watch: watch, filename: '.lint', parse: parse,
		readFile: function (path) {
			return readFile(path, { loose: true, watch: watch });
		}
	}));
	getOptionsMap = memo(function (dirname) {
		var map, finder;
		map = new ConfMap(dirname, watch);
		map.filename = '.lint';
		map.readRules = readRules;
		map.parse = parse;
		finder = new FindRoot(dirname, watch);
		finder.isRoot = localIsRoot;
		finder.next();
		return map.init(finder.promise);
	});

	lint.readOptions = function () {
		return optsReader(this.filename,
			getOptionsMap(dirname(this.filename)), watch);
	};

	name = watch ? 'isRoot' : 'isRootWatch';
	orgIsRoot = lintignoreMode[name];
	lintignoreMode[name] = localIsRoot;
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
