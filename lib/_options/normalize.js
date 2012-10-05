'use strict';

var isObject = require('es5-ext/lib/Object/is-object')
  , forEach  = require('es5-ext/lib/Object/for-each')
  , toPlain  = require('es5-ext/lib/Object/to-plain-object')

  , isArray = Array.isArray;

module.exports = function (options) {
	options = toPlain(options);
	forEach(options, function (value, name) {
		if (isArray(value)) {
			options[name] = value.map(String);
			return;
		}
		if ((value == null) || isObject(value)) {
			delete options[name];
		}
	});
	return options;
};
