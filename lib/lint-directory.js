'use strict';

var push           = Array.prototype.push
  , invoke         = require('es5-ext/lib/Function/invoke')
  , extend         = require('es5-ext/lib/Object/extend')
  , forEach        = require('es5-ext/lib/Object/for-each')
  , isCallable     = require('es5-ext/lib/Object/is-callable')
  , endsWith       = require('es5-ext/lib/String/prototype/ends-with')
  , memoize        = require('memoizee')
  , deferred       = require('deferred')
  , promisify      = deferred.promisify
  , fs             = require('fs')
  , path           = require('path')
  , getMap         = require('next/lib/fs/_get-conf-file-map')
  , memoizeWatcher = require('next/lib/fs/_memoize-watcher')
  , FindRoot       = require('next/lib/fs/find-root').FindRoot
  , readdir        = require('next/lib/fs/readdir')
  , readFile       = require('next/lib/fs/read-file')
  , sep            = require('next/lib/path/sep')
  , isRoot         = require('./_options/get-map').isRoot
  , parse          = require('./_options/parse')
  , optsReader     = require('./_options/read').reader
  , normalizeOpts  = require('./_options/normalize')
  , lintignoreMode = require('./_lintignore-mode')
  , LintFile       = require('./lint-file').LintFile

  , open = promisify(fs.open), read = promisify(fs.read)
  , dirname = path.dirname, resolve = path.resolve
  , Map = getMap.Map

  , reExtension = /^(?:[\u0000-\u002d\u002f-\uffff]+|[\u0000-\uffff]+\.js)$/
  , reShebang = /^#![\u0021-\uffff]+(?:\/node|\/env node)\s/

  , lintDirectory, LintDirectory;

LintDirectory = function () {
	this.result = {};
	this.linters = {};
	extend(this, deferred());
	this.promise.close = this.close.bind(this);
};
LintDirectory.prototype = {
	init: function () {
		var waiting;
		this.reader = readdir(this.dirname, {
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
	},
	prelint: function (name) {
		if (endsWith.call(name, '.js')) return this.lint(name);
		return open(this.dirname + sep + name, 'r')(function (fd) {
			var buffer = new Buffer(100);
			return read(fd, buffer, 0, 100, null)(function () {
				return resShebang.test(String(buffer)) ? this.lint(name) : null;
			}.bind(this));
		}.bind(this));
	},
	lint: function (name) {
		var lint;
		lint = new LintFile();
		lint.filename = this.dirname + sep + name;
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
				delete this.result[name];
				delete this.linters[name];
				if (this.promise.resolved || this.progress) {
					this.promise.emit('change',
						{ type: 'remove', name: name });
				}
			});
		}
		return lint(function (report) {
			this.result[name] = report;
			if (this.promise.resolved || this.progress) {
				this.promise.emit('change',
					{ type: 'add', name: name, report: report });
			}
		}.bind(this), function () {
			delete this.linters[name];
		});
	},
	close: function () {
		if (this.linters) {
			this.reader.close();
			forEach(this.linters, invoke('close'));
			delete this.linters;
		}
	}
};

lintDirectory = function (path, options) {
	var watch, lint, readRules, getOptionsMap, memo, localIsRoot
	  , orgIsRoot, name, promise;

	watch = options.watch;

	lint = new LintDirectory();
	lint.dirname = path;
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
	readRules = memo(watch ? getMap.readRulesWatch : getMap.readRules);
	localIsRoot = memo(isRoot.bind({
		readRules: readRules, watch: watch, filename: '.lint', parse: parse,
		readFile: function (path) {
			return readFile(path, { loose: true, watch: watch });
		}
	}));
	getOptionsMap = memo(function (dirname) {
		var map, finder;
		map = new Map(dirname, watch);
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
