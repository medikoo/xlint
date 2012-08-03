'use strict';

var push       = Array.prototype.push
  , call       = Function.prototype.call
  , trim       = call.bind(String.prototype.trim)
  , compact    = require('es5-ext/lib/Array/prototype/compact')
  , remove     = require('es5-ext/lib/Array/prototype/remove')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , resolve    = require('path').resolve
  , schema     = require('./schema')

  , nameRe = /^(!?)([a-z0-9]+)([+-]?)(?:\s+|$)/;

module.exports = function (data, path) {
	var opts = {}, current, preset;

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
		var name, value, npath, match;

		if (startsWith.call(line, './')) {
			current = resolve(path, line);
			return;
		}

		match = line.match(nameRe);
		if (!match) {
			console.error("Unrecognized option: '" + line + "' in " +
				resolve(path, '.lint') + " (rule ignored)");
			return;
		}

		name = match[2];
		value = line.slice(match[0].length).trim();

		if (!schema[name]) {
			console.error("Unrecognized option name: '" + name + "' in " +
				resolve(path, '.lint') + " (rule ignored)");
			return;
		}

		switch (schema[name].type) {
			case 'bool':
			value = true;
			break;
			case 'number':
			value = Number(value);
			break;
			case 'list':
			value = compact.call(value.split(/\s*,\s*/)).sort();
		}

		if (match[1]) {
			if (schema[name].type !== 'bool') {
				console.error("Negation of not boolean option: '" + name + "' in " +
					resolve(path, '.lint') + " (rule ignored)");
				return;
			}
			value = false;
		}

		if (match[3]) {
			if (schema[name].type !== 'list') {
				console.error("+/- instruction for non list option: '" + name +
					"' in " + resolve(path, '.lint') + " (rule ignored)");
				return;
			}
			if (!opts[current]) {
				opts[current] = {};
			}
			preset = opts[current][name];
			if (match[3] === '+') {
				if (preset) {
					if (preset.hasOwnProperty('mod')) {
						preset.push({ action: 'add', value: value.sort() });
					} else {
						push.apply(preset, value);
						preset.sort();
					}
				} else {
					preset = opts[current][name] =
						[{ action: 'add', value: value.sort() }];
					preset.mod = true;
				}
			} else if (preset) {
				if (preset.hasOwnProperty('mod')) {
					preset.push({ action: 'remove', value: value.sort() });
				} else {
					remove.apply(preset, value);
					preset.sort();
				}
			} else {
				preset = opts[current][name] =
					[{ action: 'remove', value: value.sort() }];
				preset.mod = true;
			}
			return;
		}
		if (!opts[current]) {
			opts[current] = {};
		}
		opts[current][name] = value;
	});

	return opts;
};
