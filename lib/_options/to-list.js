'use strict';

var uniq = require('es5-ext/array/#/uniq');

module.exports = function (value) {
	return uniq.call(value.split(/\s*,\s*/).filter(Boolean)).sort();
};
