'use strict';

var push           = Array.prototype.push
  , commonLeft     = require('es5-ext/lib/Array/prototype/common-left')
  , getNull        = require('es5-ext/lib/Function/k')(null)
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
  , getConfMap     = require('next/lib/fs/_get-conf-file-map')
  , memoizeWatcher = require('next/lib/fs/_memoize-watcher')
  , ignoreModes    = require('next/lib/fs/_ignorefile-modes')
  , isIgnored      = require('next/lib/fs/is-ignored')
  , FindRoot       = require('next/lib/fs/find-root').FindRoot
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
  , ConfMap = getConfMap.Map
  , IsIgnored = isIgnored.IsIgnored, ignoresBuildMap = isIgnored.buildMap

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
			if (endsWith.call(name, '.js')) {
				return this.checkIsIgnored(name);
			} else if (reNoExt.test(name)) {
				return this.checkSheBang(name)(function (isNodeScript) {
					return isNodeScript ? this.checkIsIgnored(name) : null;
				});
			} else {
				return null;
			}
		}, this)).end(this.resolve.bind(this, this.result), this.resolve);
		return this.promise;
	},
	getFilename: function (name) {
		return this.root ? (this.root + sep + name) : name;
	},
	checkSheBang: function (name) {
		return open(this.getFilename(name), 'r')(function (fd) {
			var buffer = new Buffer(100);
			return read(fd, buffer, 0, 100, null)(function () {
				return resShebang.test(String(buffer)) ? true : false;
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
		}.bind(this), function () {
			if (this.ignores) {
				this.ignores[name].close();
				delete this.ignores[name];
			}
			delete this.linters[name];
		});
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
	var watch, lint, readRules, getOptionsMap, memo, localIsRoot
	  , ignoresMapGetters, globalRules, buildMap, rootIndex, root;

	watch = options.watch;

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
	lint.watch = watch;
	lint.cache = options.cache;
	if (options.ignoreRules) {
		lint.ignoreRules = isArray(options.ignoreRules) ?
			options.ignoreRules.concat('lint') :
			[String(options.ignoreRules), 'lint'];
	} else {
		lint.ignoreRules = ['lint'];
	}

	memo = watch ? memoizeWatcher : memoize;

	// Read options
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

	// Ignore rules
	ignoresMapGetters = [];
	globalRules = [];
	lint.ignoreRules.forEach(function (name) {
		var mode = ignoreModes[name], isRoot, readRules;
		if (!mode) {
			throw new Error("Unknown mode '" + name + "'");
		}
		readRules = memo(watch ? getConfMap.readRulesWatch : getConfMap.readRules);
		isRoot = (name === 'lint') ? localIsRoot :
			memo(watch ? mode.isRootWatch : mode.isRoot);
		ignoresMapGetters.push(function (path) {
			var map, finder;
			map = new ConfMap(path, watch);
			map.filename = mode.filename;
			map.readRules = readRules;
			map.parse = isIgnored.parseSrc;
			finder = new FindRoot(path, watch);
			finder.isRoot = isRoot;
			finder.next();
			return map.init(finder.promise);
		});
		if (mode.globalRules) {
			push.apply(globalRules, mode.globalRules);
		}
	});
	if (!globalRules.length) {
		globalRules = null;
	}
	buildMap = memo(function (dirname) {
		return ignoresBuildMap(dirname, ignoresMapGetters, watch);
	});
	lint.isIgnored = function (path) {
		var isIgnored;
		isIgnored = new IsIgnored(path, watch);
		return isIgnored.init(buildMap(isIgnored.dirname));
	};

	return lint.init();
};
lintFiles.returnsPromise = true;

module.exports = exports = function (files/*, options, cb*/) {
	var options, cb;

	files = files.map(function (file) { return resolve(String(file)) });
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
