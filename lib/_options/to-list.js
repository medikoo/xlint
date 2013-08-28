'use strict';

var compact = require('es5-ext/array/#/compact')
  , uniq    = require('es5-ext/array/#/uniq');

module.exports = function (value) {
	return uniq.call(compact.call(value.split(/\s*,\s*/))).sort();
};
