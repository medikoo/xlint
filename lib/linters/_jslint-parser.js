'use strict';

var compact = require('es5-ext/lib/Array/prototype/compact')

  , reduce  = Array.prototype.reduce;

module.exports = function (linter, src, options) {
	return linter(src, options) ? [] : compact.call(linter.errors.map(
		function (raw) {
			var error, message;
			if (raw == null) {
				return null;
			}
			error = { line: raw.line, character: raw.character };
			error.message = reduce.call('abcd', function (msg, token) {
				return (raw[token] != null) ?
					msg.replace('{' + token + '}', raw[token]) : msg;
			}, raw.raw);
			return error;
		}
	));
};
