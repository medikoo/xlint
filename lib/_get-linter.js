'use strict';

var compact    = require('es5-ext/lib/Array/prototype/compact')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , copy       = require('es5-ext/lib/Object/copy')
  , readFile   = require('fs').readFileSync
  , resolve    = require('path').resolve
  , vm         = require('vm')

  , reduce = Array.prototype.reduce, keys = Object.keys

  , getNoModule;

getNoModule = function (path) {
	var ctx = vm.createContext({}), name, linter, result, jshint;
	vm.runInContext(readFile(path), ctx, path);
	name = keys(ctx)[0];
	if ((name === 'JSLINT') || (name === 'JSHINT')) {
		linter = ctx[name];
		jshint = (name === 'JSHINT');
		console.log("JSHINT", jshint, name);
		result = function (src, options) {
			var globals;
			if (jshint && (options.global || options.predef)) {
				options = copy(options);
				if (options.global) {
					globals = options.global;
					delete options.global;
				} else {
					globals = options.predef;
					delete options.predef;
				}
				globals = globals.reduce(function (obj, name) {
					obj[name] = true;
					return obj;
				}, {});
			}
			return linter(src, options, globals) ? [] : compact.call(
				linter.errors.map(function (raw) {
					var error, message;
					if (raw == null) {
						return null;
					}
					if (!raw.raw && raw.reason) {
						error = { line: 0, character: 0, message: raw.reason };
					} else {
						error = { line: raw.line, character: raw.character };
						error.message = reduce.call('abcd', function (msg, token) {
							return (raw[token] != null) ?
								msg.replace('{' + token + '}', raw[token]) : msg;
						}, raw.raw);
					}
					return error;
				}
			));
		};
		result.xlintId = name;
		return result;
	}
};

module.exports = function (path) {
	var linter;

	path = resolve(path);
	linter = require(path);
	if (isCallable(linter)) {
		// Valid NodeJS module
		return linter;
	}

	// Try to load not NodeJS module (e.g. JSLint in it's plain version)
	linter = getNoModule(path);
	if (isCallable(linter)) {
		return linter;
	}

	throw new Error("Could not load linter. Linter is neither valid Node.js "
		+ "module or recognized JSLINT-like script");
};
