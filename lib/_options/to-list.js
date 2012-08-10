'use strict';

var compact = require('es5-ext/lib/Array/prototype/compact')
  , uniq    = require('es5-ext/lib/Array/prototype/uniq');

module.exports = function (value) {
	return uniq.call(compact.call(value.split(/\s*,\s*/))).sort();
};
