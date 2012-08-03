'use strict';

var contains = require('es5-ext/lib/Array/prototype/contains')
  , forEach  = require('es5-ext/lib/Object/for-each')
  , isString = require('es5-ext/lib/String/is-string')

  , types = ['bool', 'list', 'number'];

module.exports = function (t, a) {
	forEach(t, function (value, name) {
		a(contains.call(types, value.type), true, name + " type");
		a(isString(value.description) && Boolean(value.description), true,
			name + " description");
	});
};
