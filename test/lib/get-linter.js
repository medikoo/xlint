'use strict';

var resolve = require('path').resolve;

module.exports = function (t, a) {
	var report = t(resolve(__dirname, '../__linter-no-module.js'))('whatever', {});
	a.deep(report[0], { line: 5, character: 20, message: 'foo what bar next' },
		"#1");
	a.deep(report[1], { line: 5, character: 61, message: 'Missing semicolon.' },
		"#2");
};
