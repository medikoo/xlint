'use strict';

var reduce   = Array.prototype.reduce;

module.exports = function (linter, src, options) {
	return linter(src, options) ? [] : linter.errors.map(function (raw) {
		var error = {}, message;
		error.line = raw.line;
		error.character = raw.character;
		error.message = reduce.call('abcd', function (msg, token) {
			return (raw[token] != null) ?
				msg.replace('{' + token + '}', raw[token]) : msg;
		}, raw.raw);
		return error;
	});
};
