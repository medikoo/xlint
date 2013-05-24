'use strict';

var remove     = require('es5-ext/lib/Array/prototype/remove')
  , uniq       = require('es5-ext/lib/Array/prototype/uniq')
  , isBoolean  = require('es5-ext/lib/Boolean/is-boolean')
  , extend     = require('es5-ext/lib/Object/extend')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , contains   = require('es5-ext/lib/String/prototype/contains')
  , startsWith = require('es5-ext/lib/String/prototype/starts-with')
  , resolve    = require('path').resolve
  , toList     = require('./to-list')

  , isArray = Array.isArray, push = Array.prototype.push
  , call = Function.prototype.call, trim = call.bind(String.prototype.trim)

  , nameRe = /^(!?)([a-z][a-z0-9:._]*)([+\-]?)(?:\s+|$)/
  , newFileStartRe = /^\.[\\\/]/;

module.exports = function (data, path) {
	var opts = {}, preset, ignore, lastPathLine, result, workingPath;

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
			if (lastPathLine) workingPath += ':' + nuPath;
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

		if (!opts[workingPath]) opts[workingPath] = {};

		if (match[3]) {
			value = toList(value);
			if (opts[workingPath].hasOwnProperty(name) &&
					isBoolean(opts[workingPath][name])) {
				delete opts[workingPath][name];
			}
			preset = opts[workingPath][name];
			if (match[3] === '+') {
				if (preset) {
					if (preset.hasOwnProperty('mod')) {
						preset.push({ action: 'add', value: value });
					} else {
						if (!isArray(preset)) opts[workingPath][name] = toList(preset);
						push.apply(preset, value);
						uniq.call(preset).sort();
					}
				} else {
					preset = opts[workingPath][name] = [{ action: 'add', value: value }];
					preset.mod = true;
				}
			} else if (preset) {
				if (preset.hasOwnProperty('mod')) {
					preset.push({ action: 'remove', value: value });
				} else {
					remove.apply(preset, value);
				}
			} else {
				preset = opts[workingPath][name] = [{ action: 'remove', value: value }];
				preset.mod = true;
			}
			return;
		}
		if (contains.call(value, ',')) value = toList(value);
		opts[workingPath][name] = value;
	});

	result = {};
	forEach(opts, function (value,  name) {
		var index = name.indexOf(':');
		if (index === -1) {
			if (result.hasOwnProperty(name)) extend(result[name], value);
			else result[name] = value;
			return;
		}
		name.split(':').forEach(function (name) {
			if (result.hasOwnProperty(name)) extend(result[name], value);
			else result[name] = value;
		});
	});
	return result;
};
