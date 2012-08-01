// Lint given code with following options

'use strict';

module.exports = function (code, options) {
	var linter;

	code = String(code);
	options = Object(options);

	if (options.jshint) {
		linter = require('./linters/jshint');
	} else {
		linter = require('./linters/jslint');
	}

	return linter(code, options);
};
