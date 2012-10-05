'use strict';

var compact    = require('es5-ext/lib/Array/prototype/compact')
  , remove     = require('es5-ext/lib/Array/prototype/remove')
  , uniq       = require('es5-ext/lib/Array/prototype/uniq')
  , isBoolean  = require('es5-ext/lib/Boolean/is-boolean')
  , contains   = require('es5-ext/lib/String/prototype/contains')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , resolve    = require('path').resolve
  , toList     = require('./to-list')

  , isArray = Array.isArray, push = Array.prototype.push
  , call = Function.prototype.call, trim = call.bind(String.prototype.trim)

  , nameRe = /^(!?)([a-z][a-z0-9:._]*)([+\-]?)(?:\s+|$)/
  , newFileStartRe = /^\.[\\\/]/;

module.exports = function (data, path) {
	var opts = {}, current, preset, ignore;

	data = String(data);
	if (!data) {
		return opts;
	}

	data = compact.call(data.trim().split('\n').map(trim)
		.map(function (line) {
			return line.replace(/#[\0-\uffff]*$/, '').trim();
		}));

	if (data[0] === '@root') {
		opts.root = true;
		data.shift();
	}

	current = path;
	data.forEach(function (line) {
		var name, value, match;

		if (newFileStartRe.test(line)) {
			current = resolve(path, line);
			if (!startsWith.call(current, path)) {
				console.error("Cannot set options for outer path: '" + line + "' in " +
					resolve(path, '.lint') + " (section ignored)");
				ignore = true;
			} else {
				ignore = false;
			}
			return;
		}

		if (ignore) {
			return;
		}

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

		if (match[3]) {
			if (isBoolean(value)) {
				console.error("+/- instruction for non list option: '" + name +
					"' in " + resolve(path, '.lint') + " (rule ignored)");
				return;
			}
			value = toList(value);
			if (!opts[current]) {
				opts[current] = {};
			} else if (opts[current].hasOwnProperty(name) &&
					isBoolean(opts[current][name])) {
				delete opts[current][name];
			}
			preset = opts[current][name];
			if (match[3] === '+') {
				if (preset) {
					if (preset.hasOwnProperty('mod')) {
						preset.push({ action: 'add', value: value });
					} else {
						if (!isArray(preset)) {
							opts[current][name] = toList(preset);
						}
						push.apply(preset, value);
						uniq.call(preset).sort();
					}
				} else {
					preset = opts[current][name] = [{ action: 'add', value: value }];
					preset.mod = true;
				}
			} else if (preset) {
				if (preset.hasOwnProperty('mod')) {
					preset.push({ action: 'remove', value: value });
				} else {
					remove.apply(preset, value);
				}
			} else {
				preset = opts[current][name] = [{ action: 'remove', value: value }];
				preset.mod = true;
			}
			return;
		}
		if (contains.call(value, ',')) {
			value = toList(value);
		}
		if (!opts[current]) {
			opts[current] = {};
		}
		opts[current][name] = value;
	});

	return opts;
};
