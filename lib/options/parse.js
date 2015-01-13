'use strict';

var aFrom         = require('es5-ext/array/from')
  , remove        = require('es5-ext/array/#/remove')
  , isBoolean     = require('es5-ext/boolean/is-boolean')
  , copy          = require('es5-ext/object/copy')
  , forEach       = require('es5-ext/object/for-each')
  , contains      = require('es5-ext/string/#/contains')
  , hyphenToCamel = require('es5-ext/string/#/hyphen-to-camel')
  , startsWith    = require('es5-ext/string/#/starts-with')
  , resolve       = require('path').resolve
  , toList        = require('./to-list')

  , isArray = Array.isArray, push = Array.prototype.push
  , call = Function.prototype.call, trim = call.bind(String.prototype.trim)

  , nameRe = /^(!?)([a-z](?:-?[a-z0-9:._]+)*)([+\-]?)(?:\s+|$)/
  , newFileStartRe = /^\.[\\\/]/
  , addPath, extendOption;

addPath = function (conf, path, opts) {
	if (!conf.hasOwnProperty(path)) {
		conf[path] = copy(opts);
		return;
	}
	forEach(opts, function (value, name) {
		extendOption(conf[path], name, value);
	});
};

extendOption = function (conf, name, value) {
	if (!conf.hasOwnProperty(name) || !value.mod || !isArray(conf[name])) {
		conf[name] = value;
		return;
	}
	if (conf[name].mod) {
		conf[name] = conf[name].concat(value);
		conf[name].mod = true;
		return;
	}
	conf[name] = aFrom(conf[name]);
	value.forEach(function (data) {
		if (data.action === 'add') push.apply(this, data.value);
		else remove.apply(this, data.value);
	}, conf[name]);
};

module.exports = function (data, path) {
	var opts = {}, ignore, lastPathLine, workingPath, currentPath, optsList = []
	  , currentOpts;

	data = String(data);
	if (!data) return opts;

	data = data.trim().split('\n').map(trim).map(function (line) {
		return line.replace(/#[\0-\uffff]*$/, '').trim();
	});

	while (!data[0]) data.shift();

	if (data[0] === '@root') {
		opts.root = true;
		data.shift();
	}

	workingPath = path;
	data.forEach(function (line) {
		var name, value, match, nuPath;

		if (newFileStartRe.test(line)) {
			nuPath = resolve(path, line);
			if (!startsWith.call(nuPath, path)) {
				console.error("Cannot set options for outer path: '" + line + "' in " +
					resolve(path, '.lint') + " (section ignored)");
				ignore = true;
			} else {
				ignore = false;
			}
			if (lastPathLine) workingPath += '\x08' + nuPath;
			else workingPath = nuPath;
			lastPathLine = true;
			return;
		}

		lastPathLine = false;
		if (!line || ignore) return;

		match = line.match(nameRe);
		if (!match) {
			console.error("Unrecognized option: '" + line + "' in " +
				resolve(path, '.lint') + " (rule ignored)");
			return;
		}

		name = match[2];
		value = line.slice(match[0].length).trim() || true;

		if (match[1]) {
			if (value !== true) {
				console.error("Negation of not boolean option: '" + name + "' in " +
					resolve(path, '.lint') + " (rule ignored)");
				return;
			}
			value = false;
		}

		if (match[3] && isBoolean(value)) {
			console.error("+/- instruction for non list option: '" + name +
				"' in " + resolve(path, '.lint') + " (rule ignored)");
			return;
		}

		if (workingPath !== currentPath) {
			optsList.push({ path: workingPath, opts: currentOpts = {} });
			currentPath = workingPath;
		}

		if (match[3]) {
			value = toList(value);
			value = [{ action: (match[3] === '+') ? 'add' : 'remove', value: value }];
			value.mod = true;
		} else if (contains.call(value, ',')) {
			value = toList(value);
		}
		extendOption(currentOpts, hyphenToCamel.call(name), value);
	});

	optsList.forEach(function (data) {
		var index = data.path.indexOf('\x08');
		if (index === -1) {
			addPath(opts, data.path, data.opts);
			return;
		}
		data.path.split('\x08').forEach(function (path) {
			addPath(opts, path, data.opts);
		});
	});

	return opts;
};
