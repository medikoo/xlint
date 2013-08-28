'use strict';

var contains = require('es5-ext/array/#/contains')

, map;

map = {
	'\nvar a = 1 & 3;\nfoo = {};\nzoom = {};\nfooelse = {};\n':
		function (options) {
			var report = [], predef = options.predef || [];
			if (!options.bitwise) {
				report.push({ line: 2, character: 11, message: 'Unexpected \'&\'.' });
			}
			if (!contains.call(predef, 'foo')) {
				report.push({ line: 3, character: 1,
					message: '\'foo\' was used before it was defined.' });
			}
			if (!contains.call(predef, 'zoom')) {
				report.push({ line: 4, character: 1,
					message: '\'zoom\' was used before it was defined.' });
			}
			if (!contains.call(predef, 'fooelse')) {
				report.push({ line: 5, character: 1,
					message: '\'fooelse\' was used before it was defined.' });
			}
			return report;
		},
	'\nvar a = 1 & 3;\nfoo = {};\nfooelse = {};\n': function (options) {
		var report = [], predef = options.predef || [];
		if (!options.bitwise) {
			report.push({ line: 2, character: 11, message: 'Unexpected \'&\'.' });
		}
		if (!contains.call(predef, 'foo')) {
			report.push({ line: 3, character: 1,
				message: '\'foo\' was used before it was defined.' });
		}
		if (!contains.call(predef, 'fooelse')) {
			report.push({ line: 4, character: 1,
				message: '\'fooelse\' was used before it was defined.' });
		}
		return report;
	},
	'\nvar a = 1 & 3;\nmarko = {};\nzoom = {};\n': function (options) {
		var report = [], predef = options.predef || [];
		if (!options.bitwise) {
			report.push({ line: 2, character: 11, message: 'Unexpected \'&\'.' });
		}
		if (!contains.call(predef, 'marko')) {
			report.push({ line: 3, character: 1,
				message: '\'marko\' was used before it was defined.' });
		}
		if (!contains.call(predef, 'zoom')) {
			report.push({ line: 4, character: 1,
				message: '\'zoom\' was used before it was defined.' });
		}
		return report;
	}
};

module.exports = exports = function (src, options) {
	if (!map[src]) {
		console.log("NO MAP!", JSON.stringify(src));
		return [];
	}
	return map[src](options);
};
exports.xlintId = 'XLINT_TEST';
